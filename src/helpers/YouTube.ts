import { getYouTubeEmbedUrl as buildYouTubeEmbedUrl } from "../../electron/YouTube";
export { getYouTubeVideoId, getYouTubeStartSeconds, isYouTubeUrl, YOUTUBE_PLAYER_ORIGIN } from "../../electron/YouTube";

export function getYouTubeEmbedUrl(value, options = {}) {
  const origin = typeof window === "undefined" ? "" : window.location?.origin || "";
  return buildYouTubeEmbedUrl(value, { ...options, origin });
}
