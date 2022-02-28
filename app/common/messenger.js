const bull = require('bull');

const faceQueue = new bull("found_faces", 'redis://192.168.86.24');
const identifiedFaceQueue = new bull("identified_faces", 'redis://192.168.86.32');

async function addFoundFace(faceData) {
    await faceQueue.add({ face: faceData });
}

async function addIdentifiedFace(faceData) {
    await identifiedFaceQueue.add({ face: faceData });
}

module.exports = { addFoundFace, addIdentifiedFace };