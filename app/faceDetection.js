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
                // is this user active or passive?
                // using just yaw right now.  Basically if the face is from -20 to 20 degrees it is in the direction of the camera and is therefore active
                // var pose = await detectPose(faces.results[i]);
                // if (Math.abs(pose.yaw) <= 20) {
                //     // active user
                //     console.log('active user');
                // } else {
                //     console.log('inactive user');
                // }

                // // try to identify the face to see if it is a new or old user
                // var test = await getFacialIdentification(faces.results[i], pose.pitch);
                // // console.clear();
                // if (!test.identified) {
                //     const image_path = Buffer.from(data.buffer,'base64');
                //     var image = await jimp.read(image_path).then(image2 => {
                //         image2.contain(1000,1000);
                //         image2.write(`../outputs/identity-${uuid.v4()}.jpg`);
                //         return image2
                //       }).catch(err => {
                //         console.error(err);
                //       });
                // }
                // console.log(test);
                // send each face to be re-identified if possible
                // var landmarks = await getFacialLandmarks(faces.results[i]);
                // console.log(landmarks);
            }
            

            
        }
    }
});

let initialized = false;
(async () => {
    await faceEngine(device, '/home/joe/Source/models/face-detection-retail-0004/FP32/face-detection-retail-0004.xml');
    initialized = true;
})();


