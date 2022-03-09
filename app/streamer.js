var cv = require('opencv4nodejs');
var buf = null;
const Jimp = require('jimp');

const host = '127.0.0.1'; // process.env.SOCKET_ADDR || '172.17.0.1';
const sport = process.env.SOCKET_PORT || '3333';
const socketPub = require('socket.io-client')('ws://' + host + ':' + sport);

var camera = new cv.VideoCapture(0);

var ieInterval;

socketPub.on('connect', () => {
  console.log('connected to server');
  try {
    ieInterval = setInterval(function() {
      let frame = camera.read();
      let buffer = cv.imencode('.jpg',frame).toString('base64');
      socketPub.emit('rawImage', { image: true, buffer: buffer });
    }, 100);
  } catch (e){
    console.log("Couldn't start camera:", e)
  }

});

socketPub.on('disconnect', () => {
  clearInterval(ieInterval);
  console.log('socket discon');
});
