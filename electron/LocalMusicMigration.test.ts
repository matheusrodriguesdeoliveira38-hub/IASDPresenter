const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { MARKER_FILENAME, migrateLocalMusicLibrary } = require('./LocalMusicMigration');

async function makeWorkspace() {
  return fs.promises.mkdtemp(path.join(os.tmpdir(), 'iasdpresenter-migration-'));
}

test('migrates songs, playbacks, custom audio and the collection manifest', async (t) => {
  const workspace = await makeWorkspace();
  t.after(() => fs.promises.rm(workspace, { recursive: true, force: true }));

  const appDataPath = path.join(workspace, 'AppData');
  const currentUserDataPath = path.join(appDataPath, 'IASDPresenter');
  const legacyUserDataPath = path.join(appDataPath, 'Louvor JA');
  const legacyMusicPath = path.join(legacyUserDataPath, 'Media', 'music');

  await fs.promises.mkdir(path.join(legacyMusicPath, 'albums', '10'), { recursive: true });
  await fs.promises.mkdir(path.join(legacyMusicPath, 'custom'), { recursive: true });
  await fs.promises.mkdir(path.join(legacyUserDataPath, '.sysdata'), { recursive: true });
  await fs.promises.writeFile(path.join(legacyMusicPath, 'albums', '10', 'song.mp3'), 'audio');
  await fs.promises.writeFile(path.join(legacyMusicPath, 'albums', '10', 'playback.mp3'), 'playback');
  await fs.promises.writeFile(path.join(legacyMusicPath, 'custom', 'mine.mp3'), 'custom');
  await fs.promises.writeFile(path.join(legacyUserDataPath, '.sysdata', 'downloaded_albums.bin'), 'manifest');

  const result = await migrateLocalMusicLibrary({ appDataPath, currentUserDataPath });

  assert.equal(result.migrated, true);
  assert.equal(result.copiedFiles, 4);
  assert.equal(
    await fs.promises.readFile(path.join(currentUserDataPath, 'Media', 'music', 'albums', '10', 'playback.mp3'), 'utf8'),
    'playback',
  );
  assert.equal(
    await fs.promises.readFile(path.join(currentUserDataPath, '.sysdata', 'downloaded_albums.bin'), 'utf8'),
    'manifest',
  );
  assert.equal(fs.existsSync(path.join(currentUserDataPath, MARKER_FILENAME)), true);
});

test('keeps an existing destination file and only runs once', async (t) => {
  const workspace = await makeWorkspace();
  t.after(() => fs.promises.rm(workspace, { recursive: true, force: true }));

  const appDataPath = path.join(workspace, 'AppData');
  const currentUserDataPath = path.join(appDataPath, 'IASDPresenter');
  const legacyFile = path.join(appDataPath, 'Louvor JA', 'Media', 'music', 'song.mp3');
  const currentFile = path.join(currentUserDataPath, 'Media', 'music', 'song.mp3');
  await fs.promises.mkdir(path.dirname(legacyFile), { recursive: true });
  await fs.promises.mkdir(path.dirname(currentFile), { recursive: true });
  await fs.promises.writeFile(legacyFile, 'old');
  await fs.promises.writeFile(currentFile, 'new');

  const first = await migrateLocalMusicLibrary({ appDataPath, currentUserDataPath });
  const second = await migrateLocalMusicLibrary({ appDataPath, currentUserDataPath });

  assert.equal(first.copiedFiles, 0);
  assert.equal(first.skippedFiles, 1);
  assert.equal(second.alreadyCompleted, true);
  assert.equal(await fs.promises.readFile(currentFile, 'utf8'), 'new');
});

test('replaces an invalid marker and retries the migration', async (t) => {
  const workspace = await makeWorkspace();
  t.after(() => fs.promises.rm(workspace, { recursive: true, force: true }));

  const appDataPath = path.join(workspace, 'AppData');
  const currentUserDataPath = path.join(appDataPath, 'IASDPresenter');
  const legacyMusicPath = path.join(appDataPath, 'Louvor JA', 'Media', 'music');
  await fs.promises.mkdir(legacyMusicPath, { recursive: true });
  await fs.promises.writeFile(path.join(legacyMusicPath, 'song.mp3'), 'audio');
  await fs.promises.mkdir(currentUserDataPath, { recursive: true });
  await fs.promises.mkdir(path.join(currentUserDataPath, MARKER_FILENAME));

  const result = await migrateLocalMusicLibrary({ appDataPath, currentUserDataPath });

  assert.equal(result.migrated, true);
  assert.equal(fs.statSync(path.join(currentUserDataPath, MARKER_FILENAME)).isFile(), true);
});
