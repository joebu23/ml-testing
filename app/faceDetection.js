// finds faces in image
// -- from there it determines if they are 'active' or 'passive'
// -- then reidentifies based on previous users

const { detectFaces, faceEngine } = require('./inference/faceDetector.js');
const { detectPose, poseDetectorEngine } = require('./inference/poseDetector.js');
const { getFacialLandmarks, facialLandmarksEngine } = require('./inference/faceLandmarks.js');

var io = require('socket.io-client')('ws://127.0.0.1:3333');

const device = 'CPU';

io.on('connect', () => {
    console.log('connected');
});

io.on('disconnect', () => {
    console.log('socket discon');
});

io.on('faceDetection', async (data) => {
    if (initialized) {
        var faces = await detectFaces(data.buffer);
        if (faces.results.length > 0) {
            console.clear();
            console.log('i found a face, at least one');

            for (var i = 0; i < faces.results.length; i++) {
                // is this user active or passive?
                var pose = await detectPose(faces.results[i]);
                if (Math.abs(pose.yaw) <= 20) {
                    // active user
                    console.log('active user');
                } else {
                    console.log('inactive user');
                }

                // send each face to be re-identified if possible
                var landmarks = await getFacialLandmarks(faces.results[i]);
                console.log(landmarks);
            }
            

            
        }
    }
});

let initialized = false;
(async () => {
    await faceEngine(device, '/home/joe/Source/models/face-detection-retail-0004/FP32/face-detection-retail-0004.xml');
    await poseDetectorEngine(device, '/home/joe/Source/models/head-pose-estimation-adas-0001/FP32/head-pose-estimation-adas-0001.xml');
    await facialLandmarksEngine(device, '/home/joe/Source/models/landmarks-regression-retail-0009/FP32/landmarks-regression-retail-0009.xml');
    initialized = true;
})();


