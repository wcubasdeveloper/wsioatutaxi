const express = require('express');
// const options = {
//     cors: {
//       origin: '*',
//     },
//     allowEIO3: true
// };
const options = {
  cors: true,
  origin: clientURL,
  allowEIO3: true, // tweaking it may help
};

const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, options);
//
io.on('connection', (socket) => {
    const idHandShake = socket.id;
    const { nameRoom } = socket.idHandShake.query;
    console.log("hola dispositivo ", idHandShake, ' al room ', nameRoom);
});
//

//var port = process.env.PORT || 3001;
var puerto = 5000;
server.listen(puerto, function(){
   console.log('servidor socket activo http://localhost:' + puerto);
});


