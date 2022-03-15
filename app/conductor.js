// takes image and begins process of re-identification
// and keeps track of interaction time and finally saving data as needed

const jimp = require('jimp');
const uuid = require('uuid');
const fs = require('fs');

const { detectPose, poseDetectorEngine } = require('./inference/poseDetector.js');
const { getFacialLandmarks, facialLandmarksEngine } = require('./inference/faceLandmarks.js');
const { getFacialIdentification, identificationEngine } = require('./inference/faceIdentification.js');
const { getInference } = require('./inference/genericInference.js');

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
  var landmarks = await getFacialLandmarks(jimpImage);

  // model of items in allCurrentPeople -- allCurrentPeople holds the current active users
  // {
  //   id: guid
  //   timeActiveStart: date
  //   timeActiveEnd: date
  //   facialConfidence: number
  //   facialRecMatrix: result from getFacialIdentification, used to match future images
  //   gender { result, confidence }
  //   age { result, confidence }
  //   emotion? { result, confidence }
  // }

  let currentPerson = {};
  
  // try to identify the face to see if it is a new or old user
  // only identify active users
  if (Math.abs(pose.yaw) < 20) {
    let needAge = true;
    let needGender = true;
    let newPerson = true; 
    
    var facialRec = await getFacialIdentification(jimpImage, pose.roll, landmarks, allCurrentPeople);

    if (facialRec.confidence > .7) {
      newPerson = false;

      currentPerson = allCurrentPeople[facialRec.index];
      if (facialRec.confidence > currentPerson.facialConfidence) {
        currentPerson.facialRecMatrix = facialRec.newFaceData;
        currentPerson.facialConfidence = facialRec.confidence;
      }

      if (currentPerson.gender.confidence > .95) {
        needGender = false;
      }

      if (currentPerson.age.confidence > .85) {
        needAge = false;
      }
    } else {
      currentPerson.id = uuid.v4();
      currentPerson.facialConfidence = facialRec.confidence;
      currentPerson.facialRecMatrix = facialRec.newFaceData;
    }

    // get age if needed
    if (needAge) {
      currentPerson.age = await getAge(jimpImage);
    }

    // get gender if needed
    if (needGender) {
      currentPerson.gender = await getGender(jimpImage);
    }

    // only push if the person is over 18
    if (newPerson && currentPerson.age.result != '0-8' && currentPerson.age.result != '8-18') {
      allCurrentPeople.push(currentPerson);
    }
  }
  
  if (currentPerson.id) {
    jimpImage.write(`./outputs/identity-${currentPerson.id}.jpg`);
  }

  processing = false;
};

async function getGender(image) {
  var gender = await getInference(device,
    image,
    '/home/joe/Source/models/age-gender-recognition-retail-0013/FP32/age-gender-recognition-retail-0013.xml',
    1,
    ['Female', 'Male'],
    2);

  return { result: gender[0].label, confidence: gender[0].prob };
}

async function getAge(image) {
  var age = await getInference(device,
    image,
    '/home/joe/Source/models/age_net/age_net.xml',
    0,
    ['0-8', '0-8', '8-18', '18-25', '25-35', '35-45', '45-55', 'Over 55'],
    4);

  return { result: age[0].label, confidence: age[0].prob }
}


process.on('SIGINT', async function() {
  // await csvWriter.writeRecords(allCurrentPeople);
  // console.log(allCurrentPeople);
  // console.log(allCurrentPeople.length);

  // output current users
  allCurrentPeople.forEach((person) => {
    console.log(`Person::: id:${person.id}  Gender:${person.gender.result}  ${person.gender.confidence}  Age:${person.age.result}  ${person.age.confidence}  Facial Match:${person.facialConfidence}`)
  });
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