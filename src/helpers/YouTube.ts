const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_HOST_PATTERN = /(^|\.)youtube(-nocookie)?\.com$/;
export const YOUTUBE_PLAYER_ORIGIN = "https://www.youtube.com";

function getCurrentOrigin() {
  if (typeof window === "undefined" || !window.location?.origin) return "";
  const origin = window.location.origin;
  return /^https?:\/\//i.test(origin) ? origin : "";
}

function parseTimeValue(value) {
  if (!value) return 0;
  const input = String(value).trim().toLowerCase();

  if (/^\d+$/.test(input)) return Number(input);

  const match = input.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  if (!match) return 0;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return (hours * 3600) + (minutes * 60) + seconds;
}

function getYouTubeUrl(value) {
  try {
    return new URL(String(value || "").trim());
  } catch (error) {
    return null;
  }
}

export function getYouTubeVideoId(value) {
  const url = getYouTubeUrl(value);
  if (!url) return "";

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    return YOUTUBE_ID_PATTERN.test(parts[0] || "") ? parts[0] : "";
  }

  if (!YOUTUBE_HOST_PATTERN.test(host)) return "";

  const watchId = url.searchParams.get("v");
  if (YOUTUBE_ID_PATTERN.test(watchId || "")) return watchId;

  const knownPathIndex = parts.findIndex(part => ["embed", "shorts", "live", "v"].includes(part));
  if (knownPathIndex >= 0) {
    const pathId = parts[knownPathIndex + 1];
    return YOUTUBE_ID_PATTERN.test(pathId || "") ? pathId : "";
  }

  return "";
}

export function isYouTubeUrl(value) {
  return Boolean(getYouTubeVideoId(value));
}

export function getYouTubeStartSeconds(value) {
  const url = getYouTubeUrl(value);
  if (!url) return 0;

  return parseTimeValue(url.searchParams.get("t"))
    || parseTimeValue(url.searchParams.get("start"));
}

export function getYouTubeEmbedUrl(value, { autoplay = true, muted = false, controls = false } = {}) {
  const videoId = getYouTubeVideoId(value);
  if (!videoId) return "";
  const start = getYouTubeStartSeconds(value);
  const origin = getCurrentOrigin();

  const params = new URLSearchParams({
    enablejsapi: "1",
    autoplay: autoplay ? "1" : "0",
    controls: controls ? "1" : "0",
    disablekb: "1",
    fs: "0",
    iv_load_policy: "3",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });

  if (origin) {
    params.set("origin", origin);
  }

  if (start > 0) {
    params.set("start", String(start));
  }

  if (muted) {
    params.set("mute", "1");
  }

  return `${YOUTUBE_PLAYER_ORIGIN}/embed/${videoId}?${params.toString()}`;
}
