const express = require("express");
const socket = require("socket.io");
var cors = require('cors');
const jimp = require('jimp');

// App setup
const PORT = 3333;
const app = express();
app.use(cors());

const server = app.listen(PORT, function () {
  console.log(`Listening on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});

// Static files
app.use(express.static("public"));

// Socket setup
const io = socket(server, { 
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connect', function(socket) {
    console.log('connected to client');
    socket.on('rawImage', async function(data) {
        const image_path = Buffer.from(data.buffer,'base64');
        var image = await jimp.read(image_path).then(image2 => {
            image2.contain(1000,1000);
            image2.write('./outputs/detector-input.jpg');
            return image2
          }).catch(err => {
            console.error(err);
          });
        io.emit('rects', {image: true, data: image, faces: {test: 'nothing yet'}});

        socket.broadcast.emit('faceDetection', data);
    });

    socket.on('face', function(data) {
      socket.broadcast.emit('face', data);
    });
});

io.on('disconnect', function(socket) {
  console.log('client disconnected');
});
