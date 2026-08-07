const fs = require('fs');
const path = require('path');

const MIGRATION_VERSION = 1;
const MARKER_FILENAME = `.music-library-migration-v${MIGRATION_VERSION}.json`;

function isUsableFile(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile() && stats.size > 0;
  } catch (error) {
    return false;
  }
}

function uniquePaths(paths) {
  const seen = new Set();
  return paths.filter((candidate) => {
    const normalized = path.resolve(candidate).toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function getLegacyUserDataPaths(appDataPath, currentUserDataPath) {
  const current = path.resolve(currentUserDataPath).toLowerCase();
  return uniquePaths([
    path.join(appDataPath, 'Louvor JA'),
    path.join(appDataPath, 'LouvorJA'),
    path.join(appDataPath, 'louvorja'),
  ]).filter(candidate => path.resolve(candidate).toLowerCase() !== current);
}

async function copyFileIfNeeded(sourcePath, destinationPath, summary) {
  if (!isUsableFile(sourcePath)) return;
  if (isUsableFile(destinationPath)) {
    summary.skippedFiles += 1;
    return;
  }

  await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
  const temporaryPath = `${destinationPath}.migration-${process.pid}-${Date.now()}`;

  try {
    await fs.promises.copyFile(sourcePath, temporaryPath);
    if (!isUsableFile(temporaryPath)) throw new Error(`A copia ficou vazia: ${sourcePath}`);

    if (isUsableFile(destinationPath)) {
      summary.skippedFiles += 1;
      return;
    }

    await fs.promises.rm(destinationPath, { force: true });
    await fs.promises.rename(temporaryPath, destinationPath);
    summary.copiedFiles += 1;
    summary.copiedBytes += fs.statSync(destinationPath).size;
  } finally {
    await fs.promises.rm(temporaryPath, { force: true }).catch(() => {});
  }
}

async function copyDirectoryContents(sourceDir, destinationDir, summary) {
  let entries;
  try {
    entries = await fs.promises.readdir(sourceDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  summary.foundLegacyLibrary = true;
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);
    if (entry.isDirectory()) {
      await copyDirectoryContents(sourcePath, destinationPath, summary);
    } else if (entry.isFile()) {
      await copyFileIfNeeded(sourcePath, destinationPath, summary);
    }
  }
}

async function migrateLocalMusicLibrary({ appDataPath, currentUserDataPath, logger = console }) {
  const markerPath = path.join(currentUserDataPath, MARKER_FILENAME);
  try {
    const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    if (marker.version === MIGRATION_VERSION && marker.completedAt) {
      return { migrated: false, alreadyCompleted: true };
    }
  } catch (error) {
    // Missing or invalid markers are retried and replaced after a successful migration.
    fs.rmSync(markerPath, { recursive: true, force: true });
  }

  const summary = {
    version: MIGRATION_VERSION,
    migrated: false,
    foundLegacyLibrary: false,
    copiedFiles: 0,
    copiedBytes: 0,
    skippedFiles: 0,
    completedAt: null,
  };

  try {
    const legacyUserDataPaths = getLegacyUserDataPaths(appDataPath, currentUserDataPath);
    for (const legacyUserDataPath of legacyUserDataPaths) {
      for (const legacyMusicPath of [
        path.join(legacyUserDataPath, 'Media', 'music'),
        path.join(legacyUserDataPath, 'Media', 'musics'),
        path.join(legacyUserDataPath, 'musics'),
      ]) {
        await copyDirectoryContents(legacyMusicPath, path.join(currentUserDataPath, 'Media', 'music'), summary);
      }

      for (const manifestName of ['downloaded_albums.bin', 'downloaded_albums']) {
        await copyFileIfNeeded(
          path.join(legacyUserDataPath, '.sysdata', manifestName),
          path.join(currentUserDataPath, '.sysdata', manifestName),
          summary,
        );
      }
    }

    summary.migrated = summary.copiedFiles > 0;
    summary.completedAt = new Date().toISOString();
    await fs.promises.mkdir(currentUserDataPath, { recursive: true });
    await fs.promises.writeFile(markerPath, JSON.stringify(summary, null, 2), 'utf8');

    if (summary.migrated) {
      logger.info(`[LibraryMigration] ${summary.copiedFiles} arquivo(s) da biblioteca anterior foram recuperados.`);
    }
    return summary;
  } catch (error) {
    logger.warn('[LibraryMigration] A migracao sera tentada novamente:', error.message);
    return { ...summary, error: error.message };
  }
}

module.exports = { MARKER_FILENAME, getLegacyUserDataPaths, migrateLocalMusicLibrary };
