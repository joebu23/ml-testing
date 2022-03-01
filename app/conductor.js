'use strict'
// takes image and begins process of re-identification
// and keeps track of interaction time and finally saving data as needed
import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";
const app = express();
app.use(express.static('./public'))
const httpServer = createServer(app);
const io = new Server(httpServer);

// const { faceDetector, faceDetectorEngine } = require('./inference/faceDetector.js');
// const { poseDetector, poseDetectorEngine } = require('./inference/poseDetector.js');
// const { getFacialLandmarks, facialLandmarksEngine } = require('./inference/faceLandmarks.js');
// const { getFacialIdentification, identificationEngine } = require('./inference/faceIdentification.js');

// const bull = require('bull');
// const foundFacesQueue = new bull("found_faces", 'redis://192.168.86.24');
// const identifiedFacesQueue = new bull("identified_faces", 'redis://192.168.86.24');

import FaceDetector from './inference/faceDetector.js';

// foundFacesQueue.process(async (job, done) => {
//   await identificationEngine('CPU');
//   // console.log(job);
//   if (job.data) {
//     const results = await getFacialIdentification(job.data.face);
//     console.log(results);
//   }
//   done();
// });

// const jimp = require('jimp');

// const device = "CPU";

// const faces = [];

let processing = false;



async function main(image) {
  processing = true;
  const faceDetector = new FaceDetector('CPU', '/home/joe/Source/models/face-detection-retail-0004/FP32/face-detection-retail-0004.xml');
  
  var test = await faceDetector.infer(image);
  console.log('******************************');
  console.log(test);
  // faceDetector detects faces and kicks off the inferences if
  // await faceDetector(image);


  
  io.emit('rects', {image: true, faces: {test: 'nothing yet'}});
};

io.on('connection', (socket) => {
    socket.on('image', (data) => {
      if(data.image && !processing && initialized) {
        main(data.buffer).then(() => {processing = false}).catch();
      }
    });
  });

let initialized = false;

(async () => {
    // await faceDetectorEngine(device);
    // await poseDetectorEngine(device);
    // await facialLandmarksEngine(device);
    // await identificationEngine(device);
    initialized = true;
})();
httpServer.listen(3030);
console.log("STARTED");
