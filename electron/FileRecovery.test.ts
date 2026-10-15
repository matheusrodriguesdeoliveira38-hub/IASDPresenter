const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("node:vm");

const {
  readRecoverableFile,
  writeRecoverableFile,
  writeRecoverableJson,
} = require("./FileRecovery");

function withTempDir(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "iasdpresenter-recovery-"));
  try {
    run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("restores a deleted JSON file from its backup", () => withTempDir((dir) => {
  const filePath = path.join(dir, "config.json");
  writeRecoverableJson(filePath, { enabled: true });
  fs.unlinkSync(filePath);

  assert.deepEqual(readRecoverableFile(filePath), { enabled: true });
  assert.deepEqual(JSON.parse(fs.readFileSync(filePath, "utf8")), { enabled: true });
}));

test("restores a corrupted file from its backup", () => withTempDir((dir) => {
  const filePath = path.join(dir, "database.bin");
  writeRecoverableFile(filePath, JSON.stringify({ songs: [1, 2] }));
  fs.writeFileSync(filePath, "{invalid", "utf8");

  assert.deepEqual(readRecoverableFile(filePath), { songs: [1, 2] });
  assert.deepEqual(JSON.parse(fs.readFileSync(filePath, "utf8")), { songs: [1, 2] });
}));

test("creates a backup for a valid legacy file on first read", () => withTempDir((dir) => {
  const filePath = path.join(dir, "legacy.json");
  fs.writeFileSync(filePath, JSON.stringify({ version: 1 }), "utf8");

  assert.deepEqual(readRecoverableFile(filePath), { version: 1 });
  assert.equal(fs.existsSync(`${filePath}.bak`), true);
}));

test("does not overwrite valid copies with invalid content", () => withTempDir((dir) => {
  const filePath = path.join(dir, "config.json");
  writeRecoverableJson(filePath, { valid: true });

  assert.throws(() => writeRecoverableFile(filePath, "invalid json"));
  assert.deepEqual(readRecoverableFile(filePath), { valid: true });
}));

function readWithFailedWrites(files) {
  const warnings = [];
  const context = {
    module: { exports: {} as { readRecoverableFile?: typeof readRecoverableFile } }, exports: {}, process, Date,
    require(name) {
      if (name !== "fs") return require(name);
      return {
        readFileSync(filePath) {
          if (!(filePath in files)) throw new Error("Missing file");
          return files[filePath];
        },
        mkdirSync() {},
        writeFileSync() { throw new Error("Disk full or permission denied"); },
        rmSync() {},
      };
    },
    console: { warn: (...args) => warnings.push(args) },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "FileRecovery.js"), "utf8"), context);
  const data = context.module.exports.readRecoverableFile("config.json");
  return { data: JSON.parse(JSON.stringify(data)), warnings };
}

test("keeps valid primary data when a missing or corrupt backup cannot be repaired", () => {
  for (const backup of [undefined, "invalid"]) {
    const files = { "config.json": '{"version":2}' };
    if (backup !== undefined) files["config.json.bak"] = backup;
    const result = readWithFailedWrites(files);
    assert.deepEqual(result.data, { version: 2 });
    assert.equal(result.warnings.length, 1);
    assert.equal(files["config.json"], '{"version":2}');
  }
});

test("returns valid backup data even when the primary file cannot be restored", () => {
  for (const primary of [undefined, "invalid"]) {
    const files = { "config.json.bak": '{"version":1}' };
    if (primary !== undefined) files["config.json"] = primary;
    const result = readWithFailedWrites(files);
    assert.deepEqual(result.data, { version: 1 });
    assert.equal(result.warnings.length, 1);
    assert.equal(files["config.json.bak"], '{"version":1}');
  }
});

test("returns null when neither copy contains readable data", () => {
  assert.equal(readWithFailedWrites({ "config.json": "invalid", "config.json.bak": "invalid" }).data, null);
});
