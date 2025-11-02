const path = require('path');

module.exports = {
  entry: './script.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, '.'),
    library: {
      type: 'var',
      name: 'germanTTS'
    }
  },
  mode: 'development',
  resolve: {
    fallback: {
      "fs": false,
      "path": false
    }
  },
  target: 'web',
  ignoreWarnings: [
    /Module not found: Error: Can't resolve 'german-noun'/,
  ]
};

