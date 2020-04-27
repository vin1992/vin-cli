const { execSync } = require('child_process');

exports.hasYarn = () => {
  try {
    execSync('yarn --version', { stdio: 'ignore' });
    return true
  } catch (e) {
    return false
  }
}