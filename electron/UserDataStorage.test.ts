const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { readUserData, writeUserData } = require('./UserDataStorage');

test('persists liturgy data between application sessions', async (t) => {
  const workspace = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'iasdpresenter-user-data-'));
  t.after(() => fs.promises.rm(workspace, { recursive: true, force: true }));

  const filePath = path.join(workspace, 'user-data.json');
  const data = {
    modules: {
      liturgy: {
        liturgies: {
          saturday: [{ id: 1, type: 'music', name: 'Hino inicial' }],
        },
        dayNotes: { saturday: 'Culto divino' },
        customLiturgies: [],
      },
    },
  };

  writeUserData(filePath, data);
  assert.deepEqual(readUserData(filePath), data);
});

test('rejects invalid root values', async (t) => {
  const workspace = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'iasdpresenter-user-data-'));
  t.after(() => fs.promises.rm(workspace, { recursive: true, force: true }));

  const filePath = path.join(workspace, 'user-data.json');
  assert.throws(() => writeUserData(filePath, []), /devem ser um objeto/);
  assert.equal(readUserData(filePath), null);
});
