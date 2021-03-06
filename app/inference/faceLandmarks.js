const { Core } = require('inference-engine-node');

const jimp = require('jimp');
const { binPathFromXML } = require('../common/index.js');

var core_face,
    model_face,
    bin_path_face,
    net_face,
    inputs_info_face,
    outputs_info_face,
    input_info_face,
    output_info_face,
    exec_net_face,
    input_dims_face,
    input_info_face_name,
    output_info_face_name;

async function facialLandmarksEngine(device_name) {
	core_face = new Core();
	model_face = '/home/joe/Source/models/landmarks-regression-retail-0009/FP32/landmarks-regression-retail-0009.xml';
	bin_path_face = binPathFromXML(model_face);
	net_face = await core_face.readNetwork(model_face, bin_path_face);
	inputs_info_face = net_face.getInputsInfo();
	outputs_info_face = net_face.getOutputsInfo();
	input_info_face = inputs_info_face[0];
	output_info_face = outputs_info_face[0];
	input_info_face.setLayout('nhwc');
	input_info_face.setPrecision('u8');
	exec_net_face = await core_face.loadNetwork(net_face, device_name);
	input_dims_face = input_info_face.getDims();
	input_info_face_name = input_info_face.name();
	output_info_face_name = output_info_face.name();
}


async function getFacialLandmarks(img) {

var results = [];

var resultsObj = {
  leftEye: [],
  rightEye: [],
  tipOfNose: [],
  leftLip: [],
  rightLip: []
};

    const image = img;

    const agImage = await jimp.read(image);

    const input_dims_face = input_info_face.getDims();
    const input_h_face = input_dims_face[2];
    const input_w_face = input_dims_face[3];

    // MAKE A COPY OF THE FACE IMAGE TO SCALE

    if (agImage.bitmap.height !== input_h_face &&
    agImage.bitmap.width !== input_w_face) {
    agImage.contain(input_w_face, input_h_face);
    }

  // START EMOTIONAL ESTIMATION
  let infer_req_face;
  let infer_time_face = [];
  infer_req_face = exec_net_face.createInferRequest();
  const input_blob_face = infer_req_face.getBlob(input_info_face.name());
  const input_data_face = new Uint8Array(input_blob_face.wmap());

  agImage.scan(0, 0, agImage.bitmap.width, agImage.bitmap.height, function (x, y, hdx) {
    let h = Math.floor(hdx / 4) * 3;
    input_data_face[h + 2] = agImage.bitmap.data[hdx + 0];  // R
    input_data_face[h + 1] = agImage.bitmap.data[hdx + 1];  // G
    input_data_face[h + 0] = agImage.bitmap.data[hdx + 2];  // B
  });

  input_blob_face.unmap();

  infer_req_face.infer();

  const output_blob_face = infer_req_face.getBlob(output_info_face.name());
  const output_data_face = new Float32Array(output_blob_face.rmap());
//  console.table(output_data_face);

  results = output_data_face;

  resultsObj.leftEye = { x: results[0], y: results[1] };
  resultsObj.rightEye = { x: results[2], y: results[3] };
  resultsObj.tipOfNose = { x: results[4], y: results[5] };
  resultsObj.leftLip = { x: results[6], y: results[7] };
  resultsObj.rightLip = { x: results[8], y: results[9] };

  return resultsObj;
}

module.exports = { getFacialLandmarks, facialLandmarksEngine };
