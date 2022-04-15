// takes image and begins process of re-identification
// and keeps track of interaction time and finally saving data as needed

const jimp = require('jimp');
const uuid = require('uuid');
// const fs = require('fs');

const { detectPose, poseDetectorEngine } = require('./inference/poseDetector.js');
const { getFacialLandmarks, facialLandmarksEngine } = require('./inference/faceLandmarks.js');
const { getFacialIdentification, identificationEngine } = require('./inference/faceIdentification.js');
const { getInference } = require('./inference/genericInference.js');
const { logArray, findTimeDifferenceInMinutes, findTimeDifferenceInMs } = require('./common/index.js');

const host = '127.0.0.1'; // process.env.SOCKET_ADDR || '172.17.0.1';
const sport = process.env.SOCKET_PORT || '3333';
const socketPub = require('socket.io-client')('ws://' + host + ':' + sport);

const device = "CPU";

let processing = false;

var currentPeople = [];
var oldPeople = [];

async function main(image) {
  var performanceDateStart = new Date();

  processing = true;
  var currentDate = new Date();
  var needGender = true;
  var needAge = true;

  var jimpImage = await jimp.read(image.img.bitmap).then((img) => {
    return img;
  });
 
  var pose = await detectPose(jimpImage);
  var landmarks = await getFacialLandmarks(jimpImage);

  let currentPerson = {};
  
  // try to identify the face to see if it is a new or old user
  // only identify active users
  var facialRec = await getFacialIdentification(jimpImage, pose.roll, landmarks, currentPeople);

  // console.clear();
  // console.log(facialRec.confidence);

  var facialTimeDiff = findTimeDifferenceInMs(currentPeople[facialRec.index]?.lastObservedTime, currentDate);
  if (facialRec.confidence > 0.8 || (facialRec.confidence > 0.7 && facialTimeDiff && facialTimeDiff < 5000)) {
  // if (facialRec.confidence > .8 || facialRec.confidence > .7 && findTimeDifferenceInMs(currentPeople[facialRec.index].lastObservedTime, currentDate) < 2500) {
    // console.log(findTimeDifferenceInMs(currentPeople[facialRec.index].lastObservedTime, currentDate));
    currentPerson = currentPeople[facialRec.index];
    currentPerson.faceMatches.push(facialRec.confidence);
    currentPerson.lastObservedTime = currentDate;
    
    // check to see if the new image is better for comparison, notably that he yaw is closer to zero (straight ahead)
    if (Math.abs(pose.yaw) < Math.abs(currentPerson.bestYaw)) {
      currentPerson.bestYaw = pose.yaw;
      
      currentPerson.facialRecMatrix = facialRec.newFaceData;
      currentPerson.facialConfidence = facialRec.confidence;
      jimpImage.write(`./outputs/identity-${currentPerson.id}.jpg`);
    }

    if (currentPerson.gender?.confidence > .985) {
      needGender = false;
    }

    if (currentPerson.foundAgeRange?.confidence > .90) {
      needAge = false;
    }
  } else {
    currentPerson.id = uuid.v4();
    currentPerson.firstObservedTime = currentDate;
    currentPerson.lastObservedTime = currentDate;
    currentPerson.firstMatchConfidence = facialRec.confidence;
    currentPerson.facialConfidence = facialRec.confidence;
    currentPerson.facialRecMatrix = facialRec.newFaceData;
    currentPerson.faceMatches = [];
    currentPerson.genders = [];
    currentPerson.ages = [];

    currentPerson.bestYaw = pose.yaw;
    currentPerson.bestRoll = pose.roll;
    currentPerson.bestPitch = pose.pitch;
    
    jimpImage.write(`./outputs/identity-${currentPerson.id}.jpg`);
    currentPeople.push(currentPerson);
  }

  var newGender = await getGender(jimpImage);
  currentPerson.genders.push(newGender);

  if (needGender) {
    if (newGender.confidence > currentPerson.gender?.confidence || !currentPerson.gender) {
      currentPerson.gender = newGender;
    }
  }
  
  currentPerson.ages.push(await getAge(jimpImage));
  if (needAge) {
    var newAgeRange = await getAge2(jimpImage);

    if (newAgeRange.confidence > currentPerson.foundAgeRange?.confidence || !currentPerson.foundAgeRange) {
      currentPerson.foundAgeRange = newAgeRange;
    }
  }

  var tempActive = [];
  currentPeople.forEach((cp) => {
    if ((findTimeDifferenceInMinutes(cp.lastObservedTime, currentDate) > 1) ||
        (!cp.lastObservedTime && findTimeDifferenceInMinutes(cp.firstObservedTime, currentDate) > 1)) {
          oldPeople.push(cp);
    } else {
      tempActive.push(cp);
    }
  });

  currentPeople = tempActive;

  // console.log(`Active: ${currentPeople.length} -- Inactive: ${oldPeople.length}`);

  processing = false;

  // console.clear();
  console.log(findTimeDifferenceInMs(performanceDateStart, new Date()));
  // console.log(pose);
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
    '/home/joe/Source/models/age-gender-recognition-retail-0013/FP32/age-gender-recognition-retail-0013.xml',
    0,
    [],
    1);

  return parseFloat(age[0].prob); // { result: age[0].label, confidence: age[0].prob }
}

async function getAge2(image) {
  var age = await getInference(device,
    image,
    '/home/joe/Source/models/age_net/age_net.xml',
    0,
    ['0-8', '0-8', '8-18', '18-25', '25-35', '35-45', '45-55', 'Over 55'],
    4);

    return { result: age[0].label, confidence: age[0].prob }
}

function reportInactivePeople() {
  logArray(oldPeople);
}

process.on('SIGINT', async function() {
  console.log(`There were ${currentPeople.length} marked as current users when shutdown signal received`);
  // output curent users
  logArray(currentPeople);
  console.log('Inactive Users')
  console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
  reportInactivePeople();
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