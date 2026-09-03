<template>
  <div class="w-100 h-100 bg-black d-flex align-center justify-center">
    <iframe
      v-if="isYouTube && youtubeEmbedUrl"
      ref="popupYouTube"
      class="external-youtube-frame"
      :src="youtubeEmbedUrl"
      :title="mediaTitle"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"
      @load="onYouTubeLoad"
    />
    <webview
      v-else-if="isWebLink"
      class="external-web-frame"
      :src="rawFilePath"
      webpreferences="contextIsolation=yes, sandbox=yes"
    />
    <video
      v-else-if="isVideo && filePath"
      ref="popupVideo"
      class="w-100 h-100"
      style="object-fit: contain;"
      :src="filePath"
      preload="auto"
      autoplay
      muted
      playsinline
      disablepictureinpicture
      @canplay="onCanPlay"
      @ended="onEnded"
      @error="onError"
    />
    <iframe
      v-else-if="isDocument && filePath"
      :key="documentFrameKey"
      class="external-document-frame"
      :src="documentUrl"
      :title="mediaTitle"
    />
    <div
      v-else-if="isPresentation && filePath"
      class="d-flex flex-column align-center justify-center text-white px-8 text-center"
      style="gap: 16px; max-width: 560px;"
    >
      <v-icon size="80" color="white" style="opacity: 0.7;">
        mdi-file-powerpoint-box
      </v-icon>
      <div class="text-h6 font-weight-medium">
        {{ mediaTitle }}
      </div>
      <div class="text-body-2" style="opacity: 0.75;">
        PowerPoint nao possui visualizador nativo embutido neste runtime. Exporte para PDF para projetar dentro do IASDPresenter.
      </div>
    </div>
    <div v-else />
  </div>
</template>

<script lang="ts">
import manifest from "../manifest.json";
import { getFileExtension, isVideoFile, isWebUrl } from "@/helpers/ExternalMedia";
import { getYouTubeEmbedUrl, isYouTubeUrl, YOUTUBE_PLAYER_ORIGIN } from "@/helpers/YouTube";

export default {
  name: "PopupExternalMediaPage",
  data() {
    return {
      hasSyncedInitialTime: false,
      popupYouTubeCurrentTime: 0,
      lastYouTubeSyncAt: 0,
    };
  },
  computed: {
    module_id() {
      return manifest.id;
    },
    module() {
      return this.$modules.get(this.module_id);
    },
    rawFilePath() {
      return this.$appdata.get("modules.external_media.filePath") || "";
    },
    filePath() {
      if (!this.rawFilePath) return "";
      if (window.electronAPI) {
        return this.$localFile.toLocalAppUrl(this.rawFilePath);
      }
      return this.rawFilePath;
    },
    mediaTitle() {
      return this.$appdata.get("modules.external_media.title") || "Mídia Externa";
    },
    fileExtension() {
      return getFileExtension(this.rawFilePath);
    },
    isYouTube() {
      return isYouTubeUrl(this.rawFilePath);
    },
    isWebLink() {
      return isWebUrl(this.rawFilePath) && !this.isYouTube;
    },
    youtubeEmbedUrl() {
      return getYouTubeEmbedUrl(this.rawFilePath, { autoplay: true, muted: true });
    },
    isVideo() {
      return isVideoFile(this.rawFilePath);
    },
    isDocument() {
      return this.fileExtension === "pdf";
    },
    isPresentation() {
      return ["ppt", "pptx"].includes(this.fileExtension);
    },
    documentPage() {
      return this.$appdata.get("modules.external_media.config.document_page") || 1;
    },
    documentUrl() {
      if (!this.filePath) return "";
      if (!this.isDocument) return this.filePath;
      return `${this.filePath}#toolbar=0&navpanes=0&scrollbar=0&page=${this.documentPage}`;
    },
    documentFrameKey() {
      return `${this.filePath}:${this.documentPage}`;
    },
    isPaused() {
      return this.$appdata.get("modules.external_media.config.is_paused");
    },
    currentTime() {
      return this.$appdata.get("modules.external_media.config.current_time");
    },
    playbackUpdatedAt() {
      return this.$appdata.get("modules.external_media.config.playback_updated_at") || 0;
    },
    isWebOutput() {
      return new URLSearchParams(window.location.hash.split("?")[1] || "").get("webOutput") === "1";
    },
    requestAction() {
      return this.$appdata.get("modules.external_media.config.request_action");
    },
  },
  watch: {
    requestAction(req) {
      if (!req) return;
      if (req.action === "seek") {
        const duration = this.$appdata.get("modules.external_media.config.duration") || 0;
        if (this.isYouTube && duration) {
          this.sendYouTubeCommand("seekTo", [(duration * req.value) / 100, true]);
          return;
        }
        const video = this.$refs.popupVideo;
        if (video && duration) {
          video.currentTime = (duration * req.value) / 100;
        }
      }
    },
    isPaused(val) {
      if (this.isYouTube) {
        this.sendYouTubeCommand(val ? "pauseVideo" : "playVideo");
        return;
      }
      this.$nextTick(() => {
        const video = this.$refs.popupVideo;
        if (!video) return;
        if (val) {
          video.pause();
        } else {
          video.play().catch((err) => {
            console.warn("Erro ao retomar mídia no popup:", err);
          });
        }
      });
    },
    playbackUpdatedAt() {
      this.$nextTick(() => this.syncPlaybackPosition());
    },
  },
  mounted() {
    window.addEventListener("message", this.handleYouTubeMessage);
    this.$nextTick(() => {
      if (this.isYouTube) {
        this.onYouTubeLoad();
        return;
      }
      const video = this.$refs.popupVideo;
      if (video) {
        video.currentTime = this.currentTime || 0;
        this.hasSyncedInitialTime = true;
        if (!this.isPaused) {
          video.play().catch((err) => {
            console.warn("Erro ao iniciar mídia no popup:", err);
          });
        }
      }
    });
  },
  beforeUnmount() {
    window.removeEventListener("message", this.handleYouTubeMessage);
  },
  methods: {
    onYouTubeLoad() {
      if (!this.isYouTube) return;
      this.sendYouTubeCommand("mute");
      this.sendYouTubeCommand("addEventListener", ["onStateChange"]);
      this.sendYouTubeCommand("seekTo", [this.getSynchronizedTargetTime(), true]);
      this.sendYouTubeCommand(this.isPaused ? "pauseVideo" : "playVideo");
    },
    sendYouTubeCommand(func, args = []) {
      const frame = this.$refs.popupYouTube;
      if (!frame?.contentWindow) return;
      frame.contentWindow.postMessage(JSON.stringify({
        event: "command",
        func,
        args,
      }), YOUTUBE_PLAYER_ORIGIN);
    },
    handleYouTubeMessage(event) {
      if (!this.isYouTube || !String(event.origin || "").includes("youtube")) return;
      let payload = event.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch (_error) {
          return;
        }
      }
      if (payload?.event === "infoDelivery" && typeof payload.info?.currentTime === "number") {
        this.popupYouTubeCurrentTime = payload.info.currentTime;
      }
    },
    onCanPlay() {
      if (this.hasSyncedInitialTime) {
        this.syncPlaybackPosition();
        this.playProjectedVideo();
        return;
      }
      const video = this.$refs.popupVideo;
      if (video && !this.isPaused) {
        video.currentTime = this.getSynchronizedTargetTime();
        this.hasSyncedInitialTime = true;
        video.play().catch((err) => {
          console.warn("Erro ao iniciar mídia no popup:", err);
        });
      }
    },
    playProjectedVideo() {
      const video = this.$refs.popupVideo;
      if (!video || this.isPaused) return;
      video.play().catch((err) => {
        console.warn("Erro ao iniciar midia no popup:", err);
      });
    },
    getSynchronizedTargetTime() {
      let target = Number(this.currentTime || 0);
      const updatedAt = Number(this.playbackUpdatedAt || 0);
      if (!this.isPaused && updatedAt > 0) {
        target += Math.max(0, Date.now() - updatedAt) / 1000;
      }
      if (this.isWebOutput && !this.isPaused) target += 0.12;
      const duration = Number(this.$appdata.get("modules.external_media.config.duration") || 0);
      return duration > 0 ? Math.min(target, Math.max(0, duration - 0.05)) : Math.max(0, target);
    },
    syncPlaybackPosition(force = false) {
      const target = this.getSynchronizedTargetTime();
      if (this.isYouTube) {
        const drift = target - Number(this.popupYouTubeCurrentTime || 0);
        const now = Date.now();
        if ((force || Math.abs(drift) > 0.35) && now - this.lastYouTubeSyncAt > 900) {
          this.lastYouTubeSyncAt = now;
          this.sendYouTubeCommand("seekTo", [target, true]);
        }
        return;
      }

      const video = this.$refs.popupVideo;
      if (!video || !Number.isFinite(video.currentTime)) return;
      const drift = target - video.currentTime;
      if (force || Math.abs(drift) > 0.18) {
        video.currentTime = target;
      }
    },
    onEnded() {
      this.$appdata.set("modules.external_media.config.is_paused", true);
    },
    onError(event) {
      const el = event.target;
      const error = el?.error;
      if (error) {
        console.warn("Erro na mídia do popup:", error.message || error.code);
      }
    },
  },
};
</script>

<style scoped>
.external-document-frame {
  width: 100%;
  height: 100%;
  border: 0;
  background: #111;
}

.external-youtube-frame {
  width: 100%;
  height: 100%;
  border: 0;
  background: #000;
  pointer-events: none;
}

.external-web-frame {
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
}
</style>
