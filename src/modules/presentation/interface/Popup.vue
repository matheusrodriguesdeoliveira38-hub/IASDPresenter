<template>
  <div class="presentation-popup w-100 h-100 d-flex align-center justify-center">
    <img v-if="currentImage" :src="currentImage" :alt="title" />
    <div v-else class="presentation-popup-empty">
      {{ title || "Apresentacao" }}
    </div>
  </div>
</template>

<script>
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import { markRaw } from "vue";
import manifest from "../manifest.json";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default {
  name: "PopupPresentationPage",
  data() {
    return {
      pdfDoc: null,
      currentImage: "",
      renderToken: 0,
    };
  },
  computed: {
    module_id() {
      return manifest.id;
    },
    module() {
      return this.$modules.get(this.module_id);
    },
    preparedPath() {
      return this.$appdata.get("modules.presentation.preparedPath") || "";
    },
    slideIndex() {
      return this.$appdata.get("modules.presentation.config.slide_index") || 0;
    },
    title() {
      return this.$appdata.get("modules.presentation.titleText") || "Apresentacao";
    },
  },
  watch: {
    preparedPath() {
      this.loadPdf();
    },
    slideIndex() {
      this.renderCurrentSlide();
    },
  },
  mounted() {
    this.loadPdf();
  },
  methods: {
    async loadPdf() {
      this.currentImage = "";
      this.pdfDoc = null;
      if (!this.preparedPath || !window.electronAPI?.readPresentationFile) return;

      const result = await window.electronAPI.readPresentationFile(this.preparedPath);
      if (!result?.ok || !result.data) return;
      const bytes = this.toPdfBytes(result.data);
      const pdfDocument = await pdfjsLib.getDocument({ data: bytes }).promise;
      this.pdfDoc = markRaw(pdfDocument);
      await this.renderCurrentSlide();
    },
    toPdfBytes(data) {
      if (data instanceof Uint8Array) return data;
      if (data instanceof ArrayBuffer) return new Uint8Array(data);
      if (Array.isArray(data)) return new Uint8Array(data);
      if (data?.type === "Buffer" && Array.isArray(data.data)) return new Uint8Array(data.data);
      if (data?.data && Array.isArray(data.data)) return new Uint8Array(data.data);
      throw new Error("Formato de dados do PDF invalido.");
    },
    async renderCurrentSlide() {
      if (!this.pdfDoc) return;
      const token = ++this.renderToken;
      const pageNumber = Math.min(Math.max(this.slideIndex + 1, 1), this.pdfDoc.numPages);
      const page = await this.pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.8 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { alpha: false });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: context, viewport }).promise;
      if (token !== this.renderToken) return;
      this.currentImage = canvas.toDataURL("image/jpeg", 0.92);
    },
  },
};
</script>

<style scoped>
.presentation-popup {
  background: #000;
  overflow: hidden;
}

.presentation-popup img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.presentation-popup-empty {
  color: rgba(255, 255, 255, 0.72);
  font-size: 24px;
  font-weight: 700;
}
</style>
