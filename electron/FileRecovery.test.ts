const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  readRecoverableFile,
  writeRecoverableFile,
  writeRecoverableJson,
} = require('./FileRecovery');

function withTempDir(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iasdpresenter-recovery-'));
  try {
    run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('restores a deleted JSON file from its backup', () => withTempDir((dir) => {
  const filePath = path.join(dir, 'config.json');
  writeRecoverableJson(filePath, { enabled: true });
  fs.unlinkSync(filePath);

  assert.deepEqual(readRecoverableFile(filePath), { enabled: true });
  assert.deepEqual(JSON.parse(fs.readFileSync(filePath, 'utf8')), { enabled: true });
}));

test('restores a corrupted file from its backup', () => withTempDir((dir) => {
  const filePath = path.join(dir, 'database.bin');
  writeRecoverableFile(filePath, JSON.stringify({ songs: [1, 2] }));
  fs.writeFileSync(filePath, '{invalid', 'utf8');

  assert.deepEqual(readRecoverableFile(filePath), { songs: [1, 2] });
  assert.deepEqual(JSON.parse(fs.readFileSync(filePath, 'utf8')), { songs: [1, 2] });
}));

test('creates a backup for a valid legacy file on first read', () => withTempDir((dir) => {
  const filePath = path.join(dir, 'legacy.json');
  fs.writeFileSync(filePath, JSON.stringify({ version: 1 }), 'utf8');

  assert.deepEqual(readRecoverableFile(filePath), { version: 1 });
  assert.equal(fs.existsSync(`${filePath}.bak`), true);
}));

test('does not overwrite valid copies with invalid content', () => withTempDir((dir) => {
  const filePath = path.join(dir, 'config.json');
  writeRecoverableJson(filePath, { valid: true });

  assert.throws(() => writeRecoverableFile(filePath, 'invalid json'));
  assert.deepEqual(readRecoverableFile(filePath), { valid: true });
}));
