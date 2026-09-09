<template>
  <div class="presentation-popup w-100 h-100 d-flex align-center justify-center">
    <img v-if="currentImage" :src="currentImage" :alt="title" />
    <div v-else class="presentation-popup-empty">
      {{ title || "Apresentacao" }}
    </div>
  </div>
</template>

<script lang="ts">
import { PresentationPdf } from "@/helpers/PresentationPdf";
import { markRaw } from "vue";
import $performance from "@/helpers/Performance";
import manifest from "../manifest.json";



export default {
  name: "PopupPresentationPage",
  data() {
    return {
      pdfDoc: null,
      pdf: markRaw(new PresentationPdf()),
      currentImage: "",
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
  unmounted() {
    this.pdf.reset();
    this.pdfDoc = null;
    this.currentImage = "";
  },
  methods: {
    async loadPdf() {
      const revision = this.pdf.reset();
      this.currentImage = "";
      this.pdfDoc = null;
      const filePath = this.preparedPath;
      if (!filePath || !window.electronAPI?.readPresentationFile) return;
      try {
        const pdfDocument = await this.pdf.load(async () => {
          const result = await window.electronAPI.readPresentationFile(filePath);
          if (!result?.ok || !result.data) throw new Error(result?.error || "Nao foi possivel ler o PDF.");
          return result.data;
        }, revision);
        if (!pdfDocument || revision !== this.pdf.revision) return;
        this.pdfDoc = markRaw(pdfDocument);
        this.$appdata.set("modules.presentation.config.total_slides", pdfDocument.numPages);
        await this.renderCurrentSlide();
      } catch (error) {
        console.warn("Falha ao carregar apresentacao:", error);
      }
    },
    async renderCurrentSlide() {
      if (!this.pdfDoc) return;
      const revision = this.pdf.revision;
      const token = this.pdf.beginRender("projection");
      const pageNumber = Math.min(Math.max(this.slideIndex + 1, 1), this.pdfDoc.numPages);
      const optimized = $performance.optimizePresentations();
      try {
        const image = await this.pdf.render(pageNumber, optimized ? 1.2 : 1.8, optimized ? 0.84 : 0.92, "projection", token);
        if (image && revision === this.pdf.revision && this.pdf.isRenderCurrent("projection", token)) this.currentImage = image;
      } catch (error) {
        console.warn("Falha ao renderizar slide:", error);
      }
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
