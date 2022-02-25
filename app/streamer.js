var cv = require('opencv4nodejs');
var buf = null;
const Jimp = require('jimp');

var socket = require('socket.io-client')('ws://localhost:3030');

var camera = new cv.VideoCapture(0);

var ieInterval;

socket.on('connect', () => {
console.log('connected to server');
try {
  ieInterval = setInterval(function() {
    let frame = camera.read();
    cv.imwrite('../outputs/camera-feed.png', frame);
    let buffer = cv.imencode('.jpg',frame).toString('base64');
    socket.emit('image', { image: true, buffer: buffer });
  }, 200);
} catch (e){
  console.log("Couldn't start camera:", e)
}

});

socket.on('disconnect', () => {
  clearInterval(ieInterval);
  console.log('socket discon');
});
