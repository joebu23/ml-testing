const { Core, getVersion } = require('inference-engine-node');

const jimp = require('jimp');
const fs = require('fs').promises;
const { performance } = require('perf_hooks');
const { binPathFromXML } = require('../common/index.js');
const uuid = require('uuid');

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


async function identificationEngine(device_name) {
	core_identity = new Core();
	model_identity = '/home/joe/Source/models/face-reidentification-retail-0095/FP32/face-reidentification-retail-0095.xml';
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


async function getFacialIdentification(img) {
  var results = [];

  var resultsObj = {
    vect: identities
  };

  const image = img.img;
  const agImage = await jimp.read({ data: Buffer.from(image.bitmap.data.data), width: image.bitmap.width, height: image.bitmap.height });

  const input_dims_identity = input_info_identity.getDims();
  const input_h_identity = input_dims_identity[2];
  const input_w_identity = input_dims_identity[3];

  if (agImage.bitmap.height !== input_h_identity &&
    agImage.bitmap.width !== input_w_identity) {
    agImage.contain(input_w_identity, input_h_identity);
  }

  let infer_req_identity;
  infer_req_identity = exec_net_identity.createInferRequest();
  const input_blob_identity = infer_req_identity.getBlob(input_info_identity.name());

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
    image: agImage
  };

  results = Array.from(output_data_identity);
  if (identities.length > 0) {
    console.log('face count: ' + identities.length)
    for (var i = 0; i < identities.length; i++) {
      const newArray = Array.from(identities[i]); //.split(',');

      var simout = parseFloat(similarity( results, newArray ));
      if (simout > 0.6) {
        returnResults.identified = true;
        returnResults.confidence = simout;
      } else {
        identities.push(results);
        returnResults.confidence = simout;
      }
    }
  } else {
    identities.push(results);
  }

  return returnResults;
}

module.exports = { getFacialIdentification, identificationEngine };

// const bull = require('bull');
// const queue = new bull("found_faces", 'redis://192.168.86.24');

// queue.process(async (job, done) => {
//   await identificationEngine('CPU');
//   console.log(job);
//   if (job.data) {
//     const results = await getFacialIdentification(job.data.face);
//     console.log(results);
//   }
//   done();
// });
