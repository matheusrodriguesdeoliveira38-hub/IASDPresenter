const fs = require('fs');
const path = require('path');

function defaultParse(content) {
  return JSON.parse(content);
}

function readAndParse(filePath, parse) {
  const content = fs.readFileSync(filePath, 'utf8');
  return { content, data: parse(content) };
}

function replaceFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  try {
    fs.writeFileSync(tempPath, content, 'utf8');
    fs.rmSync(filePath, { force: true });
    fs.renameSync(tempPath, filePath);
  } finally {
    fs.rmSync(tempPath, { force: true });
  }
}

function writeRecoverableFile(filePath, content, options = {}) {
  const parse = options.parse || defaultParse;
  const backupPath = options.backupPath || `${filePath}.bak`;

  // Never replace a valid copy with content that cannot be read back.
  if (options.validate !== false) parse(content);
  if (options.backup !== false) replaceFile(backupPath, content);
  replaceFile(filePath, content);
  return true;
}

function readRecoverableFile(filePath, options = {}) {
  const parse = options.parse || defaultParse;
  const backupPath = options.backupPath || `${filePath}.bak`;
  const logger = options.logger || console;

  try {
    const primary = readAndParse(filePath, parse);

    // Upgrade files created before recovery support and repair a bad backup.
    try {
      readAndParse(backupPath, parse);
    } catch (error) {
      replaceFile(backupPath, primary.content);
    }

    return primary.data;
  } catch (primaryError) {
    try {
      const backup = readAndParse(backupPath, parse);
      replaceFile(filePath, backup.content);
      logger.warn(`[Recovery] Arquivo restaurado automaticamente: ${path.basename(filePath)}`);
      return backup.data;
    } catch (backupError) {
      return null;
    }
  }
}

function writeRecoverableJson(filePath, data, options = {}) {
  const spacing = Object.prototype.hasOwnProperty.call(options, 'spacing') ? options.spacing : 2;
  return writeRecoverableFile(filePath, JSON.stringify(data, null, spacing), options);
}

module.exports = {
  readRecoverableFile,
  writeRecoverableFile,
  writeRecoverableJson,
};
