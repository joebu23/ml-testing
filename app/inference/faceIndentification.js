const { Core, getVersion } = require('inference-engine-node');

const jimp = require('jimp');
const fs = require('fs').promises;
const { performance } = require('perf_hooks');
const { binPathFromXML } = require('../common/index.js');
const uuid = require('uuid');

const { getRedis, getAllIdentities, saveValue } = require('../common/redis.js');

const similarity = require('compute-cosine-similarity');
const res = require('express/lib/response');

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
  await getRedis();
  
	core_identity = new Core();
	model_identity = '../models/face-reidentification-retail-0095/FP32/face-reidentification-retail-0095.xml';
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


async function getFacialIdentification(img, pose) {
  var results = [];

  var resultsObj = {
    vect: identities
  };
    // identities = await getAllIdentities();
  
    const image = img.img;

    const agImage = await jimp.read(image);

    const input_dims_identity = input_info_identity.getDims();
    const input_h_identity = input_dims_identity[2];
    const input_w_identity = input_dims_identity[3];

    // MAKE A COPY OF THE FACE IMAGE TO SCALE

    if (agImage.bitmap.height !== input_h_identity &&
      agImage.bitmap.width !== input_w_identity) {
      agImage.contain(input_w_identity, input_h_identity);
      agImage.rotate(pose.pitch);
    }

    // agImage.write('./outputs/ident.jpg');

  let infer_req_identity;
  // let infer_time_identity = [];
  infer_req_identity = exec_net_identity.createInferRequest();
  const input_blob_identity = infer_req_identity.getBlob(input_info_identity.name());
  // const input_data_identity = new Uint8Array(input_blob_identity.wmap());

  input_info_identity.setLayout('nhwc');

  // const rgb = {r: 2, g: 1, b: 0};
  // const preprocess =
  //     !(mean[0] === 0 && mean[1] === 0 && mean[2] === 0 && std[0] === 1 &&
  //       std[1] === 1 && std[2] === 1);
  const preProcessInfo = input_info_identity.getPreProcess();
  preProcessInfo.init(3);
  // preProcessInfo.getPreProcessChannel(rgb.r).stdScale = std[rgb.r];
  // preProcessInfo.getPreProcessChannel(rgb.g).stdScale = std[rgb.g];
  // preProcessInfo.getPreProcessChannel(rgb.b).stdScale = std[rgb.b];

  // preProcessInfo.getPreProcessChannel(rgb.r).meanValue = mean[rgb.r];
  // preProcessInfo.getPreProcessChannel(rgb.g).meanValue = mean[rgb.g];
  // preProcessInfo.getPreProcessChannel(rgb.b).meanValue = mean[rgb.b];
  preProcessInfo.setVariant('mean_value');

  // agImage.scan(0, 0, agImage.bitmap.width, agImage.bitmap.height, function (x, y, hdx) {
  //   let h = Math.floor(hdx / 4) * 3;
  //   input_data_identity[h + 2] = agImage.bitmap.data[hdx + 0];  // R
  //   input_data_identity[h + 1] = agImage.bitmap.data[hdx + 1];  // G
  //   input_data_identity[h + 0] = agImage.bitmap.data[hdx + 2];  // B
  // });

  input_blob_identity.unmap();

  infer_req_identity.infer();

  const output_blob_identity = infer_req_identity.getBlob(output_info_identity.name());
  const output_data_identity = new Float32Array(output_blob_identity.rmap());

  // output_data_identity.forEach((data, i) => {
  //   data = parseInt(data * 100);
  //   output_data_identity[i] = data;
  // });

  results = Array.from(output_data_identity);

  if (identities.length > 0) {
    console.log('face count: ' + identities.length)
    for (var i = 0; i < identities.length; i++) {
      const newArray = Array.from(identities[i]); //.split(',');

      var simout = parseFloat(similarity( results, newArray ));
      if (simout > 0.6) {
        return {
          identified: true,
          confidence: simout
        };
      } else {
        identities.push(results);
        await saveValue(uuid.v4(), results);
        return { 
          identified: false,
          confidence: simout
        };
      }
    }
  } else {
    identities.push(results);
    await saveValue(uuid.v4(), results);
    return { 
      identified: false,
      confidence: 0
    };
  }
}

module.exports = { getFacialIdentification, identificationEngine };
