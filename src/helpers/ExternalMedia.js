export const AUDIO_EXTENSIONS = ["mp3", "wav", "flac", "aac", "ogg", "wma", "m4a"];
export const VIDEO_EXTENSIONS = ["mp4", "mkv", "avi", "mov", "wmv", "webm"];

export function getFileExtension(value) {
  if (!value) return "";
  const cleanValue = String(value).split(/[?#]/)[0];
  const fileName = cleanValue.split(/[\\/]/).pop() || "";
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

export function isAudioFile(value) {
  return AUDIO_EXTENSIONS.includes(getFileExtension(value));
}

export function isVideoFile(value) {
  return VIDEO_EXTENSIONS.includes(getFileExtension(value));
}

export function openExternalMedia(appdata, { filePath, title = "", subtitle = "", volume = null }) {
  const currentVolume = appdata.get("modules.external_media.config.volume");

  appdata.set("modules.external_media.filePath", filePath);
  appdata.set("modules.external_media.title", title);
  appdata.set("modules.external_media.subtitle", subtitle);
  appdata.set("modules.external_media.minimized", false);
  appdata.set("modules.external_media.config", {
    is_paused: false,
    current_time: 0,
    progress: 0,
    duration: 0,
    volume: volume ?? currentVolume ?? 100,
    document_page: 1,
    request_action: null,
  });
}
