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
const { getInference } = require('./inference/genericInference.js');

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

const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
  path: './outputs/people-out.csv',
  header: [
    {id: 'id', title: 'Id'},
    {id: 'ageconfidence', title: 'Age'},
    {id: 'ageresult', title: 'Age Label'},
    {id: 'genderconfidence', title: 'Gender'},
    {id: 'genderresult', title: 'Gender Label'},
    {id: 'faceMatch', title: 'Face Match'}
  ]
});

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
  //   genderconfidence
  //   genderresult
  //   ageconfidence
  //   ageresult
  //   age { result, confidence }
  //   emotion? { result, confidence }
  // }

  let currentPerson = {};

  // try to identify the face to see if it is a new or old user
  var facialRec = await getFacialIdentification(jimpImage, pose.roll, allCurrentPeople);
  
  if (facialRec.identified) {
    currentPerson = allCurrentPeople[facialRec.index];

    console.log(facialRec.confidence);

    console.log('old person');
  } else {
    currentPerson.id = uuid.v4();
    currentPerson.facialRecMatrix = facialRec.newFaceData;

    var genderResult = await getInference(device, jimpImage, '/home/joe/Source/models/gender_net/gender_net.xml', ['Male', 'Female'], 2);
    // console.log(genderResult);
    currentPerson.gender = { result: genderResult[0].label, confidence: genderResult[0].prob };

    currentPerson.genderconfidence = genderResult[0].prob;
    currentPerson.genderresult= genderResult[0].label;
    currentPerson.facialRec = facialRec.confidence;
    
    var ageResult = await getInference(device,
      jimpImage,
      '/home/joe/Source/models/age_net/age_net.xml',
      ['0-8', '0-8', '8-18', '18-25', '25-35', '35-45', '45-55', 'Over 55'],
      4);
    // console.log(ageResult);
    currentPerson.age = { result: ageResult[0].label, confidence: ageResult[0].prob }

    currentPerson.ageconfidence = ageResult[0].prob;
    currentPerson.ageresult = ageResult[0].label;

    console.log('new person');
    // console.log(currentPerson);
    
    
    allCurrentPeople.push(currentPerson);
  }
  
  
  jimpImage.write(`./outputs/identity-${currentPerson.id}.jpg`);
  
  


  processing = false;
};

process.on('SIGINT', async function() {
  await csvWriter.writeRecords(allCurrentPeople);
  console.log("Caught interrupt signal");
  process.exit();
});



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






const data = [
  {
    name: 'John',
    surname: 'Snow',
    age: 26,
    gender: 'M'
  }, {
    name: 'Clair',
    surname: 'White',
    age: 33,
    gender: 'F',
  }, {
    name: 'Fancy',
    surname: 'Brown',
    age: 78,
    gender: 'F'
  }
];
