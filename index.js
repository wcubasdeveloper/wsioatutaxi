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
let arrConductoresActivos = [];
//
io.on('connection', (socket) => {
  //
  var socketID = socket.id;
  let id = socket.handshake.query.id;
  console.log("socketID", socketID, 'id->', id);
  //
  // console.log("room--->", nameRoom);

  io.to(socketID).emit('sendsocketid', { socketidclient :  socketID}); //enviando el idSOCKET al cliente que ingresó


  //
  // let json__ = [{
  //   apellidos : 'cubas alegria'
  // }];
  
  // json__.push({ apellidos : 'espinza cordova' });
  // let datasave = JSON.stringify(json__);
  //
  // fs.writeFile('myjsonfile_.json', datasave, 'utf8', function(){
  //   console.log("hola");
  // });
  //
  // io.emit('sendidclisocket', {user: socket.id, event: 'left'});   
  socket.on('disconnect', function(){
    console.log("se desconecto");
    io.emit('users-changed', {user: socket.username, event: 'left'});   
  });
  
  socket.on('solicitaviaje', (objetoPasajero) => { //aqui el pasajero solicita un viaje a os conductores
    //console.log("solicitó viajee", objetoPasajero);
    var pasajero = JSON.parse(objetoPasajero);
    io.emit('pasajerosolicitaviaje', {pasajero, createdAt: new Date()});    
  });

  socket.on('enviapropuesta', (objetoPropuesta) => { //aqui el conductor envia propuesta al pasajero
    //console.log("solicitó viajee", objetoPasajero);
    var propuesta = JSON.parse(objetoPropuesta);

    io.emit('recibepropuesta', {propuesta, createdAt: new Date()});    
  });


  socket.on('datatrackconductor', (objetoTrack) => { //aqui el conductor envia el tracking para todos los usuarios
    //console.log("solicitó viajee", objetoPasajero);
    var datatrack = JSON.parse(objetoTrack);
    io.emit('recibirtrackconductor', {datatrack, createdAt: new Date()});    
  });

  socket.on('pasajeroconfirma', (objpasajeroSolicitud) => { //aqui el conductor envia propuesta al pasajero
    console.log("objpasajeroSolicitud", objpasajeroSolicitud);
    //
    var idSocketconductorAceptado = objpasajeroSolicitud.clientsocket;

    //recorriendo los conductores que ofertaron
    objpasajeroSolicitud.conductoresofertaron.forEach( (item) => {
      
        //element.product_desc = element.product_desc.substring(0,10);
      let idsocketconductor = item.propuesta.idsocketconductor.socketidclient;
      if(idsocketconductor != idSocketconductorAceptado){
        io.to(idsocketconductor).emit('pasajerorechazo', {item, createdAt: new Date()}); //enviando el idSOCKET al cliente que ingresó
      }
      console.log("item->>",idsocketconductor)
    });

    // io.emit('pasajeroconfirmo', {objpasajeroSolicitud, createdAt: new Date()});    
    io.to(idSocketconductorAceptado).emit('pasajeroconfirmo', {objpasajeroSolicitud, createdAt: new Date()}); //enviando el idSOCKET al cliente que ingresó
  });

  socket.on('confirmarterminoviaje', (objeto) => { //aqui el conductor envia el tracking para todos los usuarios
    //console.log("solicitó viajee", objetoPasajero);
    var dataconfirmacion = JSON.parse(objeto);
    io.emit('conductorfinalizaviaje', {dataconfirmacion, createdAt: new Date()});    
  });
  


  socket.on('loginconductor', (objetoConductor) => {
    //console.log("socket--> ",socket.id);
    //
    let conductoreslogin = getConductoresLogin();
    let cantconductoreslogin = conductoreslogin.length;
    let conductorlogueado = false;
    let objConductor = JSON.parse(objetoConductor);
    //
    //console.log("cantidad->",conductoreslogin.length);
    //
    if(cantconductoreslogin > 0 ){ //si ya hay conductores
      //
      conductorlogueado = busquedaDeConductorLogeado(objConductor.idConductor);
      if(conductorlogueado){
        console.log("conductor logeado-->");
      }else{
        console.log("conductor NO logeado-->");
        // conductoreslogin.push(objConductor);
        // fs.writeFile('dataconductoreslogin.json',  JSON.stringify(conductoreslogin) , 'utf8', function(){
        //   console.log("hola");
        // });
        guardarConductorInFile(objConductor, conductoreslogin);
      }

    }else{ //si no hay ningun conductor
      //conductoreslogin.push(objConductor);
      // fs.writeFile('dataconductoreslogin.json',  JSON.stringify(conductoreslogin) , 'utf8', function(){
      //   console.log("hola");
      // });
      guardarConductorInFile(objConductor, conductoreslogin);
    }

    //console.log("antes de emitir el mensaje---->");
    // socket.broadcast.emit('mensajelogin', "se conectó uno");
    //io.emit('mensajelogin', {user: "WILLIAM CUBBBB", event: 'joined'});    
  });

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

  function guardarConductorInFile(objconductor, arrConductores){
    arrConductores.push(objconductor);
    fs.writeFile('dataconductoreslogin.json',  JSON.stringify(arrConductores) , 'utf8', function(){
      console.log("hola");
    });
  }

  function getConductoresLogin(){
    let conductores = fs.readFileSync('dataconductoreslogin.json');
    let conductoresJSON = JSON.parse(conductores);

    return conductoresJSON;
  }

  function busquedaDeConductorLogeado(idconductor){
    let conductores = fs.readFileSync('dataconductoreslogin.json');
    let conductoresJSON = JSON.parse(conductores);
    //
    let encontroConductor = false;
    //
    //console.log("ccantt-->", conductoresJSON.length);
    //
    for (let item of conductoresJSON) {
      //console.log('item->', item ,item["idConductor"], idconductor);
      if(item.idConductor == Number(idconductor)){
        encontroConductor = true;
      }
    }
    return encontroConductor;
  }
});
 
var port = process.env.PORT || 3001;
server.listen(port, function(){
   console.log('listening in http://localhost:' + port);
});

