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
    <video
      v-else-if="isVideo && filePath"
      ref="popupVideo"
      class="w-100 h-100"
      style="object-fit: contain;"
      :src="filePath"
      muted
      @canplay="onCanPlay"
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

<script>
import manifest from "../manifest.json";
import { getFileExtension, isVideoFile } from "@/helpers/ExternalMedia";
import { getYouTubeEmbedUrl, isYouTubeUrl, YOUTUBE_PLAYER_ORIGIN } from "@/helpers/YouTube";

export default {
  name: "PopupExternalMediaPage",
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
    requestAction() {
      return this.$appdata.get("modules.external_media.config.request_action");
    },
  },
  watch: {
    requestAction(req) {
      if (!this.isYouTube || !req) return;
      if (req.action === "seek") {
        const duration = this.$appdata.get("modules.external_media.config.duration") || 0;
        if (duration) {
          this.sendYouTubeCommand("seekTo", [(duration * req.value) / 100, true]);
        }
      }
    },
    currentTime(val) {
      if (this.isYouTube) {
        return;
      }
      const video = this.$refs.popupVideo;
      if (video && !video.seeking) {
        if (Math.abs(video.currentTime - val) > 0.5) {
          video.currentTime = val;
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
  },
  mounted() {
    this.$nextTick(() => {
      if (this.isYouTube) {
        this.onYouTubeLoad();
        return;
      }
      const video = this.$refs.popupVideo;
      if (video) {
        video.currentTime = this.currentTime || 0;
        if (!this.isPaused) {
          video.play().catch((err) => {
            console.warn("Erro ao iniciar mídia no popup:", err);
          });
        }
      }
    });
  },
  methods: {
    onYouTubeLoad() {
      if (!this.isYouTube) return;
      this.sendYouTubeCommand("mute");
      this.sendYouTubeCommand("seekTo", [this.currentTime || 0, true]);
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
    onCanPlay() {
      const video = this.$refs.popupVideo;
      if (video && !this.isPaused) {
        video.currentTime = this.currentTime || 0;
        video.play().catch((err) => {
          console.warn("Erro ao iniciar mídia no popup:", err);
        });
      }
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
</style>
