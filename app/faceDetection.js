const { detectFaces, faceEngine } = require('./inference/faceDetector.js');
var io = require('socket.io-client')('ws://127.0.0.1:3333');

const device = 'CPU';
let processing = false;

async function main(image) {
    
}


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
            // send each face to be re-identified if possible
            
            console.log('i found a face, at least one');
        }
    }
});

let initialized = false;
(async () => {
    await faceEngine(device, '/home/joe/Source/models/face-detection-retail-0004/FP32/face-detection-retail-0004.xml');
    initialized = true;
})();


