let app = require('express')();
var fs = require('fs');


const options = {
  cors: true,
  origin: '*',
  allowEIO3: true, // tweaking it may help
};


// const options = {
//     cors: {
//       origin: '*',
//     },
//   };
let server = require('http').createServer(app);
let io = require('socket.io')(server, options);
//
let itemConductor = {
  idconductor : 0,
};

let usuarioseteado = "";
let ARR_CONDUCTORES_ACTIVOS = []; //aqui se guardaran los conductores activos con sus respectivos ids
let ARR_PASAJEROS_ACTIVOS = []; //aqui se guardaran los pasajeros activos con sus respectivos ids
//

let DATA_CONDUCTORES_EN_SERVICIO = []; //aqui están los conductores en servicio
let  RADIO_COBERTURA_METROS = 1000;

io.on('connection', (socket) => {
  //
  var socketID = socket.id;
  let codigousuario =  0;
  let tipousuario = socket.handshake.query.tipousuario;
  var fechahora =  new Date();

  let itemconductor = {
    codconductor : 0,
    idconnection : '',
    horafechaconnected: fechahora.toLocaleString(),
    ultipoposteolatlng : {
      latitudultimo : 0,
      longitudultimo : 0
    }
  };

  let itempasajero = {
    codpasajero : 0,
    idconnection : '',
    horafechaconnected: fechahora.toLocaleString()
  };

  io.to(socketID).emit('responseconnectionstatus', "OK" ); //enviando el idSOCKET al cliente que ingresó


  console.log("<------------- ["+ tipousuario +"] se conectó "+ fechahora +" ] ---------------------->");

  
  if(tipousuario == 'conductor'){ //si el usuario que se conecta es conductor
    codigousuario = socket.handshake.query.codconductor;
    itemconductor.codconductor = codigousuario;
    itemconductor.idconnection = socketID;
    setSessionConductor(itemconductor);
  }

  if(tipousuario == 'pasajero'){ //si el usuario que se conecta es pasajero
    codigousuario = socket.handshake.query.codpasajero;
    itempasajero.codpasajero = Number(codigousuario);
    itempasajero.idconnection = socketID;
    setSessionPasajero(itempasajero);

  }

  console.log("[codigo del usuario]", codigousuario);
  console.log("[ID connection SOCKET", socketID);
  //console.log("[conductores activos]");
  //console.log(getSessionConductores());
  //console.log("socketID", socketID, 'id->', id);
  //
  // console.log("room--->", nameRoom);
  //io.to(socketID).emit('sendsocketid', { socketidclient :  socketID}); //enviando el idSOCKET al cliente que ingresó

  socket.on('disconnect', function(){
    var idconnection = socket.id;
    var removioitem =  null;// removeitemSessionConductor(idconnection)
    var tipousuario = socket.handshake.query.tipousuario;
    var codusuarioactivo = 0; 
    var fechahora =  new Date();

    console.log("<---------[" + tipousuario + "] se desconectó "+ fechahora.toLocaleString() +" --------------->");

    if(tipousuario == 'pasajero'){ //si el usuario pasajero de desconectó
      removioitem =  removeitemSessionPasajero(idconnection)
    }

    if(tipousuario == 'conductor'){ //si el usuario conductor de desconectó
      removioitem =  removeitemSessionConductor(idconnection);
      codusuarioactivo = socket.handshake.query.codconductor;

      if(verificaEnConductoresConectadosByCond(codusuarioactivo).encontro){//verifica si el conductor está en servicio
        // console.log("si está en servicio");
        DATA_CONDUCTORES_EN_SERVICIO = removerConductorEnservicio(codusuarioactivo);

        //ENVIANDO EL MENSAJE A LOS PASAJEROS CONECTADOS QUE EL IDCONDUCTOR SE HA IDO

        for(let i = 0;i<ARR_PASAJEROS_ACTIVOS.length; i++){
          var idconnectsocket = ARR_PASAJEROS_ACTIVOS[i].idconnection;
          io.to(idconnectsocket).emit('conductorsedesconecto', {idconductor : codusuarioactivo} ); //enviando el idSOCKET al cliente que ingresó
        }

      }
      // console.log("<--en servicio->", DATA_CONDUCTORES_EN_SERVICIO);
    }
    //
    console.log("[idconnectionwebsocket]", idconnection); 
    console.log("[removio item]", removioitem);
    console.log("[cond activos]", ARR_CONDUCTORES_ACTIVOS);
  });

  socket.on('solicitaviaje', (objetoPasajero) => { //aqui el pasajero solicita un viaje a los conductores

    console.log("[pasajero solicita viaje]");
    var pasajero = JSON.parse(objetoPasajero);
    var latitudPuntoOrigen = pasajero.puntoinicial.lat;
    var longitudPuntoOrigen = pasajero.puntoinicial.lng;

    var taxisEnCobertura = [];
    console.log(DATA_CONDUCTORES_EN_SERVICIO)
    for(let i = 0;i<DATA_CONDUCTORES_EN_SERVICIO.length; i++){
      console.log("en el for");
      console.log("POS->",i,'DATA->',DATA_CONDUCTORES_EN_SERVICIO[i]);
      var ultipoPosteoLatitud = DATA_CONDUCTORES_EN_SERVICIO[i].ultipoposteolatlng.latitudultimo;
      var ultipoPosteoLongitud = DATA_CONDUCTORES_EN_SERVICIO[i].ultipoposteolatlng.longitudultimo;
      
      //
      var distanciaSolicitadoTaxi = obtenerDistancia(latitudPuntoOrigen,longitudPuntoOrigen, ultipoPosteoLatitud, ultipoPosteoLongitud);
      if(distanciaSolicitadoTaxi <= RADIO_COBERTURA_METROS){ // esta dentro de cobertura
        taxisEnCobertura.push(DATA_CONDUCTORES_EN_SERVICIO[i]["idconductor"]);
      }
      // console.log("distancia");
      // console.log(distanciaSolicitadoTaxi);
    }

  
    for(let i = 0;i<ARR_CONDUCTORES_ACTIVOS.length; i++){
      var idconductorActivo = Number(ARR_CONDUCTORES_ACTIVOS[i]['codconductor']);
      var socketIdConductor = ARR_CONDUCTORES_ACTIVOS[i]['idconnection'];
      //
      for(let j = 0;j<taxisEnCobertura.length; j++){
        var codconductorEnCobertura = taxisEnCobertura[j];

        if(idconductorActivo == codconductorEnCobertura){
          io.to(socketIdConductor).emit('pasajerosolicitaviaje', {
            pasajero, createdAt: new Date()
          });

        }
      }
    }


    // io.emit('pasajerosolicitaviaje', {
    //   pasajero, createdAt: new Date()
    // });  
  });

  socket.on('conductorfinalizaservicio', (dataConductor) => { //aqui el pasajero solicita un viaje a los conductores
    
  });

  socket.on('conductoriniciaservicio', (dataConductor) => { //aqui el pasajero solicita un viaje a los conductores
    console.log("<<<<---conductoriniciaservicio>>>")

    var idconductor = dataConductor.idconductor;
    var placaserv =  dataConductor.placa;
    var codigopee = socket.handshake.query.codconductor;

    var rptaconductor = {
      conecto : false,
      desresultado : ""
    }

    if(!verificaEnConductoresConectados(placaserv).encontro){ //si no está conectado
      rptaconductor.conecto = true;
      rptaconductor.desresultado = "Todo OK" + " placa [" + placaserv + "]";
      var itemConductor = dataConductor;
      //
      DATA_CONDUCTORES_EN_SERVICIO.push(itemConductor);
    }else{
      rptaconductor.conecto = false;
      rptaconductor.desresultado = "La placa " + placaserv + " se encuentra en servicio";
    }
    console.log("rptaconductor->",rptaconductor);

    io.to(socket.id).emit('verificaestadoplaca', rptaconductor ); //enviando el idSOCKET al cliente que ingresó

    // console.log("[pasajero solicita viaje]");
    // var pasajero = JSON.parse(objetoPasajero);
    // io.emit('pasajerosolicitaviaje', {
    //   pasajero, createdAt: new Date()
    // });
  });

  function verificaEnConductoresConectados(placaserv){
    let encontroconductor = {
      encontro : false
    }

    for(let i = 0;i<DATA_CONDUCTORES_EN_SERVICIO.length; i++){
      console.log("<-placaserv->",placaserv,DATA_CONDUCTORES_EN_SERVICIO );

      if(placaserv.toUpperCase()  == DATA_CONDUCTORES_EN_SERVICIO[i]["placa"].toUpperCase()  ){
        encontroconductor.encontro = true;
      }
    }
    return encontroconductor;
  }

  function verificaEnConductoresConectadosByCond(idconductor){
    let encontroconductor = {
      encontro : false
    }
    for(let i = 0;i<DATA_CONDUCTORES_EN_SERVICIO.length; i++){
      if(Number(idconductor)  == Number(DATA_CONDUCTORES_EN_SERVICIO[i]["idconductor"])  ){
        encontroconductor.encontro = true;
      }
    }

    return encontroconductor;
  }

  function getConductoresEnServicio(){
    return DATA_CONDUCTORES_EN_SERVICIO;
  }

  function removerConductorEnservicio(idconductor){
    var nwLista = [];
    nwLista = DATA_CONDUCTORES_EN_SERVICIO.filter(x => {
        return x.idconductor != idconductor;
    })
    
    return nwLista;
  }

  socket.on('listarclientesconectados', (obj) => { //aqui el pasajero solicita un viaje a los conductores
    var conductoresactivos = getConductoresEnServicio();
    console.log("<------------CONDUCTORES EN SERVICIO ----------->");
    console.log(conductoresactivos);
    //io.emit('pasajerosolicitaviaje', {pasajero, createdAt: new Date()});  
  });

  socket.on('pingconductor', (obj) => { //aqui el pasajero solicita un viaje a los conductores

    console.log("<----ping--->");
    console.log(obj);

    io.emit('conductoremitiosenial', {
      obj, createdAt: new Date()
    });

  });

  socket.on('enviapropuesta', (objetoPropuesta) => { //aqui el conductor envia propuesta al pasajero
    //console.log("solicitó viajee", objetoPasajero);
    
    console.log("<--------ENVIO PROPUESTA ------------->");
    var propuesta = JSON.parse(objetoPropuesta);
    var idusuarioPasajero = propuesta["idusuariopasajero"];
    
    if(idusuarioPasajero){

      for(let i = 0;i<ARR_PASAJEROS_ACTIVOS.length; i++){
        var idconnectsocket = ARR_PASAJEROS_ACTIVOS[i].idconnection;
        if( Number(ARR_PASAJEROS_ACTIVOS[i].codpasajero) == Number(idusuarioPasajero)){
          io.to(idconnectsocket).emit('recibepropuesta',
          {
            propuesta, 
            createdAt: new Date()
          });
        }
      }
    }
    // console.log("<-------------conductor envia propuesta ------------------>");
    // console.log(propuesta);
    // io.emit('recibepropuesta', {propuesta, createdAt: new Date()});    
  });

  socket.on('datatrackconductor', (objetoTrack) => { //aqui el conductor envia el tracking para todos los usuarios
    var datatrack = JSON.parse(objetoTrack);
    var idconductor = datatrack.datoconductor.idConductor;
    var latitudTrack = datatrack.datagps.latitud;
    var longitudTrack = datatrack.datagps.longitud;
    actualizarUltimoPosteoConductor(idconductor,latitudTrack, longitudTrack);//actualiza el ultimo posteo del taxi en el arreglo principal donde están todos los conductores activos
    io.emit('recibirtrackconductor', {datatrack, createdAt: new Date()});
  });

  socket.on('testtrack', (testvalue) => { //aqui el conductor envia el tracking para todos los usuarios
    console.log("data->", testvalue);
  });

  socket.on('pasajeroconfirma', (objpasajeroSolicitud) => { //aqui el pasajero acepta propuesta de un conductor [version actual por codconductor]
    console.log("<------ pasajero confirma --------------->");
    //console.log("objpasajeroSolicitud", objpasajeroSolicitud.conductoresofertaron[0].propuesta);
    var codconductor = objpasajeroSolicitud.conductoresofertaron[0].propuesta.idconductor;
    var idSocketconductorAceptado = "";
    var conductoresactivos = getSessionConductores();
  

    for(let i = 0 ; i < conductoresactivos.length ; i++){
      var item = conductoresactivos[i];
      var codigoconductor = conductoresactivos[i].codconductor;
      var codigowsconnection = conductoresactivos[i].idconnection;
      //
      if(codigoconductor == codconductor){
        idSocketconductorAceptado = codigowsconnection;
      }else{
        io.to(codigowsconnection).emit('pasajerorechazo', {item, createdAt: new Date()}); //enviando el idSOCKET al cliente que ingresó
      }
    }

    if(idSocketconductorAceptado != ""){ //si encontro el idconnection
      io.to(idSocketconductorAceptado).emit('pasajeroconfirmo', {objpasajeroSolicitud, createdAt: new Date()}); //envia la confirmacion al conductor
    }


    // //recorriendo los conductores que ofertaron
    // objpasajeroSolicitud.conductoresofertaron.forEach( (item) => {
    //     //element.product_desc = element.product_desc.substring(0,10);
    //   let idsocketconductor = item.propuesta.idsocketconductor.socketidclient;
    //   if(idsocketconductor != idSocketconductorAceptado){
    //     io.to(idsocketconductor).emit('pasajerorechazo', {item, createdAt: new Date()}); //enviando el idSOCKET al cliente que ingresó
    //   }
    //   console.log("item->>",idsocketconductor)
    // });

    // // io.emit('pasajeroconfirmo', {objpasajeroSolicitud, createdAt: new Date()});    
    // io.to(idSocketconductorAceptado).emit('pasajeroconfirmo', {objpasajeroSolicitud, createdAt: new Date()}); //enviando el idSOCKET al cliente que ingresó
  });


  // socket.on('pasajeroconfirma', (objpasajeroSolicitud) => { //aqui el pasajero acepta propuesta de un conductor [version inicial]
  //   //console.log("objpasajeroSolicitud", objpasajeroSolicitud);
  //   console.log("<------ pasajero confirma --------------->");
    
  //   var idSocketconductorAceptado = objpasajeroSolicitud.clientsocket;
  //   //recorriendo los conductores que ofertaron
  //   objpasajeroSolicitud.conductoresofertaron.forEach( (item) => {
  //       //element.product_desc = element.product_desc.substring(0,10);
  //     let idsocketconductor = item.propuesta.idsocketconductor.socketidclient;
  //     if(idsocketconductor != idSocketconductorAceptado){
  //       io.to(idsocketconductor).emit('pasajerorechazo', {item, createdAt: new Date()}); //enviando el idSOCKET al cliente que ingresó
  //     }
  //     console.log("item->>",idsocketconductor)
  //   });

  //   // io.emit('pasajeroconfirmo', {objpasajeroSolicitud, createdAt: new Date()});    
  //   io.to(idSocketconductorAceptado).emit('pasajeroconfirmo', {objpasajeroSolicitud, createdAt: new Date()}); //enviando el idSOCKET al cliente que ingresó
  // });


  socket.on('enviomensajeusuario', (objeto) => { //aqui el conductor envia el tracking para todos los usuarios
    
    var codconductor = objeto.codconductorseleccionado;
    var conductoresactivos = getSessionConductores();
    var idSocketconductorAceptado = "";
    //io.to(idSocketconductorRecepcion).emit('recepcionarmensajedeusuario', {objeto, createdAt: new Date()}); //enviando el idSOCKET al cliente que ingresó

    for(let i = 0 ; i < conductoresactivos.length ; i++){
      var item = conductoresactivos[i];
      var codigoconductor = conductoresactivos[i].codconductor;
      var codigowsconnection = conductoresactivos[i].idconnection;
      //
      if(codigoconductor == codconductor){
        idSocketconductorAceptado = codigowsconnection;
      }
    }

    if(idSocketconductorAceptado != ""){ //si encontro el idconnection
      //io.to(idSocketconductorAceptado).emit('pasajeroconfirmo', {objpasajeroSolicitud, createdAt: new Date()}); //envia la confirmacion al conductor
      io.to(idSocketconductorAceptado).emit('recepcionarmensajedeusuario', {objeto, createdAt: new Date()}); //enviando el idSOCKET al cliente que ingresó
    }

  });

  socket.on('enviomensajeuconductor', (objeto) => { //aqui el conductor envia el tracking para todos los usuarios
    //console.log("solicitó viajee", objetoPasajero);
    console.log("chat conductor", objeto);
    
    io.emit('recepcionarmensajedeconductor', {objeto, createdAt: new Date()}); //enviando el idSOCKET al cliente que ingresó

  });
  
  socket.on('confirmarterminoviaje', (objeto) => { //aqui el conductor envia el tracking para todos los usuarios
    //console.log("solicitó viajee", objetoPasajero);
    var dataconfirmacion = JSON.parse(objeto);
    var codigoUsuarioPasajero = dataconfirmacion.codusuariopasajero;

    console.log("TERMINO VIAJE");
    console.log(dataconfirmacion);
 

    for(let i = 0;i<ARR_PASAJEROS_ACTIVOS.length; i++){
     
      var idconnectsocket = ARR_PASAJEROS_ACTIVOS[i].idconnection;
      if( Number(ARR_PASAJEROS_ACTIVOS[i].codpasajero) == Number(codigoUsuarioPasajero)){
        io.to(idconnectsocket).emit('conductorfinalizaviaje', {
          dataconfirmacion, 
          createdAt: new Date()
        });
      }
    }
  });
  
  // socket.on('loginconductor', (objetoConductor) => {
  //   //console.log("socket--> ",socket.id);
  //   //
  //   let conductoreslogin = getConductoresLogin();
  //   let cantconductoreslogin = conductoreslogin.length;
  //   let conductorlogueado = false;
  //   let objConductor = JSON.parse(objetoConductor);
  //   //
  //   //console.log("cantidad->",conductoreslogin.length);
  //   //
  //   if(cantconductoreslogin > 0 ){ //si ya hay conductores
  //     //
  //     conductorlogueado = busquedaDeConductorLogeado(objConductor.idConductor);
  //     if(conductorlogueado){
  //       console.log("conductor logeado-->");
  //     }else{
  //       console.log("conductor NO logeado-->");
  //       // conductoreslogin.push(objConductor);
  //       // fs.writeFile('dataconductoreslogin.json',  JSON.stringify(conductoreslogin) , 'utf8', function(){
  //       //   console.log("hola");
  //       // });
  //       guardarConductorInFile(objConductor, conductoreslogin);
  //     }

  //   }else{ //si no hay ningun conductor
  //     //conductoreslogin.push(objConductor);
  //     // fs.writeFile('dataconductoreslogin.json',  JSON.stringify(conductoreslogin) , 'utf8', function(){
  //     //   console.log("hola");
  //     // });
  //     guardarConductorInFile(objConductor, conductoreslogin);
  //   }

  //   //console.log("antes de emitir el mensaje---->");
  //   // socket.broadcast.emit('mensajelogin', "se conectó uno");
  //   //io.emit('mensajelogin', {user: "WILLIAM CUBBBB", event: 'joined'});    
  // });

  socket.on('send-message', (message) => {
    io.emit('message', {msg: message.text, user: socket.username, createdAt: new Date()});    
  });

  socket.on('verificar_usuarios', (message) => {

    console.log("usuarios seteados");
    let rawdata = fs.readFileSync('myjsonfile_.json');
    let student = JSON.parse(rawdata);
    console.log("rawdata-->", student);
    // io.emit('message', {msg: message.text, user: socket.username, createdAt: new Date()});    
  });

  socket.on('solicitar_viaje', (datamensaje) => {
    let codigopasajero = datamensaje.codcliente;
    io.emit('message', {msg: message.text, user: socket.username, createdAt: new Date()});    

    // io.emit('message', {msg: message.text, user: socket.username, createdAt: new Date()});    
  });

  // function guardarConductorInFile(objconductor, arrConductores){
  //   arrConductores.push(objconductor);
  //   fs.writeFile('dataconductoreslogin.json',  JSON.stringify(arrConductores) , 'utf8', function(){
  //     console.log("hola");
  //   });
  // }



  // function getConductoresLogin(){
  //   let conductores = fs.readFileSync('dataconductoreslogin.json');
  //   let conductoresJSON = JSON.parse(conductores);

  //   return conductoresJSON;
  // }

  // function busquedaDeConductorLogeado(idconductor){
  //   let conductores = fs.readFileSync('dataconductoreslogin.json');
  //   let conductoresJSON = JSON.parse(conductores);
  //   //
  //   let encontroConductor = false;
  //   //
  //   //console.log("ccantt-->", conductoresJSON.length);
  //   //
  //   for (let item of conductoresJSON) {
  //     //console.log('item->', item ,item["idConductor"], idconductor);
  //     if(item.idConductor == Number(idconductor)){
  //       encontroConductor = true;
  //     }
  //   }
  //   return encontroConductor;
  // }

  function obtenerDistancia(lat1, lon1, lat2, lon2 ) {
    var R = 6378137; // Earth’s mean radius in meter
    var dLat = toRad(lat2 - lat1);
    var dLong = toRad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLong / 2) * Math.sin(dLong / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d; // returns the distance in meter
  };

  // Converts numeric degrees to radians
  function toRad(Value) 
  {
      return Value * Math.PI / 180;
  }

  function actualizarUltimoPosteoConductor(idconductor, latitud, longitud){

    for(let i = 0;i<DATA_CONDUCTORES_EN_SERVICIO.length; i++){
      //console.log(DATA_CONDUCTORES_EN_SERVICIO[i]);
      if(idconductor == DATA_CONDUCTORES_EN_SERVICIO[i].idconductor){
        DATA_CONDUCTORES_EN_SERVICIO[i].ultipoposteolatlng = {
          latitudultimo : latitud,
          longitudultimo : longitud
        }
      }
    }
  }

  function setSessionConductor(itemconductor){ //setea en la data de los conductores
    
    var codconductor = itemconductor.codconductor;
    ARR_CONDUCTORES_ACTIVOS = removeritemsessionconductorbycod(codconductor);

    ARR_CONDUCTORES_ACTIVOS.push(itemconductor)
  }

  function setSessionPasajero(itempasajero){ //setea en la data de los conductores
    
    var codpasajero = itempasajero.codpasajero;
    ARR_PASAJEROS_ACTIVOS = removeritemsessionpasajerobycod(codpasajero);

    ARR_PASAJEROS_ACTIVOS.push(itempasajero);
  }

  function removeritemsessionpasajerobycod(idpasajero){

    var nuevalista = [];

    nuevalista = ARR_PASAJEROS_ACTIVOS.filter(x => {
        return x.codpasajero != idpasajero;
    });


    return nuevalista;
  }

  function removeritemsessionconductorbycod(idconductor){

    var nuevalista = [];

    nuevalista = ARR_CONDUCTORES_ACTIVOS.filter(x => {
        return x.codconductor != idconductor;
    })
    
    return nuevalista;
  }

  
  function getSessionConductores(){
    return ARR_CONDUCTORES_ACTIVOS;
  }

  function removeitemSessionConductor(idSocketConnection){
     
    let encontroid = {
        encontro : false,
        posicion : 0,
        removioitem : false
    };
    console.log("ARR_CONDUCTORES_ACTIVOS", ARR_CONDUCTORES_ACTIVOS,idSocketConnection);
   for(let i = 0;i<ARR_CONDUCTORES_ACTIVOS.length; i++){
       var idconnectsocket = ARR_CONDUCTORES_ACTIVOS[i].idconnection;
       if(idconnectsocket == idSocketConnection){
         encontroid.encontro = true;
         encontroid.posicion = i;
     }
   }

   if(encontroid.encontro){ //si encuentra el idconnection entonces eliminar 
       ARR_CONDUCTORES_ACTIVOS.splice(encontroid.posicion, 1);
       encontroid.removioitem = true;
   }
   return encontroid.removioitem;
 } 

  function removeitemSessionPasajero(idSocketConnection){
        
    let encontroid = {
      encontro : false,
      posicion : 0,
      removioitem : false
    };
  
    for(let i = 0;i<ARR_PASAJEROS_ACTIVOS.length; i++){
        var idconnectsocket = ARR_PASAJEROS_ACTIVOS[i].idconnection;
        if(idconnectsocket == idSocketConnection){
          encontroid.encontro = true;
          encontroid.posicion = i;
      }
    }

    if(encontroid.encontro){ //si encuentra el idconnection entonces eliminar 
      ARR_PASAJEROS_ACTIVOS.splice(encontroid.posicion, 1);
        encontroid.removioitem = true;
    }
    return encontroid.removioitem;
  } 


});
 
// var port = process.env.PORT || 3001;
var port = process.env.PORT || 3001;
server.listen(port, function(){
  console.log('listening in http://localhost:' + port);
});



// {
//    provider: 'fused',
//   locationProvider: 1,
//    time: 1630691678672,
// latitude: -12.0091,
//    longitude: -77.082235,
// accuracy: 5,
// speed: 0,
// altitude: 0,
// bearing: 90,
// isFromMockProvider: false,
// mockLocationsEnabled: false,
//    id: 175
//  }