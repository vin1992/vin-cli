const fs = require('fs-extra')
const path = require('path')

async function deletePreviousFiles(dir, newFiles, previousFiles) {
  const filesToDeleted = Object.keys(previousFiles).filter(fileName => !newFiles[fileName]);

  if (filesToDeleted && filesToDeleted.length > 0) {
    return Promise.all(filesToDeleted.map(file => {
      return fs.unlink(path.join(dir, file))
    }))
  }
}

module.exports = async function writeFileTree(dir, files, previousFiles) {
  if (previousFiles) {
    await deletePreviousFiles(dir, files, previousFiles)
  }

  Object.keys(files).forEach((name) => {
    const filePath = path.join(dir, name)
    fs.ensureDirSync(path.dirname(filePath))
    fs.writeFileSync(filePath, files[name])
  })
}
