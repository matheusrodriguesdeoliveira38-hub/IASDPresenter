const { app, BrowserWindow, Menu, ipcMain, protocol, net, dialog, shell, globalShortcut, session } = require('electron');
const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');
const crypto = require('crypto');
const http = require('http');
const os = require('os');
const QRCode = require('qrcode');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');
const DbExtractor = require('./DbExtractor');
const { migrateLocalMusicLibrary } = require('./LocalMusicMigration');
const { readUserData, writeUserData } = require('./UserDataStorage');
const { normalizeSmartSearchText, smartTokenScore } = require('./SmartSearch');
const {
  readRecoverableFile,
  writeRecoverableFile,
  writeRecoverableJson,
} = require('./FileRecovery');
const ftp = require('basic-ftp');

// Chave estática para ofuscação (não é segurança alta, apenas ofuscação)
const ENCRYPTION_KEY = Buffer.from('v389s8dkj238910s8a7d3h2j1k9s8d7f', 'utf8');
const IV_LENGTH = 16;

function encryptData(text) {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (e) {
    console.error('Erro ao ofuscar dados', e);
    return null;
  }
}

function decryptData(text) {
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) return null;
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = Buffer.from(textParts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error('Erro ao desofuscar dados', e);
    return null;
  }
}

app.setName('IASDPresenter');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-popup-blocking');

const userDataPath = app.getPath('userData');
const sysDbPath = path.join(userDataPath, '.sysdata');
const oldDbPath = path.join(userDataPath, 'database');
const mediaPath = path.join(userDataPath, 'Media');
const coversPath = path.join(mediaPath, 'covers');
const musicPath = path.join(mediaPath, 'music');
const slidesPath = path.join(mediaPath, 'images');
const backgroundsPath = path.join(mediaPath, 'backgrounds');
const presentationsPath = path.join(userDataPath, 'Presentations');
const mediaFolders = {
  covers: coversPath,
  music: musicPath,
  slides: slidesPath,
};
let presentationShortcutsEnabled = false;
let mainAppWindow = null;
let remoteControlServer = null;
let remoteControlState = {
  revision: 0,
  updatedAt: null,
  connected: false,
  projection: { active: false, module: '', override: 'none' },
  current: null,
  next: null,
  playback: { paused: true, progress: 0, currentTime: 0, duration: 0 },
};
let remoteCommandLockUntil = 0;
const recentRemoteCommandIds = new Map();
let productionAppServer = null;
let productionAppUrl = null;
const remoteControlConfigPath = path.join(userDataPath, 'remote-control.json');
const automationConfigPath = path.join(userDataPath, 'automation-config.json');
const performanceConfigPath = path.join(userDataPath, 'performance-config.json');
const firstBootLogPath = path.join(userDataPath, 'first-boot-error.log');
const userPreferencesPath = path.join(userDataPath, 'user-data.json');
const supportedDatabaseLanguages = new Set(['pt', 'en', 'es']);

function normalizeDatabaseLanguage(language) {
  const normalized = String(language || 'pt').trim().toLowerCase().split(/[-_]/)[0];
  return supportedDatabaseLanguages.has(normalized) ? normalized : 'pt';
}

function getDatabaseSourceLanguage(language = 'pt') {
  const locale = normalizeDatabaseLanguage(language);
  return locale === 'en' ? 'pt' : locale;
}

function getRequiredLocalDbFiles(language = 'pt') {
  const locale = normalizeDatabaseLanguage(language);
  return [
    'config',
    `${locale}_categories`,
    `${locale}_musics`,
    `${locale}_bible_book`,
    `${locale}_bible_version`,
  ];
}
const defaultRemoteControlConfig = {
  enabled: true,
  host: '0.0.0.0',
  port: Number(process.env.LOUVORJA_REMOTE_PORT || 1975),
  password: '',
  requirePassword: false,
};
let remoteControlConfig = loadRemoteControlConfig();
let performanceConfig = loadPerformanceConfig();
let automationConfig = loadAutomationConfig();
const soundcraftConnections = new Map();
const pendingAutomationRestores = [];

function sanitizePerformanceConfig(config = {}) {
  return {
    lightMode: config.lightMode === true,
    disableHardwareAcceleration: config.disableHardwareAcceleration === true,
  };
}

function loadPerformanceConfig() {
  const saved = readRecoverableFile(performanceConfigPath);
  if (saved) return sanitizePerformanceConfig(saved);

  return sanitizePerformanceConfig();
}

function savePerformanceConfig(config = {}) {
  performanceConfig = sanitizePerformanceConfig({ ...performanceConfig, ...config });
  writeRecoverableJson(performanceConfigPath, performanceConfig);
  return performanceConfig;
}

if (performanceConfig.disableHardwareAcceleration) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
}

function writeFirstBootErrorLog(context, error) {
  try {
    const details = [
      `[${new Date().toISOString()}] ${context}`,
      error && error.stack ? error.stack : String(error),
      '',
    ].join('\n');
    fs.appendFileSync(firstBootLogPath, details, 'utf8');
  } catch (e) {
    console.error('Erro ao gravar log de inicialização:', e);
  }
}

function sendPresentationShortcut(action) {
  const mainWindow = mainAppWindow && !mainAppWindow.isDestroyed()
    ? mainAppWindow
    : BrowserWindow.getAllWindows().find(win => !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed());
  if (mainWindow) {
    mainWindow.webContents.send('presentation-shortcut', action);
  }
}

function setPresentationShortcutsEnabled(enabled) {
  if (presentationShortcutsEnabled === enabled) return true;

  globalShortcut.unregister('Left');
  globalShortcut.unregister('Right');
  globalShortcut.unregister('Up');
  globalShortcut.unregister('Down');

  presentationShortcutsEnabled = false;
  if (!enabled) return true;

  const registered = [
    globalShortcut.register('Left', () => sendPresentationShortcut('prev')),
    globalShortcut.register('Up', () => sendPresentationShortcut('prev')),
    globalShortcut.register('Right', () => sendPresentationShortcut('next')),
    globalShortcut.register('Down', () => sendPresentationShortcut('next')),
  ];

  presentationShortcutsEnabled = registered.some(Boolean);
  return presentationShortcutsEnabled;
}

function sanitizeRemoteControlConfig(config = {}) {
  const port = Number(config.port);
  const host = typeof config.host === 'string' && config.host.trim()
    ? config.host.trim()
    : defaultRemoteControlConfig.host;

  return {
    enabled: config.enabled !== false,
    host,
    port: Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : defaultRemoteControlConfig.port,
    password: typeof config.password === 'string' ? config.password : '',
    requirePassword: config.requirePassword === true,
  };
}

function loadRemoteControlConfig() {
  const saved = readRecoverableFile(remoteControlConfigPath);
  if (saved) return sanitizeRemoteControlConfig({ ...defaultRemoteControlConfig, ...saved });

  return { ...defaultRemoteControlConfig };
}

function saveRemoteControlConfig(config) {
  remoteControlConfig = sanitizeRemoteControlConfig({ ...remoteControlConfig, ...config });
  writeRecoverableJson(remoteControlConfigPath, remoteControlConfig);
  return remoteControlConfig;
}

function sanitizeAutomationConfig(config = {}) {
  const devices = Array.isArray(config.devices) ? config.devices : [];
  const triggers = Array.isArray(config.triggers) ? config.triggers : [];

  return {
    enabled: config.enabled === true,
    simulationMode: config.simulationMode === true,
    showStatus: config.showStatus !== false,
    devices: devices.map(device => ({
      id: String(device.id || ''),
      name: String(device.name || ''),
      type: device.type === 'soundcraft-ui' ? 'soundcraft-ui' : 'soundcraft-ui',
      ip: normalizeSoundcraftTarget(device.ip),
    })).filter(device => device.id && device.name && device.ip),
    triggers: triggers.map(trigger => ({
      id: String(trigger.id || ''),
      name: String(trigger.name || ''),
      enabled: trigger.enabled !== false,
      actions: Array.isArray(trigger.actions) ? trigger.actions.map(action => ({
        id: String(action.id || ''),
        deviceId: String(action.deviceId || ''),
        target: ['input', 'master'].includes(action.target) ? action.target : 'input',
        channel: Number(action.channel) || 1,
        operation: ['setFaderLevelDB', 'fadeToDB', 'mute', 'unmute'].includes(action.operation) ? action.operation : 'fadeToDB',
        valueDB: Number(action.valueDB),
        fadeMs: Math.max(0, Number(action.fadeMs) || 0),
        restoreOnMediaEnd: action.restoreOnMediaEnd === true,
        endValueDB: Number.isFinite(Number(action.endValueDB)) ? Number(action.endValueDB) : Number(action.valueDB),
        endFadeMs: Math.max(0, Number(action.endFadeMs ?? action.fadeMs) || 0),
      })).filter(action => action.id && action.deviceId) : [],
    })).filter(trigger => trigger.id && trigger.name),
  };
}

function loadAutomationConfig() {
  const saved = readRecoverableFile(automationConfigPath);
  if (saved) return sanitizeAutomationConfig(saved);

  return sanitizeAutomationConfig();
}

function saveAutomationConfig(config = {}) {
  automationConfig = sanitizeAutomationConfig({ ...automationConfig, ...config });
  writeRecoverableJson(automationConfigPath, automationConfig);
  return automationConfig;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeSoundcraftTarget(value) {
  return String(value || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^wss?:\/\//i, '')
    .split('/')[0]
    .trim();
}

async function probeSoundcraftHttp(targetIP) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await net.fetch(`http://${targetIP}/`, { signal: controller.signal });
    return { ok: true, status: response.status };
  } finally {
    clearTimeout(timeout);
  }
}

async function getSoundcraftConnection(device) {
  const ip = normalizeSoundcraftTarget(device?.ip);
  if (!ip) throw new Error('IP da mesa nao configurado.');

  const cacheKey = `${device.id || ip}:${ip}`;
  const cached = soundcraftConnections.get(cacheKey);
  if (cached) return cached;

  let SoundcraftUI;
  try {
    ({ SoundcraftUI } = require('soundcraft-ui-connection'));
  } catch (error) {
    throw new Error('Dependencia soundcraft-ui-connection nao instalada.');
  }

  const conn = new SoundcraftUI(ip);
  try {
    await Promise.race([
      conn.connect(),
      wait(8500).then(() => {
        throw new Error('Tempo limite ao conectar na Soundcraft Ui.');
      }),
    ]);
    soundcraftConnections.set(cacheKey, conn);
    return conn;
  } catch (error) {
    try {
      await conn.disconnect();
    } catch (e) {
      // ignore cleanup failures
    }
    soundcraftConnections.delete(cacheKey);
    throw error;
  }
}

function getSoundcraftTarget(conn, action) {
  if (action.target === 'master') return conn.master;
  return conn.master.input(Number(action.channel) || 1);
}

async function executeAutomationAction(action, context = {}) {
  const device = automationConfig.devices.find(item => item.id === action.deviceId);
  if (!device) throw new Error('Dispositivo de automacao nao encontrado.');
  if (device.type !== 'soundcraft-ui') throw new Error('Tipo de dispositivo nao suportado.');

  if (automationConfig.simulationMode || context.simulationMode) {
    return { ok: true, simulated: true, action };
  }

  const conn = await getSoundcraftConnection(device);
  const target = getSoundcraftTarget(conn, action);

  if (action.restoreOnMediaEnd && ['setFaderLevelDB', 'fadeToDB'].includes(action.operation)) {
    pendingAutomationRestores.push({
      deviceId: device.id,
      target: action.target,
      channel: action.channel,
      valueDB: Number(action.endValueDB),
      fadeMs: Number(action.endFadeMs) || 0,
      createdAt: Date.now(),
    });
  }

  if (action.operation === 'mute') target.mute();
  else if (action.operation === 'unmute') target.unmute();
  else if (action.operation === 'setFaderLevelDB') target.setFaderLevelDB(Number(action.valueDB));
  else await target.fadeToDB(Number(action.valueDB), Number(action.fadeMs) || 0);

  return { ok: true };
}

async function executeAutomationTrigger(trigger, context = {}) {
  if (!trigger || trigger.enabled === false) {
    return { ok: true, skipped: true };
  }

  const results = [];
  for (const action of trigger.actions || []) {
    results.push(await executeAutomationAction(action, context));
  }

  return { ok: true, results };
}

async function restorePendingAutomation(reason = '') {
  if (pendingAutomationRestores.length === 0) {
    return { ok: true, restored: 0 };
  }

  const restores = pendingAutomationRestores.splice(0, pendingAutomationRestores.length).reverse();
  const results = [];

  for (const restore of restores) {
    const device = automationConfig.devices.find(item => item.id === restore.deviceId);
    if (!device) {
      results.push({ ok: false, error: 'Dispositivo de automacao nao encontrado.' });
      continue;
    }

    try {
      const conn = await getSoundcraftConnection(device);
      const target = getSoundcraftTarget(conn, restore);
      await target.fadeToDB(Number(restore.valueDB), Number(restore.fadeMs) || 0);
      results.push({ ok: true });
    } catch (error) {
      results.push({ ok: false, error: error.message });
    }
  }

  return {
    ok: results.every(result => result.ok),
    restored: results.filter(result => result.ok).length,
    reason,
    results,
  };
}

function getRemoteControlPort() {
  return remoteControlConfig.port;
}

function getRemoteControlAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  const port = getRemoteControlPort();

  Object.values(interfaces).forEach((items = []) => {
    items.forEach((item) => {
      if (item.family === 'IPv4' && !item.internal) {
        if (remoteControlConfig.host === '0.0.0.0' || remoteControlConfig.host === item.address) {
          addresses.push(`http://${item.address}:${port}`);
        }
      }
    });
  });

  return addresses;
}

function getRemoteControlNetworkOptions() {
  const options = [
    { title: 'Todos os IPs da rede', value: '0.0.0.0' },
  ];
  const interfaces = os.networkInterfaces();

  Object.values(interfaces).forEach((items = []) => {
    items.forEach((item) => {
      if (item.family === 'IPv4' && !item.internal) {
        options.push({ title: item.address, value: item.address });
      }
    });
  });

  return options;
}

function isRemoteControlPasswordValid(request) {
  if (!remoteControlConfig.requirePassword || !remoteControlConfig.password) return true;
  return request.headers['x-remote-password'] === remoteControlConfig.password;
}

function getRemoteControlRole(request) {
  return request.headers['x-remote-role'] === 'presenter' ? 'presenter' : 'operator';
}

function isRemoteControlActionAllowed(role, endpoint, action = '') {
  if (role === 'operator') return true;
  if (endpoint === 'control') return ['play_pause', 'next', 'prev'].includes(action);
  return endpoint === 'liturgy_open';
}

function reserveRemoteCommand(requestId) {
  const now = Date.now();
  for (const [id, timestamp] of recentRemoteCommandIds) {
    if (now - timestamp > 10000) recentRemoteCommandIds.delete(id);
  }

  if (requestId && recentRemoteCommandIds.has(requestId)) {
    return { ok: true, duplicate: true };
  }
  if (now < remoteCommandLockUntil) {
    return { ok: false, retryAfter: remoteCommandLockUntil - now };
  }

  remoteCommandLockUntil = now + 180;
  if (requestId) recentRemoteCommandIds.set(requestId, now);
  return { ok: true, duplicate: false };
}

function updateRemoteControlState(state = {}) {
  const safeState = state && typeof state === 'object' ? state : {};
  remoteControlState = {
    ...remoteControlState,
    ...safeState,
    revision: remoteControlState.revision + 1,
    updatedAt: new Date().toISOString(),
    connected: true,
  };
  return remoteControlState;
}

function sendRemoteControlCommand(command) {
  const mainWindow = mainAppWindow && !mainAppWindow.isDestroyed()
    ? mainAppWindow
    : BrowserWindow.getAllWindows().find(win => !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed());

  if (!mainWindow) return false;
  mainWindow.webContents.send('remote-control-command', command);
  return true;
}

function normalizeLocalDbFilename(filename) {
  const normalized = String(filename || '');
  if (!/^[a-zA-Z0-9_-]+$/.test(normalized)) throw new Error('Nome de banco local invalido.');
  return normalized;
}

function getLocalDbFilePath(filename) {
  return path.join(sysDbPath, (normalizeLocalDbFilename(filename) + '.bin'));
}

function getPlainLocalDbFilePath(filename) {
  return path.join(sysDbPath, normalizeLocalDbFilename(filename));
}

function parseEncryptedDbContent(content) {
  const decrypted = decryptData(content);
  if (!decrypted) throw new Error('Conteudo criptografado invalido.');
  return JSON.parse(decrypted);
}

function writeLocalDbFile(filename, data) {
  const encrypted = encryptData(JSON.stringify(data));
  if (!encrypted) throw new Error('Nao foi possivel criptografar o banco local.');
  return writeRecoverableFile(getLocalDbFilePath(filename), encrypted, { parse: parseEncryptedDbContent });
}

function readLocalDbFile(filename) {
  const encryptedPath = getLocalDbFilePath(filename);
  const encryptedData = readRecoverableFile(encryptedPath, { parse: parseEncryptedDbContent });
  if (encryptedData !== null) return encryptedData;

  const plainPath = getPlainLocalDbFilePath(filename);
  const plainData = readRecoverableFile(plainPath);
  if (plainData === null) return null;

  writeLocalDbFile(filename, plainData);
  fs.rmSync(plainPath, { force: true });
  fs.rmSync((plainPath + '.bak'), { force: true });
  return plainData;
}

function readRemoteDbFile(filename) {
  try {
    return readLocalDbFile(filename);
  } catch (error) {
    console.error('[RemoteControl] Erro lendo banco local:', filename, error.message);
    return null;
  }
}

function hasLocalDbFile(filename) {
  try {
    return readLocalDbFile(filename) !== null;
  } catch (error) {
    return false;
  }
}

function hasRequiredLocalDbFiles(files = getRequiredLocalDbFiles()) {
  return files.every(file => hasLocalDbFile(file));
}

function getBundledDatabasePath() {
  const candidates = [
    path.join(process.resourcesPath || '', 'database.db'),
    path.join(process.resourcesPath || '', 'resources', 'database.db'),
    path.join(app.getAppPath(), 'resources', 'database.db'),
  ];

  return candidates.find(candidate => candidate && fs.existsSync(candidate)) || null;
}

async function extractDatabaseFromPath(dbPath, language = 'pt', sourceLanguage = language, progressCallback = null) {
  const extractor = new DbExtractor(
    dbPath,
    normalizeDatabaseLanguage(language),
    getDatabaseSourceLanguage(sourceLanguage),
  );
  await extractor.extract(progressCallback || (() => {}));
}

function cleanRemoteSearchText(value) {
  return normalizeSmartSearchText(value);
}

function normalizeRemoteSong(item, source, sourceLabel) {
  const albums = Array.isArray(item.albums) ? item.albums : [];
  const firstAlbum = albums[0] || {};

  return {
    id_music: item.id_music,
    id_album: firstAlbum.id_album || item.id_album || null,
    name: item.name || '',
    track: item.track || firstAlbum.track || firstAlbum.pivot?.track || '',
    duration: item.duration || '',
    has_music: item.has_music,
    has_instrumental_music: item.has_instrumental_music,
    album_name: firstAlbum.name || sourceLabel,
    albums_names: item.albums_names || albums.map(album => album.name).filter(Boolean).join(' '),
    source,
    source_label: sourceLabel,
  };
}

function getRemoteSearchLibrary() {
  const sources = [
    { file: 'pt_hymnal', source: 'hymnal', label: 'Hinario Adventista' },
    { file: 'pt_hymnal_1996', source: 'hymnal_1996', label: 'Hinario Adventista 1996' },
    { file: 'pt_musics', source: 'musics', label: 'Musicas' },
    { file: 'es_hymnal', source: 'hymnal', label: 'Himnario Adventista' },
    { file: 'es_hymnal_1996', source: 'hymnal_1996', label: 'Himnario Adventista 1996' },
    { file: 'es_musics', source: 'musics', label: 'Musicas' },
  ];

  const songs = [];
  sources.forEach((source) => {
    const data = readRemoteDbFile(source.file);
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item && item.id_music) songs.push(normalizeRemoteSong(item, source.source, source.label));
      });
    }
  });

  return songs;
}

function searchRemoteSongs(query, limit = 30) {
  const cleanQuery = cleanRemoteSearchText(query);
  const numericQuery = /^\d+$/.test(cleanQuery) ? Number(cleanQuery) : null;

  if (!cleanQuery) return [];

  return getRemoteSearchLibrary()
    .map((song) => {
      const track = Number(song.track);
      const name = cleanRemoteSearchText(song.name);
      const metadata = cleanRemoteSearchText(`${song.album_name || ''} ${song.albums_names || ''} ${song.source_label || ''}`);
      const isHymnal = song.source === 'hymnal' || song.source === 'hymnal_1996';
      let score = 0;
      let match_hint = '';

      if (numericQuery !== null) {
        if (isHymnal && track === numericQuery) score = 120;
        else if (String(song.track || '').startsWith(cleanQuery)) score = 55;
      } else {
        const nameScore = smartTokenScore(cleanQuery, name);
        const metadataScore = Math.round(smartTokenScore(cleanQuery, metadata) * 0.65);
        score = Math.max(nameScore, metadataScore);
        if (score > 0 && !name.includes(cleanQuery) && nameScore < 82) {
          match_hint = 'Resultado aproximado';
        }
      }

      return { ...song, score, match_hint };
    })
    .filter(song => song.score > 0)
    .sort((a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name)))
    .slice(0, Math.max(1, Math.min(Number(limit) || 30, 50)))
    .map(({ score, ...song }) => song);
}

function normalizeRemoteBibleText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\biii\b/gi, '3')
    .replace(/\bii\b/gi, '2')
    .replace(/\bi\b/gi, '1')
    .replace(/[.ªº]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function getRemoteBibleBooks(locale = 'pt') {
  const books = readRemoteDbFile(`${locale}_bible_book`);
  return Array.isArray(books) ? books : [];
}

function getRemoteBibleVersions(locale = 'pt') {
  const versions = readRemoteDbFile(`${locale}_bible_version`);
  return Array.isArray(versions) ? versions : [];
}

function getDefaultRemoteBibleVersion(locale = 'pt') {
  const versions = getRemoteBibleVersions(locale);
  return versions.find(version => version.abbreviation === 'ARA' || version.name === 'ARA') || versions[0] || null;
}

function findRemoteBibleBook(input, books) {
  const normalizedInput = normalizeRemoteBibleText(input);
  const compactInput = normalizedInput.replace(/\s+/g, '');
  const bookEntries = books.map((book) => ({
    book,
    names: [book.name, book.abbreviation]
      .filter(Boolean)
      .flatMap((name) => {
        const normalizedName = normalizeRemoteBibleText(name);
        return [normalizedName, normalizedName.replace(/\s+/g, '')];
      }),
  }));

  for (const entry of bookEntries) {
    if (entry.names.some(name => normalizedInput === name || compactInput === name)) {
      return { book: entry.book, rest: '' };
    }
  }

  const sortedEntries = [...bookEntries].sort((a, b) => {
    const aSize = Math.max(a.book.name?.length || 0, a.book.abbreviation?.length || 0);
    const bSize = Math.max(b.book.name?.length || 0, b.book.abbreviation?.length || 0);
    return bSize - aSize;
  });

  for (const entry of sortedEntries) {
    for (const name of entry.names) {
      if (
        normalizedInput.startsWith(`${name} `) ||
        (compactInput.startsWith(name) && /^\d/.test(compactInput.slice(name.length)))
      ) {
        return {
          book: entry.book,
          rest: normalizedInput.startsWith(name)
            ? normalizedInput.slice(name.length).trim()
            : compactInput.slice(name.length).trim(),
        };
      }
    }
  }

  // Aceita pequenos erros no nome do livro, inclusive quando seguido da referencia.
  const fuzzyReference = normalizedInput.match(/^(.*?)(\d+(?:\s*[: ]\s*.*)?)$/);
  const fuzzyBookText = (fuzzyReference?.[1] || normalizedInput).trim();
  const fuzzyRest = fuzzyReference?.[2]?.trim() || '';
  if (fuzzyBookText.length >= 3) {
    const candidates = bookEntries
      .map((entry) => ({
        entry,
        score: Math.max(...entry.names.map(name => smartTokenScore(fuzzyBookText, name))),
      }))
      .sort((a, b) => b.score - a.score);
    if (candidates[0]?.score >= 68) {
      return { book: candidates[0].entry.book, rest: fuzzyRest, fuzzy: true };
    }
  }

  return null;
}

function parseRemoteBibleSearch(input, books) {
  const query = String(input || '').trim();
  if (!query) return null;

  const bookMatch = findRemoteBibleBook(query, books);
  const book = bookMatch?.book || null;
  const rest = bookMatch ? bookMatch.rest : query;
  const referenceMatch = rest.match(/^(\d+)(?:\s*[: ]\s*(.+))?$/);

  if (book || referenceMatch?.[2] || (referenceMatch && query.includes(':'))) {
    return {
      book,
      chapter: referenceMatch ? Number(referenceMatch[1]) : null,
      verseQuery: referenceMatch?.[2]?.trim() || '',
      isReference: true,
    };
  }

  return {
    book: null,
    chapter: null,
    verseQuery: query,
    isReference: false,
  };
}

function getRemoteBibleChapter(versionId, bookId, chapter) {
  const verses = readRemoteDbFile(`bible_${versionId}_${bookId}_${chapter}`);
  return verses && typeof verses === 'object' ? verses : {};
}

function filterRemoteVersesByQuery(input, verses) {
  const selected = new Set();
  const parts = String(input || '').split(',');

  for (const part of parts) {
    const range = part.trim().match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      const s = Math.min(start, end);
      const e = Math.max(start, end);
      for (let i = s; i <= e; i++) {
        if (verses[i]) selected.add(i);
      }
    } else {
      const num = Number(part.trim());
      if (!Number.isNaN(num) && verses[num]) selected.add(num);
    }
  }

  return Array.from(selected).sort((a, b) => a - b);
}

function numbersInterval(numbers) {
  if (!numbers || numbers.length === 0) return '';

  const sorted = [...numbers].sort((a, b) => a - b);
  const result = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      result.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }

  return result.join(', ');
}

function getRemoteSelectedVerses(verses, keys) {
  const sorted = [...keys].sort((a, b) => a - b);
  let result = '';
  let previousKey = null;

  sorted.forEach((key) => {
    if (previousKey !== null && key - previousKey > 1) {
      result += ' [...] ';
    } else if (result) {
      result += ' ';
    }
    result += verses[key] || '';
    previousKey = key;
  });

  return result;
}

function buildRemoteBiblePayload({ versionId, bookId, chapter, verseNumbers, locale = 'pt' }) {
  const books = getRemoteBibleBooks(locale);
  const versions = getRemoteBibleVersions(locale);
  const version = versions.find(item => Number(item.id_bible_version) === Number(versionId)) || getDefaultRemoteBibleVersion(locale);
  const book = books.find(item => Number(item.id_bible_book) === Number(bookId));
  const targetChapter = Number(chapter);

  if (!version || !book || !Number.isInteger(targetChapter) || targetChapter < 1 || targetChapter > Number(book.chapters || 1)) {
    return null;
  }

  const verses = getRemoteBibleChapter(version.id_bible_version, book.id_bible_book, targetChapter);
  const selectedVerses = (Array.isArray(verseNumbers) ? verseNumbers : [])
    .map(Number)
    .filter(num => Number.isInteger(num) && verses[num])
    .sort((a, b) => a - b);

  if (!selectedVerses.length) return null;

  const versesInterval = numbersInterval(selectedVerses);
  return {
    id_bible_version: version.id_bible_version,
    id_bible_book: book.id_bible_book,
    version: version.abbreviation,
    book: book.name,
    chapter: targetChapter,
    verses: selectedVerses,
    scriptural_reference: `${book.name} ${targetChapter}${versesInterval ? `:${versesInterval}` : ''}${version.abbreviation ? ` (${version.abbreviation})` : ''}`.trim(),
    text: getRemoteSelectedVerses(verses, selectedVerses),
  };
}

function searchRemoteBible(query, locale = 'pt') {
  const books = getRemoteBibleBooks(locale);
  const version = getDefaultRemoteBibleVersion(locale);
  const cleanQuery = String(query || '').trim();

  if (!books.length || !version) {
    return { ready: false, mode: 'empty', results: [] };
  }

  if (!cleanQuery) {
    return { ready: true, mode: 'books', results: books.slice(0, 12).map(book => ({ type: 'book', book })) };
  }

  const parsed = parseRemoteBibleSearch(cleanQuery, books);
  const targetBook = parsed?.book;

  if (!targetBook) {
    const normalizedQuery = normalizeRemoteBibleText(cleanQuery);
    const results = books
      .map((book) => {
        const normalizedName = normalizeRemoteBibleText(book.name);
        const normalizedAbbreviation = normalizeRemoteBibleText(book.abbreviation);
        const score = Math.max(
          smartTokenScore(normalizedQuery, normalizedName),
          smartTokenScore(normalizedQuery, normalizedAbbreviation),
        );
        return { type: 'book', book, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.book.book_number - b.book.book_number)
      .slice(0, 12)
      .map(({ score, ...item }) => item);

    return { ready: true, mode: 'books', results };
  }

  const chapter = Math.min(Math.max(parsed.chapter || 1, 1), Number(targetBook.chapters || 1));
  if (!parsed.verseQuery) {
    return {
      ready: true,
      mode: parsed.chapter ? 'verses' : 'chapters',
      book: targetBook,
      chapter,
      version,
      results: parsed.chapter
        ? Object.entries(getRemoteBibleChapter(version.id_bible_version, targetBook.id_bible_book, chapter)).map(([num, text]) => {
          const verseNumber = Number(num);
          return {
            type: 'verse',
            book: targetBook,
            chapter,
            verseNumbers: [verseNumber],
            text,
            version,
            reference: `${targetBook.name} ${chapter}:${verseNumber}`,
            payload: buildRemoteBiblePayload({
              versionId: version.id_bible_version,
              bookId: targetBook.id_bible_book,
              chapter,
              verseNumbers: [verseNumber],
              locale,
            }),
          };
        })
        : Array.from({ length: Number(targetBook.chapters || 1) }, (_, index) => ({
          type: 'chapter',
          book: targetBook,
          chapter: index + 1,
          reference: `${targetBook.name} ${index + 1}`,
        })),
    };
  }

  const chapterVerses = getRemoteBibleChapter(version.id_bible_version, targetBook.id_bible_book, chapter);
  const verseNumbers = filterRemoteVersesByQuery(parsed.verseQuery, chapterVerses);
  const payload = buildRemoteBiblePayload({
    versionId: version.id_bible_version,
    bookId: targetBook.id_bible_book,
    chapter,
    verseNumbers,
    locale,
  });

  return {
    ready: true,
    mode: 'selected',
    book: targetBook,
    chapter,
    version,
    results: payload ? [{
      type: 'selected',
      payload,
      text: payload.text,
      reference: payload.scriptural_reference,
    }] : [],
  };
}

function getRemoteMainWindow() {
  return mainAppWindow && !mainAppWindow.isDestroyed()
    ? mainAppWindow
    : BrowserWindow.getAllWindows().find(win => !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed());
}

async function getRemoteUserData() {
  try {
    const mainWindow = getRemoteMainWindow();
    if (!mainWindow || mainWindow.webContents.isDestroyed()) return {};
    const raw = await mainWindow.webContents.executeJavaScript("localStorage.getItem('user_data')", true);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (error) {
    console.error('[RemoteControl] Erro lendo preferencias locais:', error.message);
    return {};
  }
}

function getRemoteUserDataValue(data, key, fallback = null) {
  if (!data || typeof data !== 'object') return fallback;
  if (Object.prototype.hasOwnProperty.call(data, key)) return data[key];

  return key.split('.').reduce((current, part) => {
    if (!current || typeof current !== 'object') return undefined;
    return current[part];
  }, data) ?? fallback;
}

function getTodayLiturgyDay() {
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
}

function getLiturgyDayLabel(day) {
  return {
    sunday: 'Domingo',
    monday: 'Segunda',
    tuesday: 'Terca',
    wednesday: 'Quarta',
    thursday: 'Quinta',
    friday: 'Sexta',
    saturday: 'Sabado',
  }[day] || 'Hoje';
}

function getLiturgyTypeLabel(type) {
  return {
    annotation: 'Anotacao',
    category: 'Categoria',
    music: 'Musica',
    verse: 'Versiculo',
    media: 'Midia',
    link: 'Link',
  }[type] || 'Item';
}

function normalizeRemoteLiturgyItem(item, index) {
  const executable = ['music', 'verse', 'media', 'link'].includes(item?.type);
  return {
    index,
    number: item?.type === 'category' ? '' : index + 1,
    type: item?.type || 'annotation',
    type_label: getLiturgyTypeLabel(item?.type),
    name: item?.name || '',
    subtitle: item?.subtitle || '',
    done: item?.done === true,
    executable,
    payload: item,
  };
}

async function getRemoteTodayLiturgy() {
  const userData = await getRemoteUserData();
  const liturgies = getRemoteUserDataValue(userData, 'modules.liturgy.liturgies', {});
  const day = getTodayLiturgyDay();
  const items = Array.isArray(liturgies?.[day]) ? liturgies[day] : [];

  return {
    ready: true,
    day,
    title: getLiturgyDayLabel(day),
    count: items.length,
    items: items.map(normalizeRemoteLiturgyItem),
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function readRequestJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1024 * 1024) {
        request.destroy();
        reject(new Error('Payload muito grande.'));
      }
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function getRemoteControlHtml() {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#f4f7fb">
  <title>Controle IASDPresenter</title>
  <style>
    :root{font-family:Inter,system-ui,-apple-system,sans-serif;color:#f8fafc;background:#06101d;color-scheme:dark;--blue:#0097d7;--card:#102033;--muted:#91a4ba;--line:#22364c;--danger:#ef4444;--ok:#22c55e;--warn:#f6c32a}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at top,#12304a 0,#081526 38%,#06101d 100%)}button,input,select{font:inherit}.app{width:min(720px,100%);margin:auto;padding:calc(14px + env(safe-area-inset-top)) 14px calc(88px + env(safe-area-inset-bottom))}.top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.brand{display:flex;align-items:center;gap:10px;font-weight:850}.brand img{width:34px;height:34px}.status{display:flex;align-items:center;gap:7px;color:var(--muted);font-size:12px}.dot{width:9px;height:9px;border-radius:50%;background:var(--danger);box-shadow:0 0 0 4px rgba(239,68,68,.12)}.online .dot{background:var(--ok);box-shadow:0 0 0 4px rgba(34,197,94,.12)}.role{border:1px solid var(--line);border-radius:10px;background:#0b1929;color:#fff;padding:8px}.card{background:linear-gradient(145deg,rgba(18,39,62,.96),rgba(11,27,44,.96));border:1px solid var(--line);border-radius:20px;padding:18px;box-shadow:0 18px 50px rgba(0,0,0,.2)}.onair{color:#69d99a;font-size:11px;font-weight:900;letter-spacing:.13em}.title{font-size:22px;font-weight:850;margin:7px 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.slide{color:#d8e5f2;line-height:1.4;min-height:42px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.next{margin-top:14px;padding-top:13px;border-top:1px solid var(--line);color:var(--muted);font-size:13px}.next strong{display:block;color:#f8fafc;margin-top:4px}.bar{height:5px;background:#26394d;border-radius:99px;margin-top:15px;overflow:hidden}.bar i{display:block;height:100%;width:0;background:var(--blue);transition:width .3s}.controls{display:grid;grid-template-columns:1fr 1.25fr 1fr;gap:12px;margin:15px 0}.btn{border:1px solid var(--line);background:var(--card);color:#fff;border-radius:16px;padding:14px 10px;font-weight:800;min-height:54px}.btn:active{transform:scale(.97)}.btn.primary{background:var(--blue);border-color:var(--blue);font-size:20px}.emergency{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:15px}.emergency .btn{font-size:11px;padding:10px 5px;min-height:48px}.emergency .danger{color:#fecaca;border-color:#7f1d1d}.emergency .active{background:var(--warn);color:#111827;border-color:var(--warn)}.tabs{position:fixed;z-index:8;bottom:0;left:50%;transform:translateX(-50%);width:min(720px,100%);display:grid;grid-template-columns:repeat(4,1fr);background:rgba(5,15,27,.96);backdrop-filter:blur(16px);border-top:1px solid var(--line);padding:8px 8px calc(8px + env(safe-area-inset-bottom))}.tab{border:0;background:transparent;color:var(--muted);padding:9px 3px;font-size:11px;font-weight:750}.tab.active{color:#5cc8f6}.view{display:none}.view.active{display:block}.section{margin-top:12px}.searchbox{display:flex;gap:8px}.searchbox input,.login input{width:100%;border:1px solid var(--line);border-radius:14px;background:#0a1929;color:white;padding:14px}.results{display:grid;gap:8px;margin-top:12px}.result{width:100%;text-align:left;border:1px solid var(--line);background:var(--card);color:#fff;border-radius:14px;padding:13px}.result small{display:block;color:var(--muted);margin-top:4px}.empty{color:var(--muted);text-align:center;padding:26px}.toast{position:fixed;z-index:20;left:50%;bottom:90px;transform:translateX(-50%);background:#17283b;border:1px solid var(--line);padding:10px 16px;border-radius:99px;font-size:13px;opacity:0;pointer-events:none;transition:.2s}.toast.show{opacity:1}.login{position:fixed;z-index:30;inset:0;background:#071321;display:none;place-items:center;padding:24px}.login.show{display:grid}.login .card{width:min(420px,100%)}.login h1{margin-top:0}.login label{display:block;color:var(--muted);font-size:13px;margin:12px 0 6px}.login .btn{width:100%;margin-top:14px}.meta{display:flex;justify-content:space-between;color:var(--muted);font-size:12px;margin-top:10px}@media(max-width:420px){.app{padding-left:10px;padding-right:10px}.emergency{grid-template-columns:repeat(3,1fr)}.role{max-width:125px}.title{font-size:19px}}
  </style>
  <style>
    :root{--bg:#050a14;--surface:#0c1525;--surface-2:#111e31;--surface-3:#17263a;--text:#f6f8fc;--muted:#8fa1b8;--line:rgba(148,163,184,.16);--blue:#18a7e0;--blue-2:#087fb4;--violet:#7567ff;--danger:#ff5d68;--ok:#36d399;--warn:#ffc857;--shadow:0 22px 70px rgba(0,0,0,.34)}
    *{-webkit-tap-highlight-color:transparent}
    html{background:var(--bg)}
    body{min-height:100dvh;background:radial-gradient(circle at 15% -10%,rgba(24,167,224,.18),transparent 34%),radial-gradient(circle at 100% 20%,rgba(117,103,255,.12),transparent 30%),linear-gradient(180deg,#08111f 0%,var(--bg) 52%);color:var(--text);overflow-x:hidden}
    body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.15;background-image:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);background-size:30px 30px;mask-image:linear-gradient(to bottom,#000,transparent 70%)}
    button,input,select{font:inherit}button{cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid rgba(24,167,224,.3);outline-offset:2px}
    .app{position:relative;width:min(760px,100%);padding:0 18px calc(108px + env(safe-area-inset-bottom))}
    .top{position:sticky;z-index:10;top:0;margin:0 -18px 18px;padding:calc(13px + env(safe-area-inset-top)) 18px 13px;background:linear-gradient(180deg,rgba(5,10,20,.97) 65%,rgba(5,10,20,0));backdrop-filter:blur(18px);align-items:center}
    .brand{gap:11px;font-size:15px;letter-spacing:-.01em}.brand-mark{display:grid;width:40px;height:40px;place-items:center;border:1px solid rgba(255,255,255,.12);border-radius:13px;background:linear-gradient(145deg,rgba(24,167,224,.25),rgba(117,103,255,.18));box-shadow:inset 0 1px rgba(255,255,255,.12)}.brand img{width:28px;height:28px}.brand-copy small{display:block;color:var(--muted);font-size:10px;font-weight:650;letter-spacing:.08em;text-transform:uppercase;margin-top:2px}
    .header-actions{display:flex;align-items:center;gap:8px}.status{gap:8px}.status-pill{min-height:38px;padding:0 11px;border:1px solid var(--line);border-radius:13px;background:rgba(12,21,37,.74);font-size:0}.status-pill #connectionText{display:none}.dot{width:8px;height:8px}.role{min-height:40px;border-color:var(--line);border-radius:13px;background:rgba(12,21,37,.9);padding:0 32px 0 12px;font-size:12px;font-weight:750}
    .page-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;margin:4px 2px 14px}.eyebrow{color:#65c9f2;font-size:10px;font-weight:850;letter-spacing:.15em;text-transform:uppercase}.page-heading h1{font-size:25px;line-height:1.1;letter-spacing:-.04em;margin:5px 0 0}.page-heading p{max-width:300px;color:var(--muted);font-size:12px;line-height:1.5;margin:0;text-align:right}
    .card{border-color:var(--line);border-radius:24px;background:linear-gradient(145deg,rgba(18,32,51,.96),rgba(9,17,30,.98));box-shadow:var(--shadow)}
    .now-card{position:relative;overflow:hidden;padding:22px}.now-card:before{content:"";position:absolute;width:220px;height:220px;right:-100px;top:-120px;border-radius:50%;background:rgba(24,167,224,.12);filter:blur(2px)}.now-top{position:relative;display:flex;justify-content:space-between;align-items:center}.onair{display:inline-flex;align-items:center;gap:7px;color:var(--muted);font-size:10px}.onair:before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 0 5px rgba(143,161,184,.08)}.onair.live{color:#69e4b4}.onair.live:before{animation:pulse 1.7s infinite}.live-chip{padding:6px 9px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:10px;font-weight:750;background:rgba(255,255,255,.03)}
    .title{position:relative;margin:20px 0 7px;font-size:clamp(23px,6vw,32px);letter-spacing:-.04em}.slide{position:relative;min-height:54px;color:#c9d5e5;font-size:15px;line-height:1.6;-webkit-line-clamp:3}.next{position:relative;margin-top:20px;padding:14px 15px;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.025);font-size:9px;font-weight:800;letter-spacing:.14em}.next strong{font-size:13px;line-height:1.45;letter-spacing:0}.bar{position:relative;height:6px;margin-top:20px;background:rgba(148,163,184,.13)}.bar i{background:linear-gradient(90deg,var(--blue),#63d5ff);box-shadow:0 0 16px rgba(24,167,224,.45)}.meta{position:relative;font-size:11px;margin-top:11px}
    .controls{grid-template-columns:1fr 1.12fr 1fr;gap:10px;margin:14px 0 22px}.btn{position:relative;min-height:56px;border-color:var(--line);border-radius:17px;background:linear-gradient(145deg,rgba(20,34,53,.94),rgba(12,22,38,.96));font-size:13px;transition:transform .15s ease,border-color .2s ease,background .2s ease,box-shadow .2s ease}.btn:hover{border-color:rgba(24,167,224,.38);background:var(--surface-3)}.btn:active{transform:scale(.965)}.btn.primary{border-color:rgba(59,195,250,.35);background:linear-gradient(145deg,#1daee7,#087fb4);box-shadow:0 14px 32px rgba(8,127,180,.28);font-size:24px}.btn .button-icon{display:block;font-size:18px;margin-bottom:3px}.transport .btn:not(.primary){color:#d6deea}
    .operator-panel{padding:16px;border:1px solid var(--line);border-radius:22px;background:rgba(9,17,30,.68)}.section-label{display:flex;align-items:center;justify-content:space-between;margin:0 2px 12px;color:#dce6f4;font-size:12px;font-weight:800}.section-label small{color:var(--muted);font-size:10px;font-weight:600}.emergency{grid-template-columns:repeat(3,1fr);gap:8px;margin:0}.emergency .btn{min-height:58px;padding:9px 6px;color:#b9c7d9;font-size:11px}.emergency .btn.active{border-color:rgba(255,200,87,.5);background:rgba(255,200,87,.14);color:#ffe09a}.emergency .danger{border-color:rgba(255,93,104,.24);color:#ffabb1;background:rgba(255,93,104,.07)}
    .view{animation:viewIn .23s ease}.view.active{display:block}.section{margin-top:0}.search-hero,.liturgy-hero{padding:19px;margin-bottom:12px}.search-hero h1,.liturgy-hero h1{font-size:22px;letter-spacing:-.03em;margin:3px 0 5px}.search-hero p,.liturgy-hero p{color:var(--muted);font-size:12px;margin:0}.searchbox{position:relative;gap:9px;margin-top:16px}.searchbox input,.login input{min-height:54px;border-color:var(--line);border-radius:16px;background:rgba(5,11,21,.76);padding:0 16px;color:var(--text);transition:border-color .2s,box-shadow .2s}.searchbox input:focus,.login input:focus{border-color:rgba(24,167,224,.65);box-shadow:0 0 0 4px rgba(24,167,224,.1)}.searchbox .btn{min-width:92px;background:linear-gradient(145deg,#1daee7,#087fb4)}
    .results{gap:9px;margin-top:10px}.result{position:relative;min-height:66px;border-color:var(--line);border-radius:18px;background:linear-gradient(145deg,rgba(17,30,49,.94),rgba(9,17,30,.96));padding:14px 44px 14px 16px;transition:transform .15s,border-color .2s}.result:after{content:"›";position:absolute;right:17px;top:50%;transform:translateY(-50%);color:#59c8f3;font-size:25px}.result:hover{border-color:rgba(24,167,224,.4);transform:translateY(-1px)}.result:disabled{opacity:.5;cursor:not-allowed}.result:disabled:after{display:none}.result strong{display:block;font-size:14px}.result small{color:var(--muted);font-size:11px;line-height:1.45;margin-top:5px}.empty{border:1px dashed var(--line);border-radius:18px;background:rgba(12,21,37,.4);padding:34px 20px}
    .tabs{z-index:15;bottom:10px;width:min(724px,calc(100% - 20px));grid-template-columns:repeat(4,1fr);padding:7px 8px calc(7px + env(safe-area-inset-bottom));border:1px solid rgba(148,163,184,.16);border-radius:22px;background:rgba(8,15,27,.9);box-shadow:0 20px 55px rgba(0,0,0,.45);backdrop-filter:blur(24px)}.tab{position:relative;display:flex;min-height:56px;flex-direction:column;align-items:center;justify-content:center;gap:3px;border-radius:15px;font-size:10px;transition:.2s}.tab-icon{font-size:18px;line-height:1}.tab.active{color:#eaf8ff;background:linear-gradient(145deg,rgba(24,167,224,.2),rgba(117,103,255,.12));box-shadow:inset 0 0 0 1px rgba(24,167,224,.13)}
    .toast{z-index:40;bottom:102px;max-width:calc(100% - 28px);border-color:rgba(255,255,255,.12);background:rgba(20,35,54,.96);box-shadow:0 15px 40px rgba(0,0,0,.4);padding:12px 18px}.login{background:radial-gradient(circle at 50% 0,rgba(24,167,224,.2),transparent 34%),rgba(5,10,20,.98);backdrop-filter:blur(18px)}.login .card{padding:26px}.login-badge{display:grid;width:58px;height:58px;place-items:center;margin-bottom:18px;border:1px solid rgba(255,255,255,.12);border-radius:19px;background:linear-gradient(145deg,rgba(24,167,224,.25),rgba(117,103,255,.22));font-size:25px}.login h1{font-size:27px;letter-spacing:-.04em;margin-bottom:7px}.login label{margin-top:17px}.login .role{min-height:52px}.login .btn{min-height:54px}
    @keyframes pulse{0%,100%{box-shadow:0 0 0 4px rgba(54,211,153,.1)}50%{box-shadow:0 0 0 9px rgba(54,211,153,0)}}@keyframes viewIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
    @media(min-width:680px){.status-pill{font-size:11px}.status-pill #connectionText{display:inline}.emergency{grid-template-columns:repeat(6,1fr)}.page-heading{margin-top:12px}.now-card{padding:27px}}
    @media(max-width:480px){.app{padding-left:12px;padding-right:12px}.top{margin-left:-12px;margin-right:-12px;padding-left:12px;padding-right:12px}.brand-copy small{display:none}.page-heading p{display:none}.page-heading h1{font-size:22px}.role{max-width:116px}.now-card{padding:18px}.controls{gap:7px}.controls .btn{padding-left:5px;padding-right:5px}.operator-panel{padding:12px}.emergency{grid-template-columns:repeat(3,1fr)}.tabs{bottom:6px}.searchbox{align-items:stretch;flex-direction:column}.searchbox .btn{width:100%}}
    @media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}}
  </style>
  <style>
    :root{color-scheme:light;--bg:#edf3f8;--surface:#ffffff;--surface-2:#f7f9fc;--surface-3:#eef4f8;--text:#172033;--muted:#68788d;--line:rgba(45,67,91,.13);--blue:#087fb4;--blue-2:#05648f;--violet:#6558e8;--danger:#d83a4b;--ok:#159b69;--warn:#d69a12;--card:#fff;--shadow:0 18px 48px rgba(44,68,94,.12)}
    html{background:var(--bg)}body{background:radial-gradient(circle at 8% -10%,rgba(49,181,232,.2),transparent 30%),radial-gradient(circle at 100% 15%,rgba(101,88,232,.1),transparent 28%),linear-gradient(180deg,#f8fbfd 0%,var(--bg) 58%);color:var(--text)}body:before{opacity:.35;background-image:linear-gradient(rgba(44,68,94,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(44,68,94,.035) 1px,transparent 1px)}
    .top{background:linear-gradient(180deg,rgba(248,251,253,.97) 66%,rgba(248,251,253,0))}.brand-mark{border-color:rgba(8,127,180,.12);background:linear-gradient(145deg,rgba(49,181,232,.2),rgba(101,88,232,.1));box-shadow:inset 0 1px rgba(255,255,255,.9)}.status-pill,.role{border-color:var(--line);background:rgba(255,255,255,.88);color:var(--text);box-shadow:0 7px 20px rgba(44,68,94,.07)}
    .eyebrow{color:#087fac}.page-heading h1,.search-hero h1,.liturgy-hero h1{color:var(--text)}.card{border-color:rgba(45,67,91,.12);background:linear-gradient(145deg,rgba(255,255,255,.98),rgba(247,250,252,.98));box-shadow:var(--shadow)}.now-card:before{background:rgba(49,181,232,.12)}.live-chip{border-color:var(--line);background:#f4f8fb;color:var(--muted)}.onair{color:#718096}.onair.live{color:var(--ok)}
    .projection-preview{position:relative;margin:18px auto 16px;aspect-ratio:16/9;max-width:520px;overflow:hidden;border:5px solid #dfe7ee;border-radius:17px;background:#111827;box-shadow:0 16px 35px rgba(23,32,51,.2),inset 0 0 0 1px rgba(255,255,255,.08)}.projection-preview:after{content:"PRÉVIA";position:absolute;right:9px;top:8px;padding:4px 7px;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(3,7,18,.5);color:rgba(255,255,255,.7);font-size:8px;font-weight:850;letter-spacing:.12em}.preview-stage{position:absolute;inset:0;display:grid;place-items:center;padding:12% 8%;text-align:center;background:radial-gradient(circle at 50% 10%,#243b59,#080d17 72%);transition:.2s}.preview-copy{max-width:100%;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.55)}.preview-title{margin-bottom:8px;color:#71d2f5;font-size:clamp(8px,2.3vw,13px);font-weight:800;letter-spacing:.06em;text-transform:uppercase}.preview-text{display:-webkit-box;overflow:hidden;font-size:clamp(12px,4vw,24px);font-weight:800;line-height:1.25;-webkit-box-orient:vertical;-webkit-line-clamp:3}.preview-logo{display:none;width:23%;max-width:80px;filter:drop-shadow(0 8px 18px rgba(0,0,0,.35))}.projection-preview.blackout .preview-stage{background:#000}.projection-preview.blackout .preview-copy,.projection-preview.blackout .preview-logo{display:none}.projection-preview.logo .preview-copy{display:none}.projection-preview.logo .preview-logo{display:block}.projection-preview.freeze:before{content:"CONGELADO";position:absolute;z-index:2;left:9px;top:8px;padding:4px 7px;border-radius:999px;background:#fff;color:#314158;font-size:8px;font-weight:900;letter-spacing:.1em}
    .title{color:var(--text)}.slide{color:#53657b}.next{border-color:var(--line);background:#f6f9fb;color:#77879a}.next strong{color:#26364b}.bar{background:#dfe7ee}.meta{color:#718096}
    .btn{border-color:var(--line);background:linear-gradient(145deg,#fff,#f3f7fa);color:#2e4056;box-shadow:0 8px 22px rgba(44,68,94,.08)}.btn:hover{border-color:rgba(8,127,180,.3);background:#fff}.btn.primary,.searchbox .btn{border-color:#0b8fc6;background:linear-gradient(145deg,#27b8ee,#087fb4);color:#fff;box-shadow:0 13px 28px rgba(8,127,180,.23)}.transport .btn:not(.primary){color:#314158}.operator-panel{border-color:var(--line);background:rgba(255,255,255,.64);box-shadow:0 12px 35px rgba(44,68,94,.06)}.section-label{color:#304258}.emergency .btn{color:#53657b}.emergency .btn.active{border-color:rgba(214,154,18,.35);background:#fff8e5;color:#9a6a00}.emergency .danger{border-color:rgba(216,58,75,.2);background:#fff5f6;color:#c72f40}
    .searchbox input,.login input{border-color:var(--line);background:#f7fafc;color:var(--text)}.searchbox input:focus,.login input:focus{background:#fff}.result{border-color:var(--line);background:linear-gradient(145deg,#fff,#f6f9fb);color:var(--text);box-shadow:0 8px 24px rgba(44,68,94,.06)}.result small{color:var(--muted)}.empty{background:rgba(255,255,255,.55)}
    .smart-row{display:flex;align-items:center;gap:7px;overflow-x:auto;margin-top:12px;padding-bottom:2px;scrollbar-width:none}.smart-row::-webkit-scrollbar{display:none}.smart-chip{flex:0 0 auto;min-height:34px;border:1px solid var(--line);border-radius:999px;background:#fff;color:#52647a;padding:0 12px;font-size:11px;font-weight:700}.smart-chip:hover{border-color:rgba(8,127,180,.35);color:var(--blue)}.search-feedback{min-height:18px;margin:10px 3px 0;color:var(--muted);font-size:11px}.match-hint{display:inline-block;margin-left:6px;border-radius:999px;background:#e9f7fc;color:#087fac;padding:2px 6px;font-size:9px;font-weight:750}
    .tabs{border-color:rgba(45,67,91,.12);background:rgba(255,255,255,.9);box-shadow:0 18px 50px rgba(44,68,94,.18)}.tab{color:#75859a}.tab.active{color:#076e9c;background:linear-gradient(145deg,rgba(49,181,232,.16),rgba(101,88,232,.08));box-shadow:inset 0 0 0 1px rgba(8,127,180,.1)}.toast{border-color:rgba(45,67,91,.13);background:#fff;color:var(--text);box-shadow:0 15px 40px rgba(44,68,94,.2)}.login{background:radial-gradient(circle at 50% 0,rgba(49,181,232,.22),transparent 35%),rgba(239,245,249,.98)}.login-badge{border-color:rgba(8,127,180,.13);background:linear-gradient(145deg,rgba(49,181,232,.22),rgba(101,88,232,.12))}
  </style>
</head>
<body>
  <main class="app">
    <header class="top"><div class="brand"><span class="brand-mark"><img src="/ico/favicon.png" alt=""></span><span class="brand-copy">IASDPresenter<small>Controle remoto</small></span></div><div class="header-actions"><div id="connection" class="status status-pill"><span class="dot"></span><span id="connectionText">Conectando...</span></div><select id="role" class="role" aria-label="Perfil de acesso"><option value="operator">Operador</option><option value="presenter">Apresentador</option></select></div></header>

    <section id="home" class="view active">
      <div class="page-heading"><div><div class="eyebrow">Painel ao vivo</div><h1>Controle da projeção</h1></div><p>Acompanhe o conteúdo e controle a apresentação em tempo real.</p></div>
      <article class="card now-card"><div class="now-top"><div class="onair" id="onair">SEM PROJEÇÃO</div><span class="live-chip">Sincronizado</span></div><div id="projectionPreview" class="projection-preview"><div class="preview-stage"><img class="preview-logo" src="/ico/favicon.png" alt=""><div class="preview-copy"><div id="previewTitle" class="preview-title">Aguardando projeção</div><div id="previewText" class="preview-text">A prévia aparecerá aqui.</div></div></div></div><div class="title" id="currentTitle">Aguardando conteúdo</div><div class="slide" id="currentText">O estado da projeção aparecerá aqui.</div><div class="next">A SEGUIR<strong id="nextText">—</strong></div><div class="bar"><i id="progress"></i></div><div class="meta"><span id="counter">—</span><span id="time">00:00 / 00:00</span></div></article>
      <div class="controls transport"><button class="btn" data-control="prev" aria-label="Voltar"><span class="button-icon">←</span>Voltar</button><button class="btn primary" id="play" data-control="play_pause" aria-label="Reproduzir ou pausar"><span id="playIcon">▶</span></button><button class="btn" data-control="next" aria-label="Avançar"><span class="button-icon">→</span>Avançar</button></div>
      <div id="operatorTools" class="operator-panel"><div class="section-label"><span>Ferramentas do operador</span><small>Comandos rápidos</small></div><div class="emergency"><button class="btn" data-emergency="blackout"><span class="button-icon">⬛</span>Tela preta</button><button class="btn" data-emergency="freeze"><span class="button-icon">❄</span>Congelar</button><button class="btn" data-emergency="logo"><span class="button-icon">◇</span>Logo</button><button class="btn" data-emergency="clear"><span class="button-icon">✓</span>Normal</button><button class="btn danger" data-control="close"><span class="button-icon">×</span>Encerrar</button><button class="btn" data-control="maximize"><span class="button-icon">⛶</span>Projetar</button></div></div>
    </section>

    <section id="music" class="view"><div class="card search-hero"><div class="eyebrow">Biblioteca</div><h1>Encontre uma música</h1><p>Pesquise pelo título ou número do hino. A busca entende acentos e pequenos erros de digitação.</p><div class="searchbox"><input id="musicQ" type="search" inputmode="search" placeholder="Nome ou número do hino" aria-label="Pesquisar música"><button id="musicSearch" class="btn">Buscar</button></div><div class="smart-row" aria-label="Sugestões de músicas"><button class="smart-chip" data-music-query="grandioso">Grandioso</button><button class="smart-chip" data-music-query="96">Hino 96</button><button class="smart-chip" data-music-query="amor">Amor</button></div><div id="musicFeedback" class="search-feedback">Digite ao menos 2 letras para pesquisar.</div></div><div id="musicResults" class="results"></div></section>
    <section id="bible" class="view"><div class="card search-hero"><div class="eyebrow">Bíblia</div><h1>Abra uma passagem</h1><p>Digite o livro, capítulo ou versículo. A busca também reconhece nomes aproximados.</p><div class="searchbox"><input id="bibleQ" type="search" inputmode="search" placeholder="Ex.: João 3:16" aria-label="Pesquisar passagem"><button id="bibleSearch" class="btn">Buscar</button></div><div class="smart-row" aria-label="Sugestões de passagens"><button class="smart-chip" data-bible-query="João 3:16">João 3:16</button><button class="smart-chip" data-bible-query="Salmo 23">Salmo 23</button><button class="smart-chip" data-bible-query="1 Coríntios 13">1 Coríntios 13</button></div><div id="bibleFeedback" class="search-feedback">Digite um livro ou uma referência bíblica.</div></div><div id="bibleResults" class="results"></div></section>
    <section id="liturgy" class="view"><div class="card liturgy-hero"><div class="eyebrow">Programação</div><h1>Liturgia de hoje</h1><p id="liturgyStatus">Carregando os itens da programação...</p></div><div id="liturgyResults" class="results"></div></section>
  </main>
  <nav class="tabs" aria-label="Navegação principal"><button class="tab active" data-view="home" aria-current="page"><span class="tab-icon">⌂</span><span>Controle</span></button><button class="tab" data-view="music"><span class="tab-icon">♫</span><span>Músicas</span></button><button class="tab" data-view="bible"><span class="tab-icon">▣</span><span>Bíblia</span></button><button class="tab" data-view="liturgy"><span class="tab-icon">☷</span><span>Liturgia</span></button></nav>
  <div id="toast" class="toast"></div>
  <section id="login" class="login"><form id="loginForm" class="card"><div class="login-badge">⌁</div><div class="eyebrow">Acesso seguro</div><h1>Conectar ao painel</h1><p style="color:var(--muted);margin-top:0">Use a senha configurada no computador principal.</p><label for="loginRole">Perfil</label><select id="loginRole" class="role" style="width:100%"><option value="operator">Operador</option><option value="presenter">Apresentador</option></select><label for="password">Senha</label><input id="password" type="password" autocomplete="current-password" placeholder="Digite sua senha"><button class="btn primary" type="submit">Entrar no controle</button><div id="loginStatus" class="status"></div></form></section>
<script>
(function(){
  var password=sessionStorage.getItem('iasdRemotePassword')||'';
  var role=sessionStorage.getItem('iasdRemoteRole')||new URLSearchParams(location.search).get('role')||'operator';
  var failures=0,pollTimer=null,currentOverride='none',toastTimer=null,musicSearchTimer=null,bibleSearchTimer=null;
  var roleEl=document.getElementById('role'),loginRole=document.getElementById('loginRole'); roleEl.value=role;loginRole.value=role;
  function headers(json){var h={'X-Remote-Password':password,'X-Remote-Role':role};if(json)h['Content-Type']='application/json';return h}
  function requestId(){return Date.now().toString(36)+Math.random().toString(36).slice(2)}
  async function api(url,options){options=options||{};options.headers=Object.assign({},headers(Boolean(options.body)),options.headers||{});var response=await fetch(url,options);if(response.status===401){document.getElementById('login').classList.add('show');throw new Error('Autenticacao necessaria')}var data=await response.json();if(response.status===409)throw new Error('Outro comando está sendo processado');if(!response.ok||data.ok===false)throw new Error(data.error||'Não foi possível executar');return data}
  function toast(text){var el=document.getElementById('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(function(){el.classList.remove('show')},2200)}
  function setConnected(ok){var el=document.getElementById('connection');el.classList.toggle('online',ok);document.getElementById('connectionText').textContent=ok?'Conectado • atualização automática':'Reconectando...'}
  function text(value){return String(value||'').replace(/<[^>]*>/g,' ').replace(/\\s+/g,' ').trim()}
  function clock(value){var n=Math.max(0,Number(value)||0),m=Math.floor(n/60),s=Math.floor(n%60);return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
  function renderState(state){failures=0;setConnected(true);var p=state.projection||{},playback=state.playback||{},current=state.current||{},next=state.next||{},onair=document.getElementById('onair'),play=document.getElementById('play'),preview=document.getElementById('projectionPreview');currentOverride=p.override||'none';onair.textContent=p.active?'NO AR • '+String(p.module||'').toUpperCase():'SEM PROJEÇÃO';onair.classList.toggle('live',Boolean(p.active));preview.classList.toggle('blackout',currentOverride==='blackout');preview.classList.toggle('freeze',currentOverride==='freeze');preview.classList.toggle('logo',currentOverride==='logo');document.getElementById('previewTitle').textContent=p.active?(current.title||String(p.module||'Projeção')):'Sem projeção';document.getElementById('previewText').textContent=p.active?(text(current.text)||'Conteúdo em exibição'):'A prévia aparecerá quando uma projeção for iniciada.';document.getElementById('currentTitle').textContent=current.title||'Aguardando conteúdo';document.getElementById('currentText').textContent=text(current.text)||'O estado da projeção aparecerá aqui.';document.getElementById('nextText').textContent=text(next.text)||next.title||'—';document.getElementById('progress').style.width=Math.max(0,Math.min(100,Number(playback.progress)||0))+'%';document.getElementById('time').textContent=clock(playback.currentTime)+' / '+clock(playback.duration);document.getElementById('counter').textContent=current.number&&current.total?current.number+' de '+current.total:'—';document.getElementById('playIcon').textContent=playback.paused?'▶':'Ⅱ';play.setAttribute('aria-label',playback.paused?'Reproduzir':'Pausar');document.querySelectorAll('[data-emergency]').forEach(function(btn){var action=btn.dataset.emergency;btn.classList.toggle('active',(action==='clear'&&currentOverride==='none')||action===currentOverride)});document.getElementById('operatorTools').style.display=role==='operator'?'block':'none'}
  async function poll(){try{var data=await api('/api/state');renderState(data.state||{})}catch(e){failures++;if(failures>1)setConnected(false)}finally{pollTimer=setTimeout(poll,1500)}}
  async function command(endpoint,body){body.requestId=requestId();if(navigator.vibrate)navigator.vibrate(18);try{await api(endpoint,{method:'POST',body:JSON.stringify(body)});toast('Comando enviado');clearTimeout(pollTimer);pollTimer=setTimeout(poll,120)}catch(e){toast(e.message)}}
  document.querySelectorAll('[data-control]').forEach(function(btn){btn.addEventListener('click',function(){command('/api/control',{action:btn.dataset.control})})});
  document.querySelectorAll('[data-emergency]').forEach(function(btn){btn.addEventListener('click',function(){command('/api/emergency',{action:btn.dataset.emergency})})});
  document.querySelectorAll('[data-view]').forEach(function(btn){btn.addEventListener('click',function(){document.querySelectorAll('.view').forEach(function(v){v.classList.remove('active')});document.querySelectorAll('.tab').forEach(function(v){v.classList.remove('active');v.removeAttribute('aria-current')});document.getElementById(btn.dataset.view).classList.add('active');btn.classList.add('active');btn.setAttribute('aria-current','page');window.scrollTo(0,0);if(btn.dataset.view==='liturgy')loadLiturgy()})});
  roleEl.addEventListener('change',function(){role=roleEl.value;loginRole.value=role;sessionStorage.setItem('iasdRemoteRole',role);document.getElementById('operatorTools').style.display=role==='operator'?'block':'none';clearTimeout(pollTimer);poll()});
  async function searchMusic(){var input=document.getElementById('musicQ'),query=input.value.trim(),box=document.getElementById('musicResults'),feedback=document.getElementById('musicFeedback');if(query.length<2&&!/^\d+$/.test(query)){box.innerHTML='';feedback.textContent='Digite ao menos 2 letras para pesquisar.';return}feedback.textContent='Buscando resultados inteligentes...';box.innerHTML='<div class="empty">Buscando...</div>';try{var data=await api('/api/search?q='+encodeURIComponent(query)),results=data.results||[];box.innerHTML='';results.forEach(function(item){var b=document.createElement('button'),hint=item.match_hint?'<span class="match-hint">'+escapeHtml(item.match_hint)+'</span>':'';b.className='result';b.innerHTML='<strong>'+escapeHtml((item.track?item.track+' • ':'')+item.name)+hint+'</strong><small>'+escapeHtml(item.album_name||item.source_label||'')+'</small>';b.onclick=function(){command('/api/play',{id_music:item.id_music,id_album:item.id_album,mode:'audio'})};box.appendChild(b)});feedback.textContent=results.length?results.length+' resultado(s) encontrado(s). A busca aceita nomes aproximados.':'Tente outro título, número ou uma parte do nome.';if(!box.children.length)box.innerHTML='<div class="empty">Nenhuma música encontrada.</div>'}catch(e){feedback.textContent='Não foi possível concluir a busca.';box.innerHTML='<div class="empty">'+escapeHtml(e.message)+'</div>'}}
  async function searchBible(){var input=document.getElementById('bibleQ'),query=input.value.trim(),box=document.getElementById('bibleResults'),feedback=document.getElementById('bibleFeedback');if(!query){box.innerHTML='';feedback.textContent='Digite um livro ou uma referência bíblica.';return}feedback.textContent='Interpretando a referência...';box.innerHTML='<div class="empty">Buscando...</div>';try{var data=await api('/api/bible/search?q='+encodeURIComponent(query)),results=data.results||[];box.innerHTML='';results.forEach(function(item){var b=document.createElement('button'),book=item.book||{},label=item.reference||item.name||book.name||'Resultado',chapters=item.chapters||book.chapters,details=item.text||(chapters?chapters+' capítulos':'');b.className='result';b.innerHTML='<strong>'+escapeHtml(label)+'</strong><small>'+escapeHtml(details)+'</small>';if(item.payload)b.onclick=function(){command('/api/bible/open',item.payload)};else b.onclick=function(){input.value=item.reference||item.name||book.name||query;searchBible()};box.appendChild(b)});feedback.textContent=results.length?results.length+' resultado(s). Toque para abrir ou detalhar.':'Confira o nome do livro, capítulo e versículo.';if(!box.children.length)box.innerHTML='<div class="empty">Referência não encontrada.</div>'}catch(e){feedback.textContent='Não foi possível concluir a busca.';box.innerHTML='<div class="empty">'+escapeHtml(e.message)+'</div>'}}
  async function loadLiturgy(){var box=document.getElementById('liturgyResults');try{var data=await api('/api/liturgy/today');document.getElementById('liturgyStatus').textContent=data.title+' • '+data.count+' item(ns)';box.innerHTML='';(data.items||[]).forEach(function(item){var b=document.createElement('button');b.className='result';b.disabled=!item.executable;b.innerHTML='<strong>'+escapeHtml((item.number?item.number+'. ':'')+(item.name||item.type_label))+'</strong><small>'+escapeHtml(item.type_label+(item.done?' • concluído':''))+'</small>';if(item.executable)b.onclick=function(){command('/api/liturgy/open',{item:item.payload})};box.appendChild(b)});if(!box.children.length)box.innerHTML='<div class="empty">Nenhum item para hoje.</div>'}catch(e){box.innerHTML='<div class="empty">'+escapeHtml(e.message)+'</div>'}}
  function escapeHtml(value){var d=document.createElement('div');d.textContent=String(value||'');return d.innerHTML}
  document.getElementById('musicSearch').onclick=searchMusic;document.getElementById('musicQ').addEventListener('keydown',function(e){if(e.key==='Enter')searchMusic()});document.getElementById('musicQ').addEventListener('input',function(){clearTimeout(musicSearchTimer);musicSearchTimer=setTimeout(searchMusic,320)});document.getElementById('bibleSearch').onclick=searchBible;document.getElementById('bibleQ').addEventListener('keydown',function(e){if(e.key==='Enter')searchBible()});document.getElementById('bibleQ').addEventListener('input',function(){clearTimeout(bibleSearchTimer);bibleSearchTimer=setTimeout(searchBible,320)});document.querySelectorAll('[data-music-query]').forEach(function(btn){btn.onclick=function(){document.getElementById('musicQ').value=btn.dataset.musicQuery;searchMusic()}});document.querySelectorAll('[data-bible-query]').forEach(function(btn){btn.onclick=function(){document.getElementById('bibleQ').value=btn.dataset.bibleQuery;searchBible()}});
  document.getElementById('loginForm').addEventListener('submit',async function(e){e.preventDefault();role=loginRole.value;var candidate=document.getElementById('password').value;document.getElementById('loginStatus').textContent='Verificando...';try{var response=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:candidate,role:role})});var data=await response.json();if(!data.ok)throw new Error('Senha incorreta');password=candidate;roleEl.value=role;sessionStorage.setItem('iasdRemotePassword',password);sessionStorage.setItem('iasdRemoteRole',role);document.getElementById('login').classList.remove('show');poll()}catch(err){document.getElementById('loginStatus').textContent=err.message}});
  fetch('/api/info').then(function(r){return r.json()}).then(function(info){if(info.requiresPassword&&!password)document.getElementById('login').classList.add('show');else poll()}).catch(function(){poll()});
})();
</script>
</body></html>`;
}
async function handleRemoteControlRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (request.method === 'GET' && url.pathname === '/ico/favicon.png') {
    const iconPath = path.join(__dirname, '..', 'dist', 'ico', 'favicon.png');
    if (!fs.existsSync(iconPath)) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200, {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    });
    fs.createReadStream(iconPath).pipe(response);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(getRemoteControlHtml());
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/info') {
    sendJson(response, 200, {
      ok: true,
      port: remoteControlConfig.port,
      addresses: getRemoteControlAddresses(),
      requiresPassword: remoteControlConfig.requirePassword && Boolean(remoteControlConfig.password),
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/login') {
    const body = await readRequestJson(request);
    const ok = !remoteControlConfig.requirePassword || body.password === remoteControlConfig.password;
    sendJson(response, ok ? 200 : 401, { ok });
    return;
  }

  if (!isRemoteControlPasswordValid(request)) {
    sendJson(response, 401, { ok: false, error: 'Senha obrigatoria.' });
    return;
  }

  const remoteRole = getRemoteControlRole(request);

  if (request.method === 'GET' && url.pathname === '/api/state') {
    sendJson(response, 200, { ok: true, role: remoteRole, state: remoteControlState });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/search') {
    const query = url.searchParams.get('q') || '';
    const results = searchRemoteSongs(query, url.searchParams.get('limit') || 30);
    sendJson(response, 200, {
      ok: true,
      ready: getRemoteSearchLibrary().length > 0,
      count: results.length,
      results,
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/bible/search') {
    const query = url.searchParams.get('q') || '';
    const data = searchRemoteBible(query, 'pt');
    sendJson(response, 200, {
      ok: true,
      ...data,
      count: data.results.length,
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/liturgy/today') {
    const data = await getRemoteTodayLiturgy();
    sendJson(response, 200, {
      ok: true,
      ...data,
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/play') {
    const body = await readRequestJson(request);
    if (!isRemoteControlActionAllowed(remoteRole, 'play')) {
      sendJson(response, 403, { ok: false, error: 'Perfil sem permissao para trocar a musica.' });
      return;
    }
    const reservation = reserveRemoteCommand(String(body.requestId || ''));
    if (!reservation.ok) {
      sendJson(response, 409, { ok: false, error: 'Outro comando esta sendo processado.', retryAfter: reservation.retryAfter });
      return;
    }
    if (reservation.duplicate) {
      sendJson(response, 200, { ok: true, duplicate: true });
      return;
    }
    const idMusic = Number(body.id_music);
    if (!Number.isFinite(idMusic) || idMusic <= 0) {
      sendJson(response, 400, { ok: false, error: 'Musica invalida.' });
      return;
    }

    const ok = sendRemoteControlCommand({
      type: 'open_media',
      id_music: idMusic,
      id_album: body.id_album ? Number(body.id_album) : null,
      mode: ['audio', 'instrumental', 'no_audio'].includes(body.mode) ? body.mode : 'audio',
    });
    sendJson(response, ok ? 200 : 503, { ok });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/bible/open') {
    const body = await readRequestJson(request);
    if (!isRemoteControlActionAllowed(remoteRole, 'bible_open')) {
      sendJson(response, 403, { ok: false, error: 'Perfil sem permissao para trocar a projecao.' });
      return;
    }
    const reservation = reserveRemoteCommand(String(body.requestId || ''));
    if (!reservation.ok) {
      sendJson(response, 409, { ok: false, error: 'Outro comando esta sendo processado.', retryAfter: reservation.retryAfter });
      return;
    }
    if (reservation.duplicate) {
      sendJson(response, 200, { ok: true, duplicate: true });
      return;
    }
    const payload = buildRemoteBiblePayload({
      versionId: body.id_bible_version,
      bookId: body.id_bible_book,
      chapter: body.chapter,
      verseNumbers: body.verses,
      locale: 'pt',
    });

    if (!payload) {
      sendJson(response, 400, { ok: false, error: 'Referencia invalida.' });
      return;
    }

    const ok = sendRemoteControlCommand({
      type: 'open_bible',
      bible: payload,
    });
    sendJson(response, ok ? 200 : 503, { ok });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/liturgy/open') {
    const body = await readRequestJson(request);
    if (!isRemoteControlActionAllowed(remoteRole, 'liturgy_open')) {
      sendJson(response, 403, { ok: false, error: 'Perfil sem permissao para abrir este item.' });
      return;
    }
    const reservation = reserveRemoteCommand(String(body.requestId || ''));
    if (!reservation.ok) {
      sendJson(response, 409, { ok: false, error: 'Outro comando esta sendo processado.', retryAfter: reservation.retryAfter });
      return;
    }
    if (reservation.duplicate) {
      sendJson(response, 200, { ok: true, duplicate: true });
      return;
    }
    if (!body.item || typeof body.item !== 'object') {
      sendJson(response, 400, { ok: false, error: 'Item invalido.' });
      return;
    }

    const ok = sendRemoteControlCommand({
      type: 'open_liturgy_item',
      item: body.item,
    });
    sendJson(response, ok ? 200 : 503, { ok });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/control') {
    const body = await readRequestJson(request);
    const action = String(body.action || '');
    if (!['play_pause', 'next', 'prev', 'close', 'maximize'].includes(action)) {
      sendJson(response, 400, { ok: false, error: 'Comando invalido.' });
      return;
    }
    if (!isRemoteControlActionAllowed(remoteRole, 'control', action)) {
      sendJson(response, 403, { ok: false, error: 'Este comando exige o perfil Operador.' });
      return;
    }
    const reservation = reserveRemoteCommand(String(body.requestId || ''));
    if (!reservation.ok) {
      sendJson(response, 409, { ok: false, error: 'Outro comando esta sendo processado.', retryAfter: reservation.retryAfter });
      return;
    }
    if (reservation.duplicate) {
      sendJson(response, 200, { ok: true, duplicate: true });
      return;
    }

    const ok = sendRemoteControlCommand({ type: 'control', action });
    sendJson(response, ok ? 200 : 503, { ok });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/emergency') {
    const body = await readRequestJson(request);
    const action = String(body.action || '');
    if (!['blackout', 'freeze', 'logo', 'clear'].includes(action)) {
      sendJson(response, 400, { ok: false, error: 'Acao de emergencia invalida.' });
      return;
    }
    if (!isRemoteControlActionAllowed(remoteRole, 'emergency')) {
      sendJson(response, 403, { ok: false, error: 'Acoes de emergencia exigem o perfil Operador.' });
      return;
    }
    const reservation = reserveRemoteCommand(String(body.requestId || ''));
    if (!reservation.ok) {
      sendJson(response, 409, { ok: false, error: 'Outro comando esta sendo processado.', retryAfter: reservation.retryAfter });
      return;
    }
    if (reservation.duplicate) {
      sendJson(response, 200, { ok: true, duplicate: true });
      return;
    }

    const ok = sendRemoteControlCommand({ type: 'emergency', action });
    sendJson(response, ok ? 200 : 503, { ok });
    return;
  }

  sendJson(response, 404, { ok: false, error: 'Nao encontrado.' });
}

function startRemoteControlServer() {
  if (remoteControlServer) return;
  if (remoteControlConfig.enabled === false) return;

  remoteControlServer = http.createServer((request, response) => {
    handleRemoteControlRequest(request, response).catch((error) => {
      console.error('[RemoteControl] Erro:', error);
      if (!response.headersSent) {
        sendJson(response, 500, { ok: false, error: 'Erro interno.' });
      } else {
        response.end();
      }
    });
  });

  remoteControlServer.listen(remoteControlConfig.port, remoteControlConfig.host, () => {
    const addresses = getRemoteControlAddresses();
    console.log(`[RemoteControl] Controle remoto ativo: ${addresses.join(' | ') || `http://localhost:${remoteControlConfig.port}`}`);
  });

  remoteControlServer.on('error', (error) => {
    console.error('[RemoteControl] Nao foi possivel iniciar:', error.message);
    remoteControlServer = null;
  });
}

function stopRemoteControlServer() {
  return new Promise((resolve) => {
    if (!remoteControlServer) {
      resolve(true);
      return;
    }

    remoteControlServer.close(() => {
      remoteControlServer = null;
      resolve(true);
    });
  });
}

async function getRemoteControlStatus() {
  const addresses = getRemoteControlAddresses();
  let qrCode = '';
  if (addresses[0]) {
    try {
      qrCode = await QRCode.toDataURL(addresses[0], {
        width: 320,
        margin: 2,
        color: { dark: '#081526', light: '#FFFFFF' },
      });
    } catch (error) {
      console.error('[RemoteControl] Nao foi possivel gerar QR Code:', error.message);
    }
  }

  return {
    running: Boolean(remoteControlServer),
    config: { ...remoteControlConfig, password: remoteControlConfig.password ? '********' : '' },
    addresses,
    qrCode,
    networkOptions: getRemoteControlNetworkOptions(),
  };
}

function resolveInsideBase(basePath, relativePath) {
  if (typeof relativePath !== 'string') return null;

  const normalizedRelativePath = relativePath.replace(/[\\/]+/g, path.sep);
  if (path.isAbsolute(normalizedRelativePath)) return null;

  const resolvedBase = path.resolve(basePath);
  const resolvedPath = path.resolve(resolvedBase, normalizedRelativePath);
  if (resolvedPath !== resolvedBase && !resolvedPath.startsWith(resolvedBase + path.sep)) {
    return null;
  }

  return resolvedPath;
}

function getMediaFolder(destFolderType) {
  return mediaFolders[destFolderType] || null;
}

function isAllowedExternalUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch (e) {
    return false;
  }
}

if (fs.existsSync(oldDbPath)) {
  try {
    const fsExtra = require('fs-extra');
    fsExtra.removeSync(oldDbPath);
  } catch (e) {
    // A remoção é best-effort; o app consegue recriar o diretório depois.
  }
}

[sysDbPath, mediaPath, coversPath, musicPath, slidesPath, backgroundsPath, presentationsPath].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function findSofficeExecutable() {
  const candidates = [
    process.env.LIBREOFFICE_PATH,
    'soffice',
    'libreoffice',
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  ].filter(Boolean);

  return candidates.find((candidate) => {
    if (candidate === 'soffice' || candidate === 'libreoffice') return true;
    return fs.existsSync(candidate);
  });
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, ...options });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', data => {
      stdout += data.toString();
    });
    child.stderr?.on('data', data => {
      stderr += data.toString();
    });
    child.on('error', error => {
      reject(new Error(`${error.message}${stderr ? `\n${stderr}` : ''}${stdout ? `\n${stdout}` : ''}`));
    });
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(stderr || stdout || `${command} exited with code ${code}`));
    });
  });
}

async function convertPresentationWithLibreOffice(sourcePath, outputDir) {
  const soffice = findSofficeExecutable();
  if (!soffice) throw new Error('LibreOffice nao encontrado.');

  await runProcess(soffice, [
    '--headless',
    '--convert-to',
    'pdf',
    '--outdir',
    outputDir,
    sourcePath,
  ]);

  const outputPath = path.join(outputDir, `${path.basename(sourcePath, path.extname(sourcePath))}.pdf`);
  if (!fs.existsSync(outputPath)) throw new Error('Conversao pelo LibreOffice nao gerou PDF.');
  return outputPath;
}

async function convertPresentationWithPowerPoint(sourcePath, outputPath) {
  const scriptPath = path.join(path.dirname(outputPath), 'convert-powerpoint.ps1');
  const script = [
    'param($sourceFile, $targetFile)',
    '$ErrorActionPreference = "Stop"',
    '$inputPath = [System.IO.Path]::GetFullPath($sourceFile)',
    '$outputPath = [System.IO.Path]::GetFullPath($targetFile)',
    'Unblock-File -LiteralPath $inputPath -ErrorAction SilentlyContinue',
    '$powerPoint = New-Object -ComObject PowerPoint.Application',
    '$powerPoint.DisplayAlerts = 1',
    '$presentation = $null',
    'try {',
    '  $presentation = $powerPoint.Presentations.Open($inputPath, $true, $false, $false)',
    '  try {',
    '    $presentation.ExportAsFixedFormat($outputPath, 2)',
    '  } catch {',
    '    $presentation.SaveAs($outputPath, 32)',
    '  }',
    '} finally {',
    '  if ($presentation -ne $null) { $presentation.Close() }',
    '  $powerPoint.Quit()',
    '  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null',
    '}',
  ].join('\r\n');

  fs.writeFileSync(scriptPath, script, 'utf8');
  try {
    await runProcess('powershell.exe', [
      '-NoProfile',
      '-Sta',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      sourcePath,
      outputPath,
    ]);
  } finally {
    try { fs.unlinkSync(scriptPath); } catch (e) { /* ignore */ }
  }

  if (!fs.existsSync(outputPath)) throw new Error('Conversao pelo PowerPoint nao gerou PDF.');
  return outputPath;
}

async function preparePresentationFile(sourcePath) {
  if (typeof sourcePath !== 'string' || !path.isAbsolute(sourcePath) || !fs.existsSync(sourcePath)) {
    return { ok: false, error: 'Arquivo invalido.' };
  }

  const ext = path.extname(sourcePath).toLowerCase();
  if (ext === '.pdf') {
    return { ok: true, filePath: sourcePath, sourcePath, sourceType: 'pdf' };
  }

  if (!['.ppt', '.pptx'].includes(ext)) {
    return { ok: false, error: 'Formato nao suportado.' };
  }

  const stat = fs.statSync(sourcePath);
  const cacheKey = crypto.createHash('sha1')
    .update(`${sourcePath}:${stat.size}:${stat.mtimeMs}`)
    .digest('hex');
  const outputDir = path.join(presentationsPath, cacheKey);
  const outputPath = path.join(outputDir, 'presentation.pdf');
  const cachedSourcePath = path.join(outputDir, `source${ext}`);
  fs.mkdirSync(outputDir, { recursive: true });

  if (fs.existsSync(outputPath)) {
    return { ok: true, filePath: outputPath, sourcePath, sourceType: ext.slice(1), converted: true };
  }

  fs.copyFileSync(sourcePath, cachedSourcePath);

  try {
    await convertPresentationWithPowerPoint(cachedSourcePath, outputPath);
    return { ok: true, filePath: outputPath, sourcePath, sourceType: ext.slice(1), converted: true };
  } catch (powerPointError) {
    try {
      const libreOfficePdf = await convertPresentationWithLibreOffice(cachedSourcePath, outputDir);
      fs.copyFileSync(libreOfficePdf, outputPath);
      return { ok: true, filePath: outputPath, sourcePath, sourceType: ext.slice(1), converted: true };
    } catch (libreOfficeError) {
      return {
        ok: false,
        filePath: null,
        sourcePath,
        sourceType: ext.slice(1),
        needsConversion: true,
        error: 'Nao foi possivel converter PowerPoint para PDF. Instale o Microsoft PowerPoint ou o LibreOffice, ou exporte o arquivo para PDF.',
        details: `${powerPointError.message || powerPointError}; ${libreOfficeError.message || libreOfficeError}`,
      };
    }
  }
}

ipcMain.handle('open-file-dialog', async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    title: options?.title || 'Selecionar Arquivo',
    filters: options?.filters || [
      { name: 'Vídeos', extensions: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('save-file-dialog', async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(win, {
    title: options?.title || 'Salvar Arquivo',
    defaultPath: options?.defaultPath,
    filters: options?.filters || [
      { name: 'Arquivos JSON', extensions: ['json'] },
    ],
  });
  if (result.canceled) return null;
  return result.filePath;
});

ipcMain.handle('read-text-file', async (event, filePath) => {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath) || !fs.existsSync(filePath)) {
    return { ok: false, error: 'Arquivo nao encontrado.' };
  }

  try {
    return { ok: true, content: fs.readFileSync(filePath, 'utf8') };
  } catch (error) {
    return { ok: false, error: error.message || 'Nao foi possivel ler o arquivo.' };
  }
});

ipcMain.handle('write-text-file', async (event, filePath, content) => {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
    return { ok: false, error: 'Caminho invalido.' };
  }
  if (typeof content !== 'string') {
    return { ok: false, error: 'Conteudo invalido.' };
  }

  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || 'Nao foi possivel salvar o arquivo.' };
  }
});

ipcMain.handle('open-external', async (event, url) => {
  if (isAllowedExternalUrl(url)) await shell.openExternal(url);
});

ipcMain.handle('open-path', async (event, filePath) => {
  if (typeof filePath === 'string' && path.isAbsolute(filePath) && fs.existsSync(filePath)) {
    await shell.openPath(filePath);
  }
});

ipcMain.handle('prepare-presentation-file', async (event, filePath) => {
  return preparePresentationFile(filePath);
});

ipcMain.handle('read-presentation-file', async (event, filePath) => {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath) || !fs.existsSync(filePath)) {
    return { ok: false, error: 'Arquivo nao encontrado.' };
  }

  if (path.extname(filePath).toLowerCase() !== '.pdf') {
    return { ok: false, error: 'O arquivo preparado nao e um PDF.' };
  }

  const fileBuffer = fs.readFileSync(filePath);
  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength,
  );

  return { ok: true, data: arrayBuffer };
});

ipcMain.handle('set-presentation-shortcuts-enabled', async (event, enabled) => {
  return setPresentationShortcutsEnabled(enabled === true);
});

ipcMain.on('get-user-data', (event) => {
  event.returnValue = readUserData(userPreferencesPath);
});

ipcMain.handle('save-user-data', async (event, data) => {
  try {
    writeUserData(userPreferencesPath, data);
    return { ok: true };
  } catch (error) {
    console.error('Erro ao salvar dados do usuario:', error);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('clear-all-data', async () => {
  try {
    const fsExtra = require('fs-extra');
    if (fsExtra.existsSync(sysDbPath)) fsExtra.emptyDirSync(sysDbPath);
    if (fsExtra.existsSync(mediaPath)) fsExtra.emptyDirSync(mediaPath);
    [sysDbPath, mediaPath, coversPath, musicPath, slidesPath, backgroundsPath].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
    return true;
  } catch (error) {
    console.error('Erro ao limpar dados:', error);
    return false;
  }
});

ipcMain.handle('save-custom-background', async (event, filename, data) => {
  try {
    const safeName = path.basename(String(filename || 'background'));
    const timestamp = Date.now();
    const finalName = `${timestamp}-${safeName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = resolveInsideBase(backgroundsPath, finalName);
    if (!filePath) return null;

    fs.writeFileSync(filePath, Buffer.from(data));
    return filePath;
  } catch (error) {
    console.error('Erro ao salvar fundo personalizado:', error);
    return null;
  }
});

ipcMain.handle('save-custom-music', async (event, sourcePath) => {
  try {
    if (typeof sourcePath !== 'string' || !path.isAbsolute(sourcePath) || !fs.existsSync(sourcePath)) {
      return null;
    }

    if (path.extname(sourcePath).toLowerCase() !== '.mp3') {
      return null;
    }

    const safeName = path.basename(sourcePath).replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalName = `custom/${Date.now()}-${safeName}`;
    const filePath = resolveInsideBase(musicPath, finalName);
    if (!filePath) return null;

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.copyFileSync(sourcePath, filePath);
    return `/musics/${finalName.replace(/\\/g, '/')}`;
  } catch (error) {
    console.error('Erro ao salvar musica personalizada:', error);
    return null;
  }
});

ipcMain.handle('get-local-db', async (event, filename) => {
  try {
    return readLocalDbFile(filename);
  } catch (error) {
    console.error('[Database] Erro lendo banco local:', filename, error.message);
    return null;
  }
});

ipcMain.handle('has-local-db-files', async (event, filenames) => {
  const files = Array.isArray(filenames) && filenames.length ? filenames : getRequiredLocalDbFiles();
  return hasRequiredLocalDbFiles(files);
});

ipcMain.handle('extract-bundled-database', async (event, language = 'pt') => {
  try {
    const bundledDbPath = getBundledDatabasePath();
    if (!bundledDbPath) {
      return { ok: false, error: 'Banco de dados local empacotado nao encontrado.' };
    }

    await extractDatabaseFromPath(bundledDbPath, language, language, (data) => {
      event.sender.send('extract-progress', data);
    });

    return { ok: true };
  } catch (error) {
    console.error('Erro ao extrair banco empacotado:', error);
    writeFirstBootErrorLog('extract-bundled-database', error);
    return { ok: false, error: error.message || String(error) };
  }
});

ipcMain.handle('save-local-db', async (event, filename, data) => {
  try {
    return writeLocalDbFile(filename, data);
  } catch (error) {
    console.error('[Database] Erro salvando banco local:', filename, error.message);
    return false;
  }
});

ipcMain.handle('extract-local-db', async (event, language = 'pt', sourceLanguage = language) => {
  try {
    const finalDbPath = path.join(app.getPath('userData'), 'database.db');

    if (!fs.existsSync(finalDbPath)) {
      throw new Error(`Arquivo não encontrado em: ${finalDbPath}`);
    }

    const stat = fs.statSync(finalDbPath);
    if (!stat.size) {
      throw new Error(`Arquivo baixado está vazio: ${finalDbPath}`);
    }

    await extractDatabaseFromPath(finalDbPath, language, sourceLanguage, (data) => {
      event.sender.send('extract-progress', data);
    });

    // Excluir após extração para economizar espaço
    try {
      fs.unlinkSync(finalDbPath);
    } catch(e) {
      console.error('Erro ao excluir database.db após extração:', e);
    }

    return { ok: true };
  } catch (error) {
    console.error('Erro na extração do banco:', error);
    writeFirstBootErrorLog('extract-local-db', error);
    return { ok: false, error: error.message || String(error) };
  }
});

let globalFtpParams = null;
let globalFtpParamsPromise = null;

async function getFtpParams() {
  if (globalFtpParams) return globalFtpParams;
  if (globalFtpParamsPromise) return globalFtpParamsPromise;

  globalFtpParamsPromise = (async () => {
    const response = await net.fetch('https://api.louvorja.com.br/params?type=env');
    if (!response.ok) throw new Error('Falha ao buscar parâmetros');
    const text = await response.text();

    const params = {};
    text.split('\n').forEach(line => {
      const idx = line.indexOf('=');
      if (idx > 0) {
        params[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    });

    const connFtp = params['conn_ftp'];
    if (!connFtp) throw new Error('conn_ftp não encontrado');

    // The authorization service uses the legacy PT tenant for shared FTP credentials.
    // Content language is selected later through the database filename.
    const payload = Buffer.from('pc_name=Electron&lang=PT').toString('base64');
    const ftpUrl = connFtp + (connFtp.includes('?') ? '&' : '?') + 'data=' + payload + '&lang=PT';

    const ftpResponse = await net.fetch(ftpUrl);
    if (!ftpResponse.ok) throw new Error('Falha ao autorizar FTP');
    const encodedFtpParams = await ftpResponse.text();

    const decodedFtpText = Buffer.from(encodedFtpParams, 'base64').toString('utf8');
    const ftpParams = {};
    decodedFtpText.split('\n').forEach(line => {
      const idx = line.indexOf('=');
      if (idx > 0) {
        ftpParams[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    });

    globalFtpParams = ftpParams;
    return ftpParams;
  })();

  try {
    return await globalFtpParamsPromise;
  } finally {
    globalFtpParamsPromise = null;
  }
}

ipcMain.handle('download-database', async (event, language = 'pt') => {
  let client = null;
  try {
    const ftpParams = await getFtpParams();

    client = new ftp.Client();

    await client.access({
      host: ftpParams['host'],
      user: ftpParams['username'],
      password: ftpParams['password'],
      port: parseInt(ftpParams['port'] || '21'),
      secure: false
    });

    const finalDbPath = path.join(app.getPath('userData'), 'database.db');
    const selectedLanguage = normalizeDatabaseLanguage(language);
    const langPrefix = getDatabaseSourceLanguage(selectedLanguage);
    const remotePath = (ftpParams['root'] || '/') + (ftpParams['root']?.endsWith('/') ? '' : '/') + `config/${langPrefix}_database.db`;

    let size = 0;
    try {
      size = await client.size(remotePath);
    } catch (e) {
      console.warn('Não foi possível obter o tamanho do arquivo via FTP:', e.message);
    }

    client.trackProgress(info => {
      if (size > 0) {
        const percent = Math.floor((info.bytesOverall / size) * 100);
        event.sender.send('download-db-progress', { progress: percent });
      }
    });

    const tempDbPath = `${finalDbPath}.download`;
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    await client.downloadTo(tempDbPath, remotePath);

    const stat = fs.statSync(tempDbPath);
    if (!stat.size) {
      throw new Error(`Banco baixado vazio de ${remotePath}`);
    }

    fs.renameSync(tempDbPath, finalDbPath);

    return { ok: true, language: selectedLanguage, sourceLanguage: langPrefix };
  } catch (error) {
    console.error('Erro no download do banco:', error);
    writeFirstBootErrorLog('download-database', error);
    return { ok: false, error: error.message || String(error) };
  } finally {
    if (client) {
      try { client.close(); } catch (e) { /* ignore */ }
    }
  }
});

// ======================== SISTEMA DE DOWNLOAD FTP PERSISTENTE ========================

let ftpClient = null;
let ftpCloseTimer = null;
let useFtpFallback = false;
let ftpFallbackTimer = null;

function resetFtpFallbackTimer() {
  if (ftpFallbackTimer) clearTimeout(ftpFallbackTimer);
  // Se não houver requisições de mídia por 2 minutos, voltamos a tentar HTTP
  ftpFallbackTimer = setTimeout(() => {
    console.log('[FTP] Timeout de inatividade HTTP atingido. Voltando a tentar HTTP...');
    useFtpFallback = false;
  }, 120000);
}

function scheduleFtpClose() {
  if (ftpCloseTimer) clearTimeout(ftpCloseTimer);
  // Fecha a conexão FTP se ficar 30s sem uso
  ftpCloseTimer = setTimeout(() => {
    if (ftpClient) {
      console.log('[FTP] Fechando conexão FTP por inatividade...');
      try { ftpClient.close(); } catch (e) { /* ignore */ }
      ftpClient = null;
    }
  }, 30000);
}

async function getOrCreateFtpClient() {
  if (ftpClient && !ftpClient.closed) {
    scheduleFtpClose();
    return ftpClient;
  }

  const ftpParams = await getFtpParams();
  const client = new ftp.Client();
  client.ftp.verbose = false;

  const host = ftpParams['host'];
  const user = ftpParams['username'];
  const port = parseInt(ftpParams['port'] || '21');

  await client.access({
    host: host,
    user: user,
    password: ftpParams['password'],
    port: port,
    secure: false
  });

  ftpClient = client;
  scheduleFtpClose();
  return client;
}

class Mutex {
  constructor() {
    this.queue = [];
    this.locked = false;
  }

  async lock() {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    return new Promise(resolve => this.queue.push(resolve));
  }

  unlock() {
    if (this.queue.length > 0) {
      const resolve = this.queue.shift();
      resolve();
    } else {
      this.locked = false;
    }
  }
}

const ftpMutex = new Mutex();

async function downloadMediaViaFtp(destFolderType, filename, filePath, retries = 2) {
  const ftpParams = await getFtpParams();

  let ftpFolder = 'config/capas';
  if (destFolderType === 'music') ftpFolder = 'config/musicas';
  else if (destFolderType === 'slides') ftpFolder = 'config/imagens';

  let cleanFilename = filename;
  // O servidor FTP não possui as subpastas pt/ ou es/ sob config/musicas
  if (cleanFilename.startsWith('pt/') || cleanFilename.startsWith('es/')) {
    cleanFilename = cleanFilename.substring(3);
  }

  // Construir o caminho remoto exatamente como o Delphi faz:
  // ftp_dir + arquivo_ftp (onde ftp_dir = root, e arquivo_ftp = config/musicas/...)
  const root = ftpParams['root'] || '/';
  const remotePath = root + (root.endsWith('/') ? '' : '/') + `${ftpFolder}/${cleanFilename}`;

  await ftpMutex.lock();
  try {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const client = await getOrCreateFtpClient();
        await client.downloadTo(filePath, remotePath);
        return; // sucesso
      } catch (err) {
        console.error(`[FTP] ERRO ao baixar ${remotePath}: ${err.message}`);
        // Se deu erro, fecha a conexão atual para forçar reconexão no próximo attempt
        if (ftpClient) {
          try { ftpClient.close(); } catch (e) { /* ignore */ }
          ftpClient = null;
        }

        if (attempt < retries) {
          const waitTime = 2000 * (attempt + 1); // 2s, 4s
          console.warn(`[FTP] Tentativa ${attempt + 1} falhou para ${cleanFilename}, retentando em ${waitTime/1000}s...`);
          await new Promise(r => setTimeout(r, waitTime));
        } else {
          throw err; // esgotou retries
        }
      }
    }
  } finally {
    ftpMutex.unlock();
  }
}

function buildApiUrl(destFolderType, filename) {
  // Constrói a URL real da API a partir do tipo e nome do arquivo
  // Mapeamento: music -> /musics/, slides -> /images/, covers -> /covers/
  let urlFolder = 'covers';
  if (destFolderType === 'music') urlFolder = 'musics';
  else if (destFolderType === 'slides') urlFolder = 'images';

  const cleanFilename = filename.replace(/\\/g, '/');
  return `https://api.louvorja.com.br/file/${urlFolder}/${encodeURIComponent(cleanFilename).replace(/%2F/g, '/')}`;
}

const activeMediaDownloads = new Map();

function isUsableMediaFile(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile() && stats.size > 0;
  } catch (error) {
    return false;
  }
}

function getLocalMediaUrl(destFolderType, decodedFilename) {
  const destFolder = getMediaFolder(destFolderType);
  if (!destFolder) return false;

  const filePath = resolveInsideBase(destFolder, decodedFilename);
  if (!filePath || !isUsableMediaFile(filePath)) return false;

  const cleanFilename = decodedFilename.replace(/\\/g, '/');
  const mappedType = destFolderType === 'slides' ? 'images' : destFolderType;
  return `local://media/${mappedType}/${cleanFilename}`;
}

async function replaceDownloadedMedia(tempPath, filePath) {
  await fs.promises.rm(filePath, { force: true });
  await fs.promises.rename(tempPath, filePath);
}

async function performMediaDownload(destFolderType, decodedFilename, filePath) {
  const fileDir = path.dirname(filePath);
  const tempPath = `${filePath}.download`;

  try {
    // Busca credenciais antes de um eventual fallback para FTP.
    await getFtpParams().catch(e => console.warn('Não foi possível fazer pre-fetch das credenciais FTP:', e.message));

    if (isUsableMediaFile(filePath)) return true;
    await fs.promises.mkdir(fileDir, { recursive: true });
    await fs.promises.rm(tempPath, { force: true });

    if (useFtpFallback) {
      resetFtpFallbackTimer();
      try {
        await downloadMediaViaFtp(destFolderType, decodedFilename, tempPath);
        if (!isUsableMediaFile(tempPath)) throw new Error('Arquivo baixado está vazio');
        await replaceDownloadedMedia(tempPath, filePath);
        return true;
      } catch (ftpError) {
        console.error('[FTP] Erro no fallback FTP (direto):', ftpError.message);
        return false;
      }
    }

    const apiUrl = buildApiUrl(destFolderType, decodedFilename);
    const response = await net.fetch(apiUrl);

    if (response.status === 429) {
      console.warn('[HTTP] Rate limit 429 atingido. Trocando para FTP para todos os downloads...');
      useFtpFallback = true;
      resetFtpFallbackTimer();
      try {
        await downloadMediaViaFtp(destFolderType, decodedFilename, tempPath);
        if (!isUsableMediaFile(tempPath)) throw new Error('Arquivo baixado está vazio');
        await replaceDownloadedMedia(tempPath, filePath);
        return true;
      } catch (ftpError) {
        console.error('[FTP] Erro no fallback FTP após 429:', ftpError.message);
        return false;
      }
    }

    if (!response.ok) return false;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) return false;
    await fs.promises.writeFile(tempPath, buffer);
    await replaceDownloadedMedia(tempPath, filePath);
    return true;
  } catch (error) {
    console.error('[Download] Erro baixando mídia:', error.message);
    return false;
  } finally {
    await fs.promises.rm(tempPath, { force: true }).catch(() => {});
  }
}

ipcMain.handle('download-media', async (event, url, destFolderType, filename) => {
  const destFolder = getMediaFolder(destFolderType);
  if (!destFolder || typeof filename !== 'string') return false;

  let decodedFilename;
  try {
    decodedFilename = decodeURIComponent(filename);
  } catch (error) {
    return false;
  }

  const filePath = resolveInsideBase(destFolder, decodedFilename);
  if (!filePath) return false;
  if (isUsableMediaFile(filePath)) return true;

  const downloadKey = path.normalize(filePath).toLowerCase();
  if (activeMediaDownloads.has(downloadKey)) {
    return activeMediaDownloads.get(downloadKey);
  }

  const download = performMediaDownload(destFolderType, decodedFilename, filePath)
    .finally(() => activeMediaDownloads.delete(downloadKey));
  activeMediaDownloads.set(downloadKey, download);
  return download;
});

ipcMain.handle('check-media', async (event, destFolderType, filename) => {
  try {
    return getLocalMediaUrl(destFolderType, decodeURIComponent(filename));
  } catch (error) {
    return false;
  }
});

ipcMain.handle('check-media-batch', async (event, items = []) => {
  if (!Array.isArray(items)) return [];

  return items.map((item) => {
    try {
      return getLocalMediaUrl(item?.type, decodeURIComponent(item?.filename || ''));
    } catch (error) {
      return false;
    }
  });
});
ipcMain.handle('delete-media', async (event, destFolderType, filename) => {
  const destFolder = getMediaFolder(destFolderType);
  if (!destFolder) return false;

  const decodedFilename = decodeURIComponent(filename);
  const filePath = resolveInsideBase(destFolder, decodedFilename);
  if (!filePath) return false;

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch (e) {
      console.error('Erro ao deletar mídia:', e);
      return false;
    }
  }
  return true;
});

ipcMain.handle('get-displays', () => {
  const { screen } = require('electron');
  return screen.getAllDisplays().map(d => ({
    id: d.id,
    bounds: d.bounds,
    workArea: d.workArea,
    scaleFactor: d.scaleFactor,
    isPrimary: d.id === screen.getPrimaryDisplay().id
  }));
});

ipcMain.handle('get-system-fonts', async () => {
  if (process.platform !== 'win32') return [];

  return new Promise((resolve) => {
    const command = [
      '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
      'Add-Type -AssemblyName System.Drawing',
      '$fonts = (New-Object System.Drawing.Text.InstalledFontCollection).Families | ForEach-Object { $_.Name } | Sort-Object -Unique',
      '$fonts | ConvertTo-Json -Compress',
    ].join('; ');
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
      windowsHide: true,
    });
    let stdout = '';
    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.on('error', () => resolve([]));
    child.on('close', code => {
      if (code !== 0 || !stdout.trim()) return resolve([]);
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(Array.isArray(parsed) ? parsed : [parsed]);
      } catch {
        resolve([]);
      }
    });
  });
});

ipcMain.handle('identify-displays', () => {
  const { screen } = require('electron');
  const displays = screen.getAllDisplays();

  displays.forEach((display, index) => {
    let win = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      focusable: false,
      hasShadow: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    win.setIgnoreMouseEvents(true);

    const html = `
      <html>
        <body style="margin:0; overflow:hidden; display:flex; align-items:center; justify-content:center; height:100vh; background-color: rgba(0,0,0,0.6);">
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 30vw; font-weight: bold; color: white; text-shadow: 0 10px 30px rgba(0,0,0,0.8);">
            ${index + 1}
          </div>
        </body>
      </html>
    `;

    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

    setTimeout(() => {
      if (win && !win.isDestroyed()) {
        win.close();
      }
    }, 3000);
  });
  return true;
});

ipcMain.handle('get-remote-control-status', () => getRemoteControlStatus());
ipcMain.handle('set-remote-control-state', (event, state) => updateRemoteControlState(state));

ipcMain.handle('get-automation-config', () => automationConfig);

ipcMain.handle('save-automation-config', (event, config) => saveAutomationConfig(config));

ipcMain.handle('test-automation-device', async (event, device) => {
  if (!device || device.type !== 'soundcraft-ui') {
    return { ok: false, error: 'Dispositivo invalido.' };
  }

  const targetIP = normalizeSoundcraftTarget(device.ip);
  if (!targetIP) {
    return { ok: false, error: 'Informe o IP da Soundcraft Ui16.' };
  }

  try {
    await probeSoundcraftHttp(targetIP);
  } catch (error) {
    return {
      ok: false,
      error: `Nao foi possivel acessar http://${targetIP}. Confirme se o computador esta na mesma rede da Ui16 e se o IP esta correto.`,
    };
  }

  try {
    const conn = await getSoundcraftConnection({ ...device, ip: targetIP });
    await wait(250);
    return { ok: Boolean(conn) };
  } catch (error) {
    return {
      ok: false,
      error: `${error.message} A pagina da mesa respondeu em http://${targetIP}, mas o canal de controle WebSocket nao abriu.`,
    };
  }
});

ipcMain.handle('test-automation-trigger', async (event, trigger) => {
  const previousConfig = automationConfig;
  try {
    const sanitized = sanitizeAutomationConfig({
      ...automationConfig,
      triggers: [trigger],
    });
    automationConfig = {
      ...automationConfig,
      triggers: sanitized.triggers,
    };
    return await executeAutomationTrigger(sanitized.triggers[0], { test: true });
  } catch (error) {
    return { ok: false, error: error.message };
  } finally {
    automationConfig = previousConfig;
  }
});

ipcMain.handle('run-automation-trigger', async (event, triggerId, context = {}) => {
  if (!automationConfig.enabled) return { ok: true, skipped: true };

  const trigger = automationConfig.triggers.find(item => item.id === triggerId);
  if (!trigger) return { ok: false, error: 'Gatilho nao encontrado.' };

  try {
    return await executeAutomationTrigger(trigger, context);
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('restore-automation', async (event, reason = '') => restorePendingAutomation(reason));

ipcMain.handle('get-performance-config', () => performanceConfig);

ipcMain.handle('save-performance-config', (event, config) => savePerformanceConfig(config));

ipcMain.handle('save-remote-control-config', async (event, config) => {
  const nextConfig = { ...config };
  if (nextConfig.password === '********') {
    nextConfig.password = remoteControlConfig.password;
  }

  saveRemoteControlConfig(nextConfig);

  if (remoteControlServer) {
    await stopRemoteControlServer();
  }
  if (remoteControlConfig.enabled) {
    startRemoteControlServer();
  }

  return getRemoteControlStatus();
});

ipcMain.handle('start-remote-control-server', () => {
  remoteControlConfig.enabled = true;
  saveRemoteControlConfig(remoteControlConfig);
  startRemoteControlServer();
  return getRemoteControlStatus();
});

ipcMain.handle('stop-remote-control-server', async () => {
  remoteControlConfig.enabled = false;
  saveRemoteControlConfig(remoteControlConfig);
  await stopRemoteControlServer();
  return getRemoteControlStatus();
});

const isDev = !app.isPackaged;
const youtubeEmbedUrlFilter = {
  urls: [
    'https://www.youtube.com/embed/*',
    'https://www.youtube-nocookie.com/embed/*',
  ],
};
const staticMimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

function getStaticMimeType(filePath) {
  return staticMimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function sendStaticFile(response, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      'Content-Type': getStaticMimeType(filePath),
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': extension === '.html' ? 'no-store' : 'public, max-age=31536000, immutable',
    });
    response.end(data);
  });
}

function resolveDistFile(urlPath) {
  const distPath = path.join(__dirname, '..', 'dist');
  let pathname = '/';
  try {
    pathname = decodeURIComponent(urlPath.split('?')[0].split('#')[0] || '/');
  } catch (error) {
    pathname = '/';
  }

  const relativePath = pathname === '/'
    ? 'index.html'
    : pathname.replace(/^\/+/, '');
  const resolvedPath = path.resolve(distPath, relativePath);
  const resolvedDist = path.resolve(distPath);

  if (resolvedPath !== resolvedDist && !resolvedPath.startsWith(resolvedDist + path.sep)) {
    return path.join(distPath, 'index.html');
  }

  if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
    return resolvedPath;
  }

  return path.join(distPath, 'index.html');
}

function startProductionAppServer() {
  return new Promise((resolve, reject) => {
    if (productionAppUrl) {
      resolve(productionAppUrl);
      return;
    }

    productionAppServer = http.createServer((request, response) => {
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Method not allowed');
        return;
      }

      const filePath = resolveDistFile(request.url || '/');
      if (request.method === 'HEAD') {
        response.writeHead(200, {
          'Content-Type': getStaticMimeType(filePath),
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        });
        response.end();
        return;
      }

      sendStaticFile(response, filePath);
    });

    productionAppServer.once('error', reject);
    productionAppServer.listen(0, '127.0.0.1', () => {
      const address = productionAppServer.address();
      productionAppUrl = `http://127.0.0.1:${address.port}`;
      productionAppServer.removeListener('error', reject);
      resolve(productionAppUrl);
    });
  });
}

function stopProductionAppServer() {
  if (!productionAppServer) return;
  productionAppServer.close();
  productionAppServer = null;
  productionAppUrl = null;
}

function setupYouTubeEmbedHeaders() {
  session.defaultSession.webRequest.onBeforeSendHeaders(youtubeEmbedUrlFilter, (details, callback) => {
    const requestHeaders = { ...details.requestHeaders };
    const refererKey = Object.keys(requestHeaders).find(key => key.toLowerCase() === 'referer');
    const originKey = Object.keys(requestHeaders).find(key => key.toLowerCase() === 'origin');
    const currentReferer = refererKey ? String(requestHeaders[refererKey] || '') : '';
    const currentOrigin = originKey ? String(requestHeaders[originKey] || '') : '';

    const fallbackOrigin = productionAppUrl || 'http://127.0.0.1';
    requestHeaders[refererKey || 'Referer'] = /^https?:\/\//i.test(currentReferer)
      ? currentReferer
      : `${fallbackOrigin}/`;
    if (originKey && !/^https?:\/\//i.test(currentOrigin)) {
      requestHeaders[originKey] = fallbackOrigin;
    }

    callback({ requestHeaders });
  });
}

async function clearDesktopWebAppCaches() {
  if (isDev) return;

  try {
    await session.defaultSession.clearStorageData({
      storages: ['serviceworkers', 'cachestorage'],
    });
  } catch (error) {
    console.warn('Erro ao limpar cache/service worker do app:', error.message);
  }
}

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1300,
    height: 900,
    minWidth: 920,
    minHeight: 760,
    title: 'IASDPresenter',
    icon: path.join(__dirname, '../public/ico/favicon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: true,
    },
    frame: false
  });
  mainAppWindow = mainWindow;

  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized-state', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized-state', false);
  });

  // Menu nativo personalizado
  const menuTemplate = [
    // macOS: menu com nome do app
    ...(process.platform === 'darwin' ? [{
      label: 'IASDPresenter',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }, {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' }
      ]
    }] : []),
    {
      label: 'Página Inicial',
      submenu: [
        {
          label: 'Ir para Página Inicial',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            mainWindow.webContents.send('navigate-module', 'home');
          },
        },
        {
          label: 'Buscar M\u00fasicas',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            mainWindow.webContents.send('open-quick-search', 'music');
          },
        }
      ]
    },
    {
      label: 'Álbuns e Coletâneas',
      submenu: [
        {
          label: 'Hinário Adventista',
          click: () => {
            mainWindow.webContents.send('navigate-module', 'hymnal');
          },
        },
        {
          label: 'Hinário Adventista - 1996',
          click: () => {
            mainWindow.webContents.send('navigate-module', 'hymnal_1996');
          },
        },
        {
          label: 'Álbuns',
          click: () => {
            mainWindow.webContents.send('navigate-module', 'collections');
          },
        },
      ],
    },
    {
      label: 'Bíblia',
      submenu: [
        {
          label: 'Abrir Bíblia',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            mainWindow.webContents.send('open-quick-search', 'bible');
          },
        }
      ]
    },
    {
      label: 'Utilitários',
      submenu: [
        {
          label: 'Módulos utilitários',
          enabled: false
        }
      ]
    },
    {
      label: 'Biblioteca Local',
      submenu: [
        {
          label: 'Abrir Biblioteca',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            mainWindow.webContents.send('navigate-module', 'sync');
          },
        }
      ]
    },
    {
      label: 'Configurações',
      submenu: [
        {
          label: 'Abrir Configurações',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('navigate-module', 'config');
          },
        }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Ajuda e Sobre',
          click: () => {
            mainWindow.webContents.send('navigate-route', 'help');
          },
        }
      ]
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.webContents.setWindowOpenHandler(({ url, features }) => {
    const isFullscreen = features.includes('fullscreen=yes');
    const { screen } = require('electron');
    const displays = screen.getAllDisplays();

    let windowConfig = {
      width: 800,
      height: 600,
      backgroundColor: '#000000',
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: true,
      }
    };

    const monitorMatch = features.match(/monitor=(\d+)/);
    const targetMonitorId = monitorMatch ? parseInt(monitorMatch[1]) : null;

    if (isFullscreen) {
      let targetDisplay = null;
      if (targetMonitorId) {
        targetDisplay = displays.find(d => d.id === targetMonitorId);
      }

      if (!targetDisplay && displays.length > 1) {
        const primary = screen.getPrimaryDisplay();
        targetDisplay = displays.find(d => d.id !== primary.id);
      }

      if (!targetDisplay) {
        targetDisplay = screen.getPrimaryDisplay();
      }

      windowConfig.x = targetDisplay.bounds.x;
      windowConfig.y = targetDisplay.bounds.y;
      windowConfig.width = targetDisplay.bounds.width;
      windowConfig.height = targetDisplay.bounds.height;
      windowConfig.resizable = false;
      windowConfig.frame = false;
      windowConfig.thickFrame = false;
      windowConfig.hasShadow = false;
      windowConfig.autoHideMenuBar = true;
      windowConfig.skipTaskbar = true;
      // O fullscreen puro não é ativado na criação no Windows para evitar o bug
    }

    return {
      action: 'allow',
      overrideBrowserWindowOptions: windowConfig
    };
  });

  mainWindow.webContents.on('did-create-window', (childWindow) => {
    childWindow.once('ready-to-show', () => {
      if (!childWindow.isResizable()) {
        if (process.platform === 'win32') {
          const { screen } = require('electron');
          const bounds = childWindow.getBounds();
          const display = screen.getDisplayMatching(bounds);

          childWindow.setFullScreen(false);
          childWindow.setBounds(display.bounds);
          childWindow.setAlwaysOnTop(true, 'screen-saver');
        } else {
          childWindow.setFullScreen(true);
        }
      }
      childWindow.show();
    });
  });

  if (isDev) {
    // Em desenvolvimento, carrega o servidor Vite
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    // Em produção, carrega o build estático por HTTP local para fornecer Referer válido a embeds externos.
    const appUrl = await startProductionAppServer();
    mainWindow.loadURL(appUrl);
  }

  // Intercepta o evento de fechar para perguntar ao usuário
  mainWindow.on('close', (e) => {
    if (!global.isQuitting) {
      e.preventDefault();
      mainWindow.webContents.send('request-close-app');
    }
  });
}



// Registra o protocolo customizado como privilegiado ANTES do app estar pronto
protocol.registerSchemesAsPrivileged([
  { scheme: 'local', privileges: { standard: true, bypassCSP: true, supportFetchAPI: true, secure: true, corsEnabled: true, stream: true } }
]);

app.whenReady().then(async () => {
  await migrateLocalMusicLibrary({
    appDataPath: app.getPath('appData'),
    currentUserDataPath: userDataPath,
  });

  // Bloqueios de Segurança para Produção (Impede DevTools e Reload)
  if (!isDev) {
    app.on('browser-window-created', (event, window) => {
      window.webContents.on('before-input-event', (event, input) => {
        const isReload = (input.control && input.key.toLowerCase() === 'r') || input.key === 'F5';
        const isDevTools = (input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12';
        if (isReload || isDevTools) {
          event.preventDefault();
        }
      });
      window.webContents.on('devtools-opened', () => {
        window.webContents.closeDevTools();
      });
    });
  }

  // Protocolo customizado para carregar mídia local offline via API nativa do Chromium
  // Garante suporte perfeito a Range requests e MP4 metadata buffering
  protocol.registerFileProtocol('local', (request, callback) => {
    let url;
    try {
      url = new URL(request.url);
    } catch(e) {
      return callback({ error: -2 }); // net::ERR_FAILED
    }

    let filePath = decodeURIComponent(url.pathname);
    const host = url.host;

    if (host === 'app') {
      // Arquivo externo absoluto (ex: local://app/Users/...)
      if (process.platform === 'win32' && url.pathname.match(/^\/[a-zA-Z]%3A\//i)) {
        filePath = decodeURIComponent(url.pathname).slice(1);
      }
      if (process.platform === 'win32' && filePath.match(/^\/[a-zA-Z]:\//)) {
        filePath = filePath.slice(1);
      }
      if (!path.isAbsolute(filePath) || !fs.existsSync(filePath)) {
        return callback({ error: -6 }); // net::ERR_FILE_NOT_FOUND
      }
      return callback({ path: filePath });
    }

    // Caminho relativo da biblioteca (ex: local:///musics/... ou local://media/covers/...)
    let fallbackPath = '';
    if (host === 'media') {
      fallbackPath = filePath;
    } else if (host) {
      fallbackPath = '/' + host + filePath;
    } else {
      fallbackPath = filePath;
    }

    const userDataPath = app.getPath('userData');
    const mediaPath = path.join(userDataPath, 'Media');
    filePath = path.join(mediaPath, fallbackPath);

    if (!fs.existsSync(filePath)) {
      // Proxy transparente: baixa da API e salva localmente antes de servir
      const apiUrl = `https://api.louvorja.com.br/file${fallbackPath.replace(/\\/g, '/')}`;
      net.fetch(apiUrl).then(res => {
        if (res.ok) {
          return res.arrayBuffer();
        }
        throw new Error('API request failed');
      }).then(buffer => {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, Buffer.from(buffer));
        callback({ path: filePath });
      }).catch(err => {
        console.error("Fallback download error:", err);
        callback({ error: -6 }); // net::ERR_FILE_NOT_FOUND
      });
      return;
    }

    callback({ path: filePath });
  });

  startRemoteControlServer();
  setupYouTubeEmbedHeaders();
  await clearDesktopWebAppCaches();
  await createWindow();
  setupAutoUpdater();

  const { screen } = require('electron');
  const notifyDisplaysChanged = () => {
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send('displays-changed');
      }
    });
  };

  screen.on('display-added', notifyDisplaysChanged);
  screen.on('display-removed', notifyDisplaysChanged);
  screen.on('display-metrics-changed', notifyDisplaysChanged);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch(error => {
        console.error('Erro ao criar janela:', error);
      });
    }
  });
});

// Controle customizado da barra de título
ipcMain.handle('window-control', (event, action) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  if (action === 'minimize') {
    win.minimize();
  } else if (action === 'maximize') {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  } else if (action === 'close') {
    // Em vez de fechar direto, pede confirmação
    if (win === BrowserWindow.getAllWindows()[0] || win.id === 1) { // mainWindow
      win.webContents.send('request-close-app');
    } else {
      win.close();
    }
  } else if (action === 'is-maximized') {
    return win.isMaximized();
  }
});

// Encerra o aplicativo inteiro à força após confirmação do usuário
ipcMain.handle('force-quit-app', () => {
  global.isQuitting = true;
  app.quit();
});
app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopProductionAppServer();
  if (remoteControlServer) {
    remoteControlServer.close();
    remoteControlServer = null;
  }
});

// ==========================================
// Auto-Updater
// ==========================================
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let autoUpdaterInitialized = false;
let autoUpdaterState = { status: 'idle' };

function setAutoUpdaterState(status, payload = {}) {
  autoUpdaterState = {
    ...autoUpdaterState,
    ...payload,
    status,
  };
}

function sendAutoUpdaterEvent(channel, payload) {
  const mainWin = mainAppWindow && !mainAppWindow.isDestroyed()
    ? mainAppWindow
    : BrowserWindow.getAllWindows().find(win => !win.isDestroyed());

  if (!mainWin || mainWin.webContents.isDestroyed()) return;
  mainWin.webContents.send(channel, payload);
}

function setupAutoUpdater() {
  if (autoUpdaterInitialized) return;
  autoUpdaterInitialized = true;

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    setAutoUpdaterState('available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
    sendAutoUpdaterEvent('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('No update available. Current version is up-to-date.');
    setAutoUpdaterState('not-available', { version: info.version });
    sendAutoUpdaterEvent('update-not-available', {
      version: info.version,
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    setAutoUpdaterState('downloading', {
      downloadPercent: Math.round(progress.percent),
    });
    sendAutoUpdaterEvent('update-download-progress', {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version);
    setAutoUpdaterState('ready', {
      version: info.version,
      downloadPercent: 100,
    });
    sendAutoUpdaterEvent('update-downloaded', {
      version: info.version,
    });
  });

  autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error.message);
    setAutoUpdaterState('error', { error: error.message });
    sendAutoUpdaterEvent('update-error', {
      message: error.message,
    });
  });

  // Verifica atualizações 5 segundos após iniciar
  setTimeout(() => {
    if (autoUpdaterState.status !== 'idle') return;
    setAutoUpdaterState('checking', { error: null });
    autoUpdater.checkForUpdates().catch((err) => {
      console.log('Check for updates failed:', err.message);
    });
  }, 5000);
}

ipcMain.handle('get-update-state', () => autoUpdaterState);

ipcMain.handle('check-for-updates', async () => {
  try {
    setupAutoUpdater();
    setAutoUpdaterState('checking', { error: null });
    const result = await autoUpdater.checkForUpdates();
    return result;
  } catch (error) {
    console.error('Check for updates error:', error.message);
    return null;
  }
});

ipcMain.handle('download-update', async () => {
  try {
    setAutoUpdaterState('downloading', { downloadPercent: 0, error: null });
    await autoUpdater.downloadUpdate();
    return true;
  } catch (error) {
    console.error('Download update error:', error.message);
    return false;
  }
});

ipcMain.handle('quit-and-install', () => {
  global.isQuitting = true;
  autoUpdater.quitAndInstall(true, true);
});
