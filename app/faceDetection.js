// finds faces in image
// -- from there it determines if they are 'active' or 'passive'
// -- then reidentifies based on previous users

const { detectFaces, faceEngine } = require('./inference/faceDetector.js');

var io = require('socket.io-client')('ws://127.0.0.1:3333');

const jimp = require('jimp');
const uuid = require('uuid');

const device = 'CPU';

io.on('connect', () => {
    console.log('connected');
});

io.on('disconnect', () => {
    console.log('socket discon');
});

io.on('faceDetection', async (data) => {
    if (initialized) {

        // could somewhere in here return an image to the html in order to speed this up a bit

        // detect the faces in the frame
        var faces = await detectFaces(data.buffer);
        if (faces.results.length > 0) {
            for (var i = 0; i < faces.results.length; i++) {
                // emit face for conductor class
                io.emit('face', { image: true, buffer: faces.results[i] });
            }
        }
    }
});

let initialized = false;
(async () => {
    await faceEngine(device, '/home/joe/Source/models/face-detection-retail-0004/FP32/face-detection-retail-0004.xml');
    initialized = true;
})();
