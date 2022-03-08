// takes image and begins process of re-identification
// and keeps track of interaction time and finally saving data as needed

// const { createServer } = require("http");
// const { Server } = require("socket.io");
// const express = require("express");
// const util = require('util');
const jimp = require('jimp');
const uuid = require('uuid');
const fs = require('fs');
// const { Core, getVersion } = require('inference-engine-node');
// const cv = require('opencv4nodejs');
// const { detectFaces, faceEngine } = require('./inference/faceDetector.js');

const { detectPose, poseDetectorEngine } = require('./inference/poseDetector.js');
const { facialLandmarksEngine } = require('./inference/faceLandmarks.js');
const { getFacialIdentification, identificationEngine } = require('./inference/faceIdentification.js');

// const app = express();
// app.use(express.static('public'))
// const httpServer = createServer(app);
// const io = new Server(httpServer);
const host = '127.0.0.1'; // process.env.SOCKET_ADDR || '172.17.0.1';
const sport = process.env.SOCKET_PORT || '3333';
const socketPub = require('socket.io-client')('ws://' + host + ':' + sport);

const device = "CPU";

let processing = false;

var allCurrentPeople = [];

async function main(image) {
  processing = true;

  var jimpImage = await jimp.read(image.img.bitmap).then((img) => {
    return img;
  });
 
  // is this user active or passive?
  // using just yaw right now.  Basically if the face is from -20 to 20 degrees it is in the direction of the camera and is therefore active
  var pose = await detectPose(jimpImage);

  // array of identified people matrices
  // model of items in allCurrentPeople
  // {
  //   id: guid
  //   activeUser: boolean
  //   timeActiveStart: date
  //   timeActiveEnd: date
  //   facialRecMatrix: result from getFacialIdentification, used to match future images
  //   gender { result, confidence }
  //   age { result, confidence }
  //   emotion? { result, confidence }
  // }

  let currentPerson = {};

  console.log('all people now: ' + allCurrentPeople.length);

  // try to identify the face to see if it is a new or old user
  var facialRec = await getFacialIdentification(jimpImage, pose.pitch, allCurrentPeople);
  
  console.log(facialRec.confidence);
  console.log(facialRec.index);
  if (facialRec.identified) {
    currentPerson = allCurrentPeople[facialRec.index];
  } else {
    currentPerson.id = uuid.v4();
    currentPerson.facialRecMatrix = facialRec.newFaceData;

    


    allCurrentPeople.push(currentPerson);
    fs.writeFileSync('./outputs/people.csv', JSON.stringify(currentPerson), { flag: 'a+'});
  }

  jimpImage.write(`./outputs/identity-${currentPerson.id}.jpg`);
  
  processing = false;
};

socketPub.on('face', (data) => {
  if(data.image && !processing && initialized) {
    main(data.buffer).then(() => {processing = false}).catch();
  }
});

let initialized = false;
(async () => {
  await poseDetectorEngine(device, '/home/joe/Source/models/head-pose-estimation-adas-0001/FP32/head-pose-estimation-adas-0001.xml');
  await facialLandmarksEngine(device, '/home/joe/Source/models/landmarks-regression-retail-0009/FP32/landmarks-regression-retail-0009.xml');
  await identificationEngine(device, '/home/joe/Source/models/face-reidentification-retail-0095/FP32/face-reidentification-retail-0095.xml');
  initialized = true;
})();
// httpServer.listen(3030);
console.log("STARTED");
