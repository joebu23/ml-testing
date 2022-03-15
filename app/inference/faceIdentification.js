const { Core, getVersion } = require('inference-engine-node');

const jimp = require('jimp');
const fs = require('fs').promises;
const { performance } = require('perf_hooks');
const { binPathFromXML } = require('../common/index.js');
const uuid = require('uuid');
const { distort, Distortion } = require('@alxcube/lens');
const {Adapter} = require('@alxcube/lens-jimp');

const similarity = require('compute-cosine-similarity');


var core_identity,
    model_identity,
    bin_path_identity,
    net_identity,
    inputs_info_identity, 
    outputs_info_identity,
    input_info_identity,
    output_info_identity,
    exec_net_identity,
    input_dims_identity,
    input_info_identity_name,
    output_info_identity_name;

var identities = [];


async function identificationEngine(device_name, model) {
	core_identity = new Core();
	model_identity = model;
	bin_path_identity = binPathFromXML(model_identity);
	net_identity = await core_identity.readNetwork(model_identity, bin_path_identity);
	inputs_info_identity = net_identity.getInputsInfo();
	outputs_info_identity = net_identity.getOutputsInfo();
	input_info_identity = inputs_info_identity[0];
	output_info_identity = outputs_info_identity[0];
	input_info_identity.setLayout('nhwc');
	input_info_identity.setPrecision('u8');
	exec_net_identity = await core_identity.loadNetwork(net_identity, device_name);
	input_dims_identity = input_info_identity.getDims();
	input_info_identity_name = input_info_identity.name();
	output_info_identity_name = output_info_identity.name();
}


async function getFacialIdentification(img, pitch, srcLandmarks, currentPeople) {

  var results = [];

  var resultsObj = {
    vect: identities
  };

  const baseImage = img;

  const controlPoints = [
    srcLandmarks.leftEye.x, srcLandmarks.leftEye.y, 0.31556875000000000, 0.4615741071428571,
    srcLandmarks.rightEye.x, srcLandmarks.rightEye.y, 0.68262291666666670, 0.4615741071428571,
    srcLandmarks.tipOfNose.x, srcLandmarks.tipOfNose.y, 0.50026249999999990, 0.6405053571428571,
    srcLandmarks.leftLip.x, srcLandmarks.leftLip.y, 0.34947187500000004, 0.8246919642857142,
    srcLandmarks.rightLip.x, srcLandmarks.rightLip.y, 0.65343645833333330, 0.8246919642857142,
  ];

  var image = await distort(baseImage, Distortion.AFFINE, controlPoints)
    .then(async result => {
      await result.image.image.write('../outputs/normalized.jpg');
      return result.image.image;
    });

  const input_dims_identity = input_info_identity.getDims();
  const input_h_identity = input_dims_identity[2];
  const input_w_identity = input_dims_identity[3];

  if (image.bitmap.height !== input_h_identity && image.bitmap.width !== input_w_identity) {
    image.contain(input_w_identity, input_h_identity);
    image.rotate(pitch);
  }

  let infer_req_identity;
  infer_req_identity = exec_net_identity.createInferRequest();
  const input_blob_identity = infer_req_identity.getBlob(input_info_identity.name());
  const input_data_identity = new Uint8Array(input_blob_identity.wmap());

  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, hdx) {
    let h = Math.floor(hdx / 4) * 3;
    input_data_identity[h + 2] = image.bitmap.data[hdx + 0];  // R
    input_data_identity[h + 1] = image.bitmap.data[hdx + 1];  // G
    input_data_identity[h + 0] = image.bitmap.data[hdx + 2];  // B
  });

  const preProcessInfo = input_info_identity.getPreProcess();
  preProcessInfo.init(3);
  preProcessInfo.setVariant('mean_value');

  input_blob_identity.unmap();

  infer_req_identity.infer();

  const output_blob_identity = infer_req_identity.getBlob(output_info_identity.name());
  const output_data_identity = new Float32Array(output_blob_identity.rmap());

  let returnResults = {
    identified: false,
    confidence: 0,
    image: image
  };

  results = Array.from(output_data_identity);
  if (currentPeople.length > 0) {
    let matchValue = 0;
    let matchIndex = null;

    for (var i = 0; i < currentPeople.length; i++) {
      const newArray = Array.from(currentPeople[i].facialRecMatrix); //.split(',');

      var simout = parseFloat(similarity( results, newArray ));
      if (simout > matchValue) {
        matchValue = simout;
        matchIndex = i;
      }
    }

    if (matchValue > 0.7) {
      returnResults.identified = true;
      returnResults.confidence = matchValue;
      returnResults.index = matchIndex;
      returnResults.newFaceData = results;
    } else {
      returnResults.identified = false;
      returnResults.confidence = matchValue;
      returnResults.newFaceData = results;
    }
  } else {
    returnResults.identified = false;
    returnResults.newFaceData = results;
  }

  return returnResults;
}

module.exports = { getFacialIdentification, identificationEngine };
