// takes image and begins process of re-identification
// and keeps track of interaction time and finally saving data as needed
const {Core, postProcessing, getVersion} =
    require('inference-engine-node');

const {
  binPathFromXML,
  warning,
  showAvailableDevices,
} = require('./common');

const { faceDetector, faceDetectorEngine } = require('./inference/faceDetector.js');
const { poseDetector, poseDetectorEngine } = require('./inference/poseDetector.js');
const { getFacialLandmarks, facialLandmarksEngine } = require('./inference/faceLandmarks.js');
const { getFacialIdentification, identificationEngine } = require('./inference/faceIndentification.js');

const jimp = require('jimp');
const fs = require('fs').promises;
const {performance} = require('perf_hooks');

const device = "CPU";

const faces = [];

let processing = false;

async function main(image) {
    processing = true;
    // instanstiate inference classes
    // await faceDetectorEngine(device);
    
    // await poseDetectorEngine(device);
    // await facialLandmarksEngine(device);
    // await identificationEngine(device);
    
    const visibleFaces = await faceDetector(image);

    for (var i = 0; i < visibleFaces.results.length; i++) {
        var newFace = {};
        var facePose = await poseDetector(visibleFaces.results[i]);
        if (Math.abs(facePose.yaw) < 10 && facePose.pitch > -20) {
            // this is an active user, rest are passive watchers
            newFace.active = true;
        } else {
            // mark as passive user
            newFace.active = false;
        }

        var facialRecog = await getFacialIdentification(visibleFaces.results[i], facePose);
        newFace.recognition = facialRecog;

        if (newFace.recognition.identified == false) {
          console.log(newFace);
        }

        const faceDims = visibleFaces.results[i].dims;
        visibleFaces.img.scan(faceDims.x, faceDims.y, faceDims.w, 2, fillColor(0xFF0000FF));
        visibleFaces.img.scan(faceDims.x, faceDims.y+faceDims.h, faceDims.w, 2, fillColor(0xFF0000FF));
        visibleFaces.img.scan(faceDims.x, faceDims.y, 2, faceDims.h, fillColor(0xFF0000FF));
        visibleFaces.img.scan(faceDims.x+faceDims.w, faceDims.y, 2, faceDims.h, fillColor(0xFF0000FF));

        visibleFaces.img.write('../outputs/rects.jpg');
        const rects = await visibleFaces.img.getBase64Async(jimp.MIME_JPEG)
        io.emit('rects', {image: true, data: rects, faces: {test: 'nothing yet'}});
    }
    
    //process.exit(0);
    processing = false;
}

function fillColor(color) {
  return function (x, y, offset) {
    this.bitmap.data.writeUInt32BE(color, offset, true);
  }
};

module.exports = { main };

// for testing locally
// const core = new Core();
// const commandLineArgs = require('command-line-args');
// const commandLineUsage = require('command-line-usage');
// const { option_definitions } = require('./common/commandLineArgs');
// const { Http2ServerRequest } = require('http2');

// const options = commandLineArgs(option_definitions);
//   if (options.help || !options.image) {
//     const usage = commandLineUsage([
//       {
//         header: 'actiVISION Inference Engine',
//         content:
//             'Inference engine for actiVISION'
//       },
//       {header: 'Options', optionList: option_definitions}
//     ]);
//     console.log(usage);
//     showAvailableDevices(core);
//     process.exit(0);
//   }

// fs.readFile(options.image)
//     .then(async (file) => main(file)
//     .then(console.log).catch(warning)
//     );
// main(options.image).then(console.log).catch(warning);

const { createServer } = require("http");
const { Server } = require("socket.io");
const express = require("express");
const app = express();
app.use(express.static('public'))
const httpServer = createServer(app);
const io = new Server(httpServer);

io.on('connection', (socket) => {
    socket.on('image', (data) => {
      if(data.image && !processing && initialized) {
        main(data.buffer).then(() => {processing = false}).catch();
      }
    });
  });

let initialized = false;

(async () => {
    await faceDetectorEngine(device);
    await poseDetectorEngine(device);
    await facialLandmarksEngine(device);
    await identificationEngine(device);
    initialized = true;
})();
httpServer.listen(3030);
console.log("STARTED");