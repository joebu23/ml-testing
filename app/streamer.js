var cv = require('opencv4nodejs');
var buf = null;
const Jimp = require('jimp');
const { CAP_PROP_BRIGHTNESS } = require('opencv4nodejs');

const host = '127.0.0.1'; // process.env.SOCKET_ADDR || '172.17.0.1';
const sport = process.env.SOCKET_PORT || '3333';
const socketPub = require('socket.io-client')('ws://' + host + ':' + sport);

// for (var i = 0; i < 1000; i++) {
//   try {
//     var camera = new cv.VideoCapture(i);
//     console.log(`there is one at ${i}`);
//   } catch (e) {
//     console.log(`not at ${i}`);
//   }
// }


var camera = new cv.VideoCapture(2);

var ieInterval;

socketPub.on('connect', () => {
  console.log('connected to server');
  try {
    ieInterval = setInterval(function() {
      // camera.set(12, 100);
      // camera.set(10, 0.1);
      let frame = camera.read();
      let buffer = cv.imencode('.jpg',frame).toString('base64');
      socketPub.emit('rawImage', { image: true, buffer: buffer });
    }, 1000);
  } catch (e){
    console.log("Couldn't start camera:", e)
  }

});

socketPub.on('disconnect', () => {
  clearInterval(ieInterval);
  console.log('socket discon');
});
