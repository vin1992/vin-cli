
const os = require('os');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

const rcPath = path.join(os.homedir(), '.vinrc');

exports.defaultPreset = {
  useConfigFiles: false,
  cssPreprocessor: undefined,
  plugins: {
    'plugin-1': {}
  }
}

exports.defaults = {
  packageManager: 'yarn',
  presets: {
    default: exports.defaultPreset
  }
}

let cachedOptions

exports.loadOptions = () => {
  if (cachedOptions) {
    return cachedOptions
  }

  if (fs.existsSync(rcPath)) {
    try {
      cachedOptions = JSON.parse(fs.readFileSync(rcPath, 'utf-8'));
    } catch (e) {
      console.log(chalk.red(`Error: `, e));
    }
    return cachedOptions;
  } else {
    return {}
  }

}