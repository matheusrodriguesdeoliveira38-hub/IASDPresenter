const { readRecoverableFile, writeRecoverableJson } = require('./FileRecovery');

function isUserData(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readUserData(filePath) {
  const data = readRecoverableFile(filePath);
  return isUserData(data) ? data : null;
}

function writeUserData(filePath, data) {
  if (!isUserData(data)) {
    throw new TypeError('Os dados do usuario devem ser um objeto.');
  }

  return writeRecoverableJson(filePath, data);
}

module.exports = { isUserData, readUserData, writeUserData };
