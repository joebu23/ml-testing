'use strict'

import inferencePkg from 'inference-engine-node';
const {Core, postProcessing} = inferencePkg;
import jimp from 'jimp';

class BaseInference {
  constructor(device, model) {
    this.core = new Core();

    var xmlExtensionPattern = /\.xml$/g;

    this.model_path = model;
    this.device_name = device;
    this.bin_path = this.model_path.replace(xmlExtensionPattern, '.bin');
    this.labels_path = "";
  }

  showResults(results) {
    console.log('id of class'.padEnd(10) + 'probability'.padEnd(15) + 'label');
    const header = '-------';
    console.log(header.padEnd(10) + header.padEnd(15) + header);
    results.forEach(result => {
      console.log(result.id.padEnd(10) + result.prob.padEnd(15) + result.label);
    })
  }
  
  async runInference(imageData, labelsArray) {
    // setup Core and load model
    this.net = await this.core.readNetwork(this.model_path, this.bin_path);
    this.exec_net = await this.core.loadNetwork(this.net, this.device_name);

    const iterations = 5;
    const mean = [0,0,0];
    const std = [1,1,1];
  
    const inputs_info = this.net.getInputsInfo();
    const outputs_info = this.net.getOutputsInfo();
  
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
    
    const image_path = Buffer.from(imageData,'base64');
    const image = await jimp.read(image_path).then((image2) => {

      if (image2.bitmap.height !== input_height || image2.bitmap.width !== input_width)
      {
        image2.background(0xFFFFFFFF);
        image2.contain(image2.bitmap.width, image2.bitmap.height);
        image2.resize(input_width, input_height, jimp.RESIZE_BILINEAR);
      }

      return image2;
    });

    let infer_req;
  
    for (let i = 0; i < iterations; i++) {
      // start_time = performance.now();
      infer_req = this.exec_net.createInferRequest();
  
      const input_blob = infer_req.getBlob(input_info.name());
      const input_data = new Float32Array(input_blob.wmap());
  
      image.scan(
          0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
            // Convert from RGBA to BGR (IE default)
            let i = Math.floor(idx / 4) * 3;
            input_data[i + rgb.r] = image.bitmap.data[idx + 0];  // R
            input_data[i + rgb.g] = image.bitmap.data[idx + 1];  // G
            input_data[i + rgb.b] = image.bitmap.data[idx + 2];  // B
          });
      input_blob.unmap();
  
      await infer_req.startAsync();
    }
  
    const output_blob = infer_req.getBlob(output_info.name());
    const output_data = new Float32Array(output_blob.rmap());
    
    return { data: output_data, img: image};
    // const results =
    //     postProcessing.topClassificationResults(output_data, labelsArray, 2);
    // output_blob.unmap();
    // this.showResults(results);
    // return results;
  }
}

export default BaseInference;