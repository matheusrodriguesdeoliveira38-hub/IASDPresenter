// Node 22.18+ / 24: no Electron runtime or native addon rebuild required.
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const DbExtractor = require('../electron/DbExtractor.ts');

function bucketFor(key) {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return String(hash % 64).padStart(2, '0');
}

async function exportLibrary() {
  const root = path.resolve(__dirname, '..');
  const output = path.join(root, 'tmp', 'chromeos-library');
  fs.mkdirSync(output, { recursive: true });
  const buckets = new Map();
  const extractor = new DbExtractor(path.join(root, 'resources', 'database.db'), 'pt', 'pt', {
    directory: output,
    openDatabase: file => new DatabaseSync(file, { readOnly: true }),
    writeJson(key, data) {
      const bucket = bucketFor(key);
      if (!buckets.has(bucket)) buckets.set(bucket, {});
      buckets.get(bucket)[key] = data;
    },
  });
  await extractor.extract();
  const digest = crypto.createHash('sha256');
  let records = 0;
  let bytes = 0;
  for (const [bucket, entries] of [...buckets].sort()) {
    const json = JSON.stringify(entries);
    fs.writeFileSync(path.join(output, `${bucket}.json`), json);
    digest.update(bucket).update(json);
    records += Object.keys(entries).length;
    bytes += Buffer.byteLength(json);
  }
  const manifest = { version: digest.digest('hex').slice(0, 16), language: 'pt', records, bytes, buckets: [...buckets.keys()].sort() };
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest));
  console.log(`Biblioteca web: ${records} registros, ${(bytes / 1024 / 1024).toFixed(1)} MB, português.`);
  return manifest;
}

module.exports = { exportLibrary, bucketFor };
if (require.main === module) exportLibrary().catch(error => { console.error(error); process.exitCode = 1; });
