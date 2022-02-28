// takes image and begins process of re-identification
// and keeps track of interaction time and finally saving data as needed
const { createServer } = require("http");
const { Server } = require("socket.io");
const express = require("express");
const app = express();
app.use(express.static('./public'))
const httpServer = createServer(app);
const io = new Server(httpServer);

const { faceDetector, faceDetectorEngine } = require('./inference/faceDetector.js');
const { poseDetector, poseDetectorEngine } = require('./inference/poseDetector.js');
const { getFacialLandmarks, facialLandmarksEngine } = require('./inference/faceLandmarks.js');

const jimp = require('jimp');

const device = "CPU";

const faces = [];

let processing = false;

async function main(image) {
  processing = true;
  
  // faceDetector detects faces and kicks off the inferences if
  await faceDetector(image);


  
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
    await faceDetectorEngine(device);
    await poseDetectorEngine(device);
    await facialLandmarksEngine(device);
    initialized = true;
})();
httpServer.listen(3030);
console.log("STARTED");

    // const image_path = Buffer.from(image,'base64');
    // var agImage = await jimp.read(image_path).then(image => {
    //   // if(image.bitmap.height !== input_h_face && image.bitmap.width !== input_w_face) {
    //   //   image.background(0xFFFFFFFF);
    //   //   image.contain(image.bitmap.width, image.bitmap.width);
    //   //   image.resize(input_w_face, input_h_face, jimp.RESIZE_BILINEAR);
    //   // }
    //   // image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, hdx) {
    //   //   let h = Math.floor(hdx / 4) * 3;
    //   //   input_data_face[h + 2] = image.bitmap.data[hdx + 0];  // R
    //   //   input_data_face[h + 1] = image.bitmap.data[hdx + 1];  // G
    //   //   input_data_face[h + 0] = image.bitmap.data[hdx + 2];  // B
    //   // });
    //   return image
    //   }).catch(err => {
    //   console.error(err);
    // });

    // for (var i = 0; i < visibleFaces.results.length; i++) {
    //     var newFace = {};
    //     var facePose = await poseDetector(visibleFaces.results[i]);
    //     if (Math.abs(facePose.yaw) < 10 && facePose.pitch > -20) {
    //         // this is an active user, rest are passive watchers
    //         newFace.active = true;
    //     } else {
    //         // mark as passive user
    //         newFace.active = false;
    //     }

    //     var facialRecog = await getFacialIdentification(visibleFaces.results[i], facePose);
    //     newFace.recognition = facialRecog;

    //     if (newFace.recognition.identified == false) {
    //       console.log(newFace);
    //     }

    //     const faceDims = visibleFaces.results[i].dims;
    //     visibleFaces.img.scan(faceDims.x, faceDims.y, faceDims.w, 2, fillColor(0xFF0000FF));
    //     visibleFaces.img.scan(faceDims.x, faceDims.y+faceDims.h, faceDims.w, 2, fillColor(0xFF0000FF));
    //     visibleFaces.img.scan(faceDims.x, faceDims.y, 2, faceDims.h, fillColor(0xFF0000FF));
    //     visibleFaces.img.scan(faceDims.x+faceDims.w, faceDims.y, 2, faceDims.h, fillColor(0xFF0000FF));

    //     visibleFaces.img.write('../outputs/rects.jpg');
    //   }
//         const rects = await agImage.getBase64Async(jimp.MIME_JPEG)
// }

// function fillColor(color) {
//   return function (x, y, offset) {
//     this.bitmap.data.writeUInt32BE(color, offset, true);
//   }

