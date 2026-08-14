const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getUserData: () => ipcRenderer.sendSync('get-user-data'),
  saveUserData: (data) => ipcRenderer.invoke('save-user-data', data),
  getLocalDb: (filename) => ipcRenderer.invoke('get-local-db', filename),
  saveLocalDb: (filename, data) => ipcRenderer.invoke('save-local-db', filename, data),
  
  downloadMedia: (url, destFolderType, filename) => ipcRenderer.invoke('download-media', url, destFolderType, filename),
  checkMedia: (destFolderType, filename) => ipcRenderer.invoke('check-media', destFolderType, filename),
  checkMediaBatch: (items) => ipcRenderer.invoke('check-media-batch', items),
  deleteMedia: (destFolderType, filename) => ipcRenderer.invoke('delete-media', destFolderType, filename),
  saveCustomBackground: (filename, data) => ipcRenderer.invoke('save-custom-background', filename, data),
  saveCustomMusic: (filePath) => ipcRenderer.invoke('save-custom-music', filePath),
  
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),
  readTextFile: (filePath) => ipcRenderer.invoke('read-text-file', filePath),
  writeTextFile: (filePath, content) => ipcRenderer.invoke('write-text-file', filePath, content),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openPath: (filePath) => ipcRenderer.invoke('open-path', filePath),
  preparePresentationFile: (filePath) => ipcRenderer.invoke('prepare-presentation-file', filePath),
  readPresentationFile: (filePath) => ipcRenderer.invoke('read-presentation-file', filePath),
  setPresentationShortcutsEnabled: (enabled) => ipcRenderer.invoke('set-presentation-shortcuts-enabled', enabled),
  onPresentationShortcut: (callback) => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on('presentation-shortcut', listener);
    return () => ipcRenderer.removeListener('presentation-shortcut', listener);
  },
  clearAllData: () => ipcRenderer.invoke('clear-all-data'),
  hasLocalDbFiles: (filenames) => ipcRenderer.invoke('has-local-db-files', filenames),
  extractBundledDatabase: (language) => ipcRenderer.invoke('extract-bundled-database', language),
  extractLocalDb: (language, sourceLanguage) => ipcRenderer.invoke('extract-local-db', language, sourceLanguage),
  downloadDatabase: (language) => ipcRenderer.invoke('download-database', language),
  
  windowControl: (action) => ipcRenderer.invoke('window-control', action),
  onWindowMaximizedState: (callback) => {
    ipcRenderer.on('window-maximized-state', (_event, isMaximized) => callback(isMaximized));
  },
  onRequestCloseApp: (callback) => {
    ipcRenderer.on('request-close-app', () => callback());
  },
  forceQuitApp: () => ipcRenderer.invoke('force-quit-app'),
  
  onNavigateModule: (callback) => {
    ipcRenderer.on('navigate-module', (_event, moduleId) => callback(moduleId));
  },
  onNavigateRoute: (callback) => {
    ipcRenderer.on('navigate-route', (_event, routeName) => callback(routeName));
  },
  onOpenQuickSearch: (callback) => {
    const listener = (_event, mode) => callback(mode);
    ipcRenderer.on('open-quick-search', listener);
    return () => ipcRenderer.removeListener('open-quick-search', listener);
  },
  onRemoteControlCommand: (callback) => {
    const listener = (_event, command) => callback(command);
    ipcRenderer.on('remote-control-command', listener);
    return () => ipcRenderer.removeListener('remote-control-command', listener);
  },
  onExtractProgress: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('extract-progress', listener);
    return () => ipcRenderer.removeListener('extract-progress', listener);
  },
  onDownloadDbProgress: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('download-db-progress', listener);
    return () => ipcRenderer.removeListener('download-db-progress', listener);
  },
  
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  getSystemFonts: () => ipcRenderer.invoke('get-system-fonts'),
  identifyDisplays: () => ipcRenderer.invoke('identify-displays'),
  onDisplaysChanged: (callback) => ipcRenderer.on('displays-changed', callback),
  getRemoteControlStatus: () => ipcRenderer.invoke('get-remote-control-status'),
  setRemoteControlState: (state) => ipcRenderer.invoke('set-remote-control-state', state),
  saveRemoteControlConfig: (config) => ipcRenderer.invoke('save-remote-control-config', config),
  startRemoteControlServer: () => ipcRenderer.invoke('start-remote-control-server'),
  stopRemoteControlServer: () => ipcRenderer.invoke('stop-remote-control-server'),
  getAutomationConfig: () => ipcRenderer.invoke('get-automation-config'),
  saveAutomationConfig: (config) => ipcRenderer.invoke('save-automation-config', config),
  testAutomationDevice: (device) => ipcRenderer.invoke('test-automation-device', device),
  testAutomationTrigger: (trigger) => ipcRenderer.invoke('test-automation-trigger', trigger),
  runAutomationTrigger: (triggerId, context) => ipcRenderer.invoke('run-automation-trigger', triggerId, context),
  restoreAutomation: (reason) => ipcRenderer.invoke('restore-automation', reason),
  getPerformanceConfig: () => ipcRenderer.invoke('get-performance-config'),
  savePerformanceConfig: (config) => ipcRenderer.invoke('save-performance-config', config),
  
  // Auto-Update
  getUpdateState: () => ipcRenderer.invoke('get-update-state'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  onUpdateAvailable: (callback) => {
    const listener = (_event, info) => callback(info);
    ipcRenderer.on('update-available', listener);
    return () => ipcRenderer.removeListener('update-available', listener);
  },
  onUpdateNotAvailable: (callback) => {
    const listener = (_event, info) => callback(info);
    ipcRenderer.on('update-not-available', listener);
    return () => ipcRenderer.removeListener('update-not-available', listener);
  },
  onUpdateDownloadProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('update-download-progress', listener);
    return () => ipcRenderer.removeListener('update-download-progress', listener);
  },
  onUpdateDownloaded: (callback) => {
    const listener = (_event, info) => callback(info);
    ipcRenderer.on('update-downloaded', listener);
    return () => ipcRenderer.removeListener('update-downloaded', listener);
  },
  onUpdateError: (callback) => {
    const listener = (_event, error) => callback(error);
    ipcRenderer.on('update-error', listener);
    return () => ipcRenderer.removeListener('update-error', listener);
  },
});
