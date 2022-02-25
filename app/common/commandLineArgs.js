const option_definitions = [
    {
      name: 'help',
      alias: 'h',
      type: Boolean,
      description: 'Show this help message and exit.'
    },
    {
      name: 'model',
      alias: 'm',
      type: String,
      description: 'Optional. Path to an .xml file with a trained model.'
    },
    {
      name: 'image',
      alias: 'i',
      type: String,
      description: 'Required. Path to an image file.'
    },
    {
      name: 'labels',
      alias: 'l',
      type: String,
      description: 'Optional. Path to a label file.'
    },
    {
      name: 'device',
      alias: 'd',
      type: String,
      defaultValue: 'CPU',
      description: 'Optional. Specify the target device to infer on ' +
          '(the list of available devices is shown below). ' +
          'Default value is CPU.'
    },
    {
      name: 'iterations',
      alias: 'n',
      type: Number,
      defaultValue: 1,
      description: 'Optional. The number of iterations for inference. ' +
          'Default value is 1.'
    },
    {
      name: 'topk',
      alias: 'k',
      type: Number,
      defaultValue: 5,
      description: 'Optional. The number of top results to show. ' +
          'Default value is 5.'
    },
    {
      name: 'sync',
      alias: 's',
      type: Boolean,
      defaultValue: false,
      description:
          'Optional. Specify to inference synchronously or asynchronously. ' +
          'Default value is false.'
    },
    {
      name: 'mean',
      type: String,
      defaultValue: '[0,0,0]',
      description: 'Optional. Specify the mean value for input channels. ' +
          'Default value is "[0,0,0]"'
    },
    {
      name: 'std',
      type: String,
      defaultValue: '[1,1,1]',
      description: 'Optional. Specify the std scale value for input channels. ' +
          'Default value is "[1,1,1]"'
    },
    {
      name: 'color',
      type: String,
      defaultValue: 'bgr',
      description:
          'Optional. Specify the color format for input, "bgr" or "rgb". ' +
          'Default value is "bgr"'
    }
  ];

  module.exports = { option_definitions };