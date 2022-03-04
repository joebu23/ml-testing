// takes image and begins process of re-identification
// and keeps track of interaction time and finally saving data as needed

// const { createServer } = require("http");
// const { Server } = require("socket.io");
// const express = require("express");
// const util = require('util');
// const jimp = require('jimp');
// const { Core, getVersion } = require('inference-engine-node');
// const cv = require('opencv4nodejs');
const { detectFaces, faceEngine } = require('./inference/faceDetector.js');

// const app = express();
// app.use(express.static('public'))
// const httpServer = createServer(app);
// const io = new Server(httpServer);
const host = '127.0.0.1'; // process.env.SOCKET_ADDR || '172.17.0.1';
const sport = process.env.SOCKET_PORT || '3333';
const socketPub = require('socket.io-client')('ws://' + host + ':' + sport);

const device = "CPU";

let processing = false;

async function main(image) {
  processing = true;
  
  
  var test = await detectFaces(image);
  
  test.results.forEach((res) => {
    res.img.write('../outputs/little.jpg');
  });

  test.img.write('../outputs/big.jpg');
  
  const rects = await test.img.getBase64Async("image/jpeg");
  io.emit('rects', {image: true, data: rects, faces: {test: 'nothing yet'}});
  processing = false;
};

socketPub.on('image2', (data) => {
  console.log(data);
  if(data.image && !processing && initialized) {
    socket.emit('faceDetection', { data: data });
    main(data.buffer).then(() => {processing = false}).catch();
  }
});
// io.on('connection', (socket) => {
//   socket.on('image', (data) => {
//     if(data.image && !processing && initialized) {
//       socket.emit('faceDetection', { data: data });
//       main(data.buffer).then(() => {processing = false}).catch();
//     }
//   });
//   socket.on('faceDetection', (data) => {
//     if(data) {
//     }
//   });
// });

let initialized = false;

(async () => {
  await faceEngine(device, '/home/joe/Source/models/face-detection-retail-0004/FP32/face-detection-retail-0004.xml');
  initialized = true;
})();
// httpServer.listen(3030);
console.log("STARTED");
