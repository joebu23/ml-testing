const {Core,postProcessing} = require('inference-engine-node');
const fs = require('fs');

const {
  binPathFromXML,
  classification,
  showAvailableDevices,
  warning,
  showBreakLine,
  showVersion,
  highlight,
  showInputOutputInfo,
  showPluginVersions,
  labelsPathFromXML
} = require('../common/index.js');

async function getInference(device, image, model, labels, top) {
    const core = new Core();


    const model_path = model;
    const bin_path = binPathFromXML(model_path);
    // const labels_path = labelsPathFromXML(model_path);
    const device_name = device;
    const top_k = top;

    const iterations = 5;
    const mean = [0,0,0];
    const std = [1,1,1];

    let net = await core.readNetwork(model_path, bin_path);

    const inputs_info = net.getInputsInfo();
    const outputs_info = net.getOutputsInfo();
    const input_info = inputs_info[0];
    input_info.setLayout('nhwc');

    const rgb = {r: 2, g: 1, b: 0};
    const preProcessInfo = input_info.getPreProcess();
    preProcessInfo.init(3);
    preProcessInfo.getPreProcessChannel(rgb.r).stdScale = std[rgb.r];
    preProcessInfo.getPreProcessChannel(rgb.g).stdScale = std[rgb.g];
    preProcessInfo.getPreProcessChannel(rgb.b).stdScale = std[rgb.b];

    preProcessInfo.getPreProcessChannel(rgb.r).meanValue = mean[rgb.r];
    preProcessInfo.getPreProcessChannel(rgb.g).meanValue = mean[rgb.g];
    preProcessInfo.getPreProcessChannel(rgb.b).meanValue = mean[rgb.b];
    preProcessInfo.setVariant('mean_value');

    const output_info = outputs_info[0];

    const input_dims = input_info.getDims();
    const input_height = input_dims[2];
    const input_width = input_dims[3];
    if (image.bitmap.height !== input_height || image.bitmap.width !== input_width) {
        image.resize(input_width, input_height, 'bilinearInterpolation');
    }

    const exec_net = await core.loadNetwork(net, device_name);

    let infer_req;

    for (let i = 0; i < iterations; i++) {
        infer_req = exec_net.createInferRequest();

        const input_blob = infer_req.getBlob(input_info.name());
        const input_data = new Float32Array(input_blob.wmap());

        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
            // Convert from RGBA to BGR (IE default)
            let i = Math.floor(idx / 4) * 3;
            input_data[i + rgb.r] = image.bitmap.data[idx + 0];  // R
            input_data[i + rgb.g] = image.bitmap.data[idx + 1];  // G
            input_data[i + rgb.b] = image.bitmap.data[idx + 2];  // B
        });
        input_blob.unmap();

        start_time = performance.now();

        await infer_req.startAsync();
    }

    // let labels = undefined;

    // try {
    //     const data = await fs.readFile(labels_path, {encoding: 'utf-8'});
    //     labels = data.split('\n');
    // } catch (error) {
    //     warning(error);
    // }

    const output_blob = infer_req.getBlob(output_info.name());
    const output_data = new Float32Array(output_blob.rmap());
    const results =
    postProcessing.topClassificationResults(output_data, labels, top_k);
    output_blob.unmap();
    //   console.log(`The top ${top_k} results:`);
    //   classification.showResults(results);
    return results;
}

module.exports = { getInference };