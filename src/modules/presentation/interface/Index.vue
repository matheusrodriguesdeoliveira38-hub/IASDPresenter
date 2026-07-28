<template>
  <ModuleContainer ref="moduleContainer" :manifest="manifest" class="presentation-module" @close="disableGlobalShortcuts">
    <template #header>
      <div class="presentation-header d-flex align-center px-4 py-2">
        <div class="presentation-tool-group d-flex align-center">
          <v-btn
            class="presentation-tool-btn"
            icon
            variant="text"
            size="small"
            @click="selectFile"
          >
            <v-icon>mdi-upload</v-icon>
            <v-tooltip
              activator="parent"
              location="bottom"
              open-delay="300"
              content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
            >
              {{ t('actions.select_file') }}
            </v-tooltip>
          </v-btn>
          <v-btn
            :disabled="!canProject || loading"
            class="presentation-tool-btn"
            icon
            variant="text"
            size="small"
            @click="openProjection"
          >
            <v-icon>mdi-presentation-play</v-icon>
            <v-tooltip
              activator="parent"
              location="bottom"
              open-delay="300"
              content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
            >
              {{ t('actions.project') }}
            </v-tooltip>
          </v-btn>
          <v-btn
            v-if="sourcePath"
            class="presentation-tool-btn"
            icon
            variant="text"
            size="small"
            @click="openOriginal"
          >
            <v-icon>mdi-open-in-app</v-icon>
            <v-tooltip
              activator="parent"
              location="bottom"
              open-delay="300"
              content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
            >
              {{ t('actions.open_original') }}
            </v-tooltip>
          </v-btn>
        </div>
        <div v-if="sourcePath" class="presentation-file-pill ml-3">
          <v-icon size="16">
            {{ sourceType === 'pdf' ? 'mdi-file-pdf-box' : 'mdi-file-powerpoint-box' }}
          </v-icon>
          <span>{{ title }}</span>
        </div>
        <v-spacer />
        <v-select
          v-if="projectionMonitorOptions.length"
          v-model="selectedProjectionTarget"
          :items="projectionMonitorOptions"
          item-title="title"
          item-value="value"
          class="presentation-monitor-select mr-3"
          density="compact"
          variant="solo-filled"
          hide-details
          flat
          @update:model-value="saveProjectionTarget"
        >
          <template #prepend-inner>
            <v-icon size="18">
              mdi-monitor-share
            </v-icon>
          </template>
        </v-select>
        <div v-if="totalSlides" class="presentation-header-counter">
          {{ t('labels.slide') }} {{ currentSlideNumber }} / {{ totalSlides }}
        </div>
      </div>
    </template>

    <div
      class="presentation-operator h-100 d-flex flex-column"
      tabindex="0"
      @keydown.left.prevent="prevSlide"
      @keydown.right.prevent="nextSlide"
      @keydown.up.prevent="prevSlide"
      @keydown.down.prevent="nextSlide"
      @keydown.space.prevent="nextSlide"
    >
      <div v-if="!preparedPath && !loading" class="presentation-empty flex-grow-1 d-flex flex-column align-center justify-center text-center">
        <div class="presentation-empty-icon mb-5">
          <v-icon size="54">
            mdi-presentation-play
          </v-icon>
        </div>
        <div class="presentation-empty-title mb-2">
          {{ t('title') }}
        </div>
        <div class="presentation-empty-text mb-6">
          {{ t('status.empty') }}
        </div>
        <v-btn color="primary" variant="flat" rounded="lg" prepend-icon="mdi-upload" class="text-none font-weight-bold px-5" @click="selectFile">
          {{ t('actions.select_file') }}
        </v-btn>
      </div>

      <div v-else-if="loading" class="presentation-empty flex-grow-1 d-flex flex-column align-center justify-center text-center">
        <v-progress-circular indeterminate color="primary" size="46" width="4" class="mb-5" />
        <div class="presentation-empty-title">
          {{ loadingText }}
        </div>
      </div>

      <div v-else-if="error" class="presentation-empty flex-grow-1 d-flex flex-column align-center justify-center text-center px-8">
        <div class="presentation-empty-icon warning mb-5">
          <v-icon size="50">
            {{ needsConversion ? 'mdi-file-powerpoint-box' : 'mdi-alert-circle-outline' }}
          </v-icon>
        </div>
        <div class="presentation-empty-title mb-2">
          {{ needsConversion ? 'PowerPoint carregado' : t('status.unsupported') }}
        </div>
        <div v-if="title" class="text-subtitle-2 font-weight-bold mb-3 opacity-80">
          {{ title }}
        </div>
        <div class="presentation-empty-text">
          {{ error }}
        </div>
        <div class="d-flex align-center justify-center mt-5" style="gap: 10px;">
          <v-btn color="primary" variant="flat" rounded="lg" prepend-icon="mdi-upload" class="text-none font-weight-bold px-5" @click="selectFile">
            {{ t('actions.select_file') }}
          </v-btn>
          <v-btn v-if="canProject" color="primary" variant="tonal" rounded="lg" prepend-icon="mdi-presentation-play" class="text-none font-weight-bold px-5" @click="openProjection">
            {{ t('actions.project') }}
          </v-btn>
          <v-btn v-if="sourcePath" variant="tonal" rounded="lg" prepend-icon="mdi-open-in-app" class="text-none font-weight-bold px-5" @click="openOriginal">
            {{ t('actions.open_original') }}
          </v-btn>
        </div>
      </div>

      <div v-else class="presentation-workspace flex-grow-1 d-flex">
        <main class="presentation-current flex-grow-1 d-flex flex-column">
          <div class="presentation-panel-heading">
            <div>
              <div class="presentation-section-title">
                {{ t('labels.current') }}
              </div>
              <div class="presentation-slide-name">
                {{ title }}
              </div>
            </div>
            <div class="presentation-slide-badge">
              {{ currentSlideNumber }} / {{ totalSlides }}
            </div>
          </div>
          <button class="current-slide-frame" type="button" @click="nextSlide">
            <img v-if="currentImage" :src="currentImage" :alt="`${t('labels.slide')} ${currentSlideNumber}`" />
          </button>

          <div class="presentation-controls d-flex align-center justify-center">
            <v-btn icon variant="text" size="small" :disabled="slideIndex <= 0" @click="firstSlide">
              <v-icon>mdi-skip-previous</v-icon>
              <v-tooltip activator="parent" location="top" open-delay="300">
                Primeiro slide
              </v-tooltip>
            </v-btn>
            <v-btn icon variant="tonal" size="small" :disabled="slideIndex <= 0" @click="prevSlide">
              <v-icon>mdi-chevron-left</v-icon>
              <v-tooltip activator="parent" location="top" open-delay="300">
                Slide anterior
              </v-tooltip>
            </v-btn>
            <div class="slide-counter mx-4">
              {{ currentSlideNumber }} / {{ totalSlides }}
            </div>
            <v-btn icon variant="tonal" size="small" :disabled="slideIndex >= totalSlides - 1" @click="nextSlide">
              <v-icon>mdi-chevron-right</v-icon>
              <v-tooltip activator="parent" location="top" open-delay="300">
                Proximo slide
              </v-tooltip>
            </v-btn>
            <v-btn icon variant="text" size="small" :disabled="slideIndex >= totalSlides - 1" @click="lastSlide">
              <v-icon>mdi-skip-next</v-icon>
              <v-tooltip activator="parent" location="top" open-delay="300">
                Ultimo slide
              </v-tooltip>
            </v-btn>
          </div>
        </main>

        <aside class="presentation-side">
          <div class="presentation-panel-heading compact">
            <div>
              <div class="presentation-section-title">
                {{ t('labels.next') }}
              </div>
            </div>
          </div>
          <button class="next-slide-frame" type="button" :disabled="!nextImage" @click="nextSlide">
            <img v-if="nextImage" :src="nextImage" :alt="`${t('labels.slide')} ${currentSlideNumber + 1}`" />
            <div v-else class="next-empty">
              Fim
            </div>
          </button>
        </aside>
      </div>

      <div v-if="slides.length" class="presentation-strip">
        <div class="presentation-section-title px-4 pt-3">
          {{ t('labels.slides') }}
        </div>
        <div class="thumbnail-row">
          <button
            v-for="slide in slides"
            :key="slide.pageNumber"
            :ref="el => setThumbRef(el, slide.pageNumber)"
            class="thumbnail-button"
            :class="{ active: slide.pageNumber - 1 === slideIndex }"
            type="button"
            @click="goToSlide(slide.pageNumber - 1)"
          >
            <img v-if="slide.thumbnail" :src="slide.thumbnail" :alt="`${t('labels.slide')} ${slide.pageNumber}`" />
            <div v-else class="thumbnail-placeholder">
              {{ slide.pageNumber }}
            </div>
            <span>{{ slide.pageNumber }}</span>
          </button>
        </div>
      </div>
    </div>
  </ModuleContainer>
</template>

<script>
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import { markRaw } from "vue";
import ModuleContainer from "@/layout/ModuleContainer.vue";
import $performance from "@/helpers/Performance";
import manifest from "../manifest.json";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default {
  name: "PresentationModule",
  components: {
    ModuleContainer,
  },
  data() {
    return {
      manifest,
      loading: false,
      loadingText: "",
      error: "",
      errorDetails: "",
      needsConversion: false,
      sourcePath: "",
      preparedPath: "",
      sourceType: "",
      title: "",
      pdfDoc: null,
      slides: [],
      thumbnailCache: {},
      currentImage: "",
      nextImage: "",
      slideIndex: 0,
      thumbRefs: {},
      renderToken: 0,
      selectedProjectionTarget: "config",
    };
  },
  computed: {
    currentSlideNumber() {
      return this.slideIndex + 1;
    },
    totalSlides() {
      return this.pdfDoc?.numPages || this.slides.length;
    },
    isPowerPointSource() {
      return ["ppt", "pptx"].includes(this.sourceType);
    },
    canProject() {
      return Boolean(this.preparedPath || (this.sourcePath && this.isPowerPointSource));
    },
    displays() {
      return this.$appdata.get("system_displays") || [];
    },
    projectionMonitorOptions() {
      const options = [
        {
          title: "Configuração padrão",
          value: "config",
        },
      ];

      return options.concat(this.displays.map((display, index) => ({
        title: `Monitor ${index + 1}${display.isPrimary ? " (Principal)" : ""}`,
        value: display.id,
      })));
    },
  },
  watch: {
    slideIndex() {
      this.syncState();
      this.renderCurrentSlides();
      this.renderVisibleThumbnails();
      this.scrollActiveThumb();
    },
  },
  mounted() {
    window.addEventListener("presentation-slide-index-change", this.handleExternalSlideIndex);
    this.selectedProjectionTarget = this.$userdata.get("modules.presentation.projection_target") || "config";
    this.loadDisplays();
    this.restoreState();
  },
  unmounted() {
    window.removeEventListener("presentation-slide-index-change", this.handleExternalSlideIndex);
    this.disableGlobalShortcuts();
  },
  methods: {
    t(key) {
      return this.$t(`modules.${manifest.id}.${key}`);
    },
    async loadDisplays() {
      if (!window.electronAPI?.getDisplays) return;
      const displays = await window.electronAPI.getDisplays();
      this.$appdata.set("system_displays", displays || []);
      const values = ["config"].concat((displays || []).map(display => display.id));
      if (!values.includes(this.selectedProjectionTarget)) {
        this.saveProjectionTarget("config");
      }
    },
    saveProjectionTarget(value) {
      this.selectedProjectionTarget = value || "config";
      this.$userdata.set("modules.presentation.projection_target", this.selectedProjectionTarget);
    },
    async selectFile() {
      if (!window.electronAPI?.openFileDialog) {
        this.$alert.error({ text: "Selecao de arquivos disponivel apenas na versao desktop.", translate: false });
        return;
      }

      const filePath = await window.electronAPI.openFileDialog({
        title: "Selecionar apresentacao",
        filters: [
          { name: "Apresentacoes", extensions: ["pdf", "ppt", "pptx"] },
          { name: "PDF", extensions: ["pdf"] },
          { name: "PowerPoint", extensions: ["ppt", "pptx"] },
        ],
      });

      if (filePath) {
        await this.loadFile(filePath);
      }
    },
    async loadFile(filePath) {
      this.loading = true;
      this.loadingText = this.t("status.loading");
      this.error = "";
      this.errorDetails = "";
      this.needsConversion = false;
      this.slides = [];
      this.thumbnailCache = {};
      this.currentImage = "";
      this.nextImage = "";
      this.slideIndex = 0;

      const ext = filePath.split(".").pop().toLowerCase();
      if (["ppt", "pptx"].includes(ext)) {
        this.loadingText = this.t("status.converting");
      }

      try {
        const prepared = await window.electronAPI.preparePresentationFile(filePath);
        if (!prepared?.ok) {
          this.error = prepared?.error || this.t("status.unsupported");
          this.needsConversion = prepared?.needsConversion === true;
          if (prepared?.details) {
            this.errorDetails = prepared.details;
            console.warn("Falha ao preparar apresentacao:", prepared.details);
          }
          this.preparedPath = "";
          this.sourcePath = prepared?.sourcePath || filePath;
          this.sourceType = prepared?.sourceType || ext;
          this.title = this.getFileName(this.sourcePath);
          this.syncState();
          return;
        }

        this.sourcePath = prepared.sourcePath || filePath;
        this.preparedPath = prepared.filePath;
        this.sourceType = prepared.sourceType || ext;
        this.title = this.getFileName(this.sourcePath);
        await this.loadPdf(this.preparedPath);
        this.syncState();
      } catch (err) {
        this.error = err?.message || String(err);
        this.errorDetails = "";
      } finally {
        this.loading = false;
      }
    },
    async loadPdf(filePath) {
      const result = await window.electronAPI.readPresentationFile(filePath);
      if (!result?.ok || !result.data) {
        throw new Error(result?.error || "Nao foi possivel ler o PDF preparado.");
      }

      const bytes = this.toPdfBytes(result.data);
      const pdfDocument = await pdfjsLib.getDocument({ data: bytes }).promise;
      this.pdfDoc = markRaw(pdfDocument);
      await this.renderThumbnails();
      await this.renderCurrentSlides();
    },
    toPdfBytes(data) {
      if (data instanceof Uint8Array) return data;
      if (data instanceof ArrayBuffer) return new Uint8Array(data);
      if (Array.isArray(data)) return new Uint8Array(data);
      if (data?.type === "Buffer" && Array.isArray(data.data)) return new Uint8Array(data.data);
      if (data?.data && Array.isArray(data.data)) return new Uint8Array(data.data);
      throw new Error("Formato de dados do PDF invalido.");
    },
    async renderThumbnails() {
      if ($performance.optimizePresentations()) {
        this.slides = Array.from({ length: this.pdfDoc.numPages }, (_, index) => ({
          pageNumber: index + 1,
          thumbnail: "",
        }));
        await this.renderVisibleThumbnails();
        return;
      }

      const rendered = [];
      for (let pageNumber = 1; pageNumber <= this.pdfDoc.numPages; pageNumber++) {
        const thumbnail = await this.renderPageToDataUrl(pageNumber, 0.22);
        this.thumbnailCache[pageNumber] = thumbnail;
        rendered.push({ pageNumber, thumbnail });
      }
      this.slides = rendered;
    },
    async renderVisibleThumbnails() {
      if (!$performance.optimizePresentations() || !this.pdfDoc) return;

      const token = this.renderToken;
      const pageNumbers = [
        this.slideIndex - 1,
        this.slideIndex,
        this.slideIndex + 1,
        this.slideIndex + 2,
      ]
        .map(index => index + 1)
        .filter(pageNumber => pageNumber >= 1 && pageNumber <= this.pdfDoc.numPages && !this.thumbnailCache[pageNumber]);

      for (const pageNumber of pageNumbers) {
        const thumbnail = await this.renderPageToDataUrl(pageNumber, 0.16);
        if (token !== this.renderToken && pageNumber !== this.slideIndex + 1) return;
        this.thumbnailCache[pageNumber] = thumbnail;
        this.slides = this.slides.map(slide => (
          slide.pageNumber === pageNumber ? { ...slide, thumbnail } : slide
        ));
      }
    },
    async renderCurrentSlides() {
      if (!this.pdfDoc) return;
      const token = ++this.renderToken;
      const currentPage = this.slideIndex + 1;
      const nextPage = this.slideIndex + 2;
      const optimized = $performance.optimizePresentations();
      const current = await this.renderPageToDataUrl(currentPage, optimized ? 0.9 : 1.25, optimized ? 0.82 : 0.9);
      const next = nextPage <= this.pdfDoc.numPages
        ? await this.renderPageToDataUrl(nextPage, optimized ? 0.32 : 0.55, optimized ? 0.75 : 0.9)
        : "";
      if (token !== this.renderToken) return;
      this.currentImage = current;
      this.nextImage = next;
    },
    async renderPageToDataUrl(pageNumber, scale, quality = 0.9) {
      const page = await this.pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { alpha: false });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: context, viewport }).promise;
      return canvas.toDataURL("image/jpeg", quality);
    },
    syncState() {
      this.$appdata.set("modules.presentation.sourcePath", this.sourcePath);
      this.$appdata.set("modules.presentation.preparedPath", this.preparedPath);
      this.$appdata.set("modules.presentation.titleText", this.title);
      this.$appdata.set("modules.presentation.config.slide_index", this.slideIndex);
      this.$appdata.set("modules.presentation.config.total_slides", this.totalSlides);
    },
    restoreState() {
      const preparedPath = this.$appdata.get("modules.presentation.preparedPath");
      const sourcePath = this.$appdata.get("modules.presentation.sourcePath");
      const slideIndex = this.$appdata.get("modules.presentation.config.slide_index") || 0;
      if (!preparedPath) return;
      this.sourcePath = sourcePath || preparedPath;
      this.preparedPath = preparedPath;
      this.title = this.$appdata.get("modules.presentation.titleText") || this.getFileName(this.sourcePath);
      this.slideIndex = slideIndex;
      this.loading = true;
      this.loadingText = this.t("status.loading");
      this.loadPdf(preparedPath)
        .catch((err) => {
          this.error = err?.message || String(err);
        })
        .finally(() => {
          this.loading = false;
          this.syncState();
        });
    },
    async openProjection() {
      if (!this.preparedPath && this.sourcePath && this.isPowerPointSource) {
        await this.loadFile(this.sourcePath);
      }

      if (!this.preparedPath) {
        const details = this.errorDetails ? `\n\nDetalhes: ${this.errorDetails}` : "";
        this.$alert.error({
          text: `${this.error || "Nao foi possivel preparar este PowerPoint para projecao. Instale Microsoft PowerPoint ou LibreOffice, ou exporte o arquivo para PDF."}${details}`,
          translate: false,
        });
        return;
      }

      const fullscreen = this.$userdata.get("modules.config.slide_fullscreen") !== false;
      let selectedMonitors = [];
      if (this.selectedProjectionTarget !== "config") {
        selectedMonitors = [this.selectedProjectionTarget];
      } else if (window.electronAPI?.getDisplays) {
        const displays = await window.electronAPI.getDisplays();
        if (displays && displays.length > 1) {
          let configMonitors = this.$userdata.get("modules.config.slide_monitor");
          if (!Array.isArray(configMonitors)) {
            configMonitors = configMonitors ? [configMonitors] : [];
          }
          const primary = displays.find(d => d.isPrimary) || displays[0];
          selectedMonitors = configMonitors.filter(m => m !== primary.id);
        }
      }

      if (selectedMonitors.length > 0) {
        if ($performance.limitProjectionWindows()) {
          selectedMonitors = selectedMonitors.slice(0, 1);
        }
        await this.$popup.syncMonitors(selectedMonitors, "presentation", true, fullscreen);
      } else {
        this.$popup.open({ module: "presentation", popupModule: "presentation", fullscreen });
      }

      if (window.electronAPI?.setPresentationShortcutsEnabled) {
        window.electronAPI.setPresentationShortcutsEnabled(true);
      }
    },
    disableGlobalShortcuts() {
      if (window.electronAPI?.setPresentationShortcutsEnabled) {
        window.electronAPI.setPresentationShortcutsEnabled(false);
      }
    },
    handleExternalSlideIndex(event) {
      const nextIndex = Number(event.detail);
      if (!Number.isFinite(nextIndex) || !this.totalSlides) return;
      this.slideIndex = Math.min(Math.max(nextIndex, 0), this.totalSlides - 1);
    },
    openOriginal() {
      if (window.electronAPI?.openPath && this.sourcePath) {
        window.electronAPI.openPath(this.sourcePath);
      }
    },
    goToSlide(index) {
      if (!this.totalSlides) return;
      this.slideIndex = Math.min(Math.max(index, 0), this.totalSlides - 1);
    },
    firstSlide() {
      this.goToSlide(0);
    },
    prevSlide() {
      this.goToSlide(this.slideIndex - 1);
    },
    nextSlide() {
      this.goToSlide(this.slideIndex + 1);
    },
    lastSlide() {
      this.goToSlide(this.totalSlides - 1);
    },
    setThumbRef(el, pageNumber) {
      if (el) this.thumbRefs[pageNumber] = el;
    },
    scrollActiveThumb() {
      this.$nextTick(() => {
        this.thumbRefs[this.currentSlideNumber]?.scrollIntoView?.({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      });
    },
    getFileName(filePath) {
      return String(filePath || "").split(/[\\/]/).pop() || this.t("title");
    },
  },
};
</script>

<style lang="scss">
.presentation-module {
  .v-card-text {
    padding: 0 !important;
  }
}

.presentation-header {
  min-height: 54px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.12);
  background: color-mix(in srgb, var(--card-bg, #ffffff) 94%, #5b8def 6%);
}

.presentation-tool-group {
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: rgba(128, 128, 128, 0.12);
}

.presentation-tool-btn {
  color: var(--sidebar-text, rgba(0, 0, 0, 0.82)) !important;

  &:hover {
    background: rgba(91, 141, 239, 0.14) !important;
  }
}

.presentation-file-pill {
  min-width: 0;
  max-width: min(420px, 38vw);
  height: 32px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(91, 141, 239, 0.12);
  color: var(--sidebar-text, rgba(0, 0, 0, 0.82));
  font-size: 12px;
  font-weight: 700;

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.presentation-monitor-select {
  flex: 0 0 210px;
  max-width: 210px;

  .v-field {
    min-height: 32px;
    border-radius: 999px;
    background: rgba(128, 128, 128, 0.12) !important;
    color: var(--sidebar-text, rgba(0, 0, 0, 0.82));
    box-shadow: none !important;
  }

  .v-field__input {
    min-height: 32px;
    padding-top: 0;
    padding-bottom: 0;
    font-size: 12px;
    font-weight: 800;
  }

  .v-field__prepend-inner,
  .v-field__append-inner {
    min-height: 32px;
    padding-top: 0;
    color: rgba(23, 32, 51, 0.62);
  }
}

.presentation-header-counter {
  height: 30px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(128, 128, 128, 0.12);
  color: var(--sidebar-text, rgba(0, 0, 0, 0.72));
  font-size: 12px;
  font-weight: 800;
}

.presentation-operator {
  min-height: 0;
  background:
    linear-gradient(135deg, rgba(247, 249, 252, 0.97), rgba(235, 241, 248, 0.98) 46%, rgba(226, 232, 240, 0.98));
  color: #172033;
  outline: none;
}

.presentation-empty {
  min-height: 480px;
  padding: 32px;
}

.presentation-empty-icon {
  width: 104px;
  height: 104px;
  border-radius: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  color: #3f72d8;
  border: 1px solid rgba(91, 141, 239, 0.18);
  box-shadow: 0 18px 50px rgba(32, 45, 73, 0.08);
}

.presentation-empty-icon.warning {
  color: #b7791f;
  border-color: rgba(183, 121, 31, 0.2);
}

.presentation-empty-title {
  color: #172033;
  font-size: 22px;
  font-weight: 800;
}

.presentation-empty-text {
  max-width: 460px;
  color: rgba(23, 32, 51, 0.68);
  font-size: 14px;
  line-height: 1.6;
}

.presentation-workspace {
  min-height: 0;
  padding: 22px;
  gap: 20px;
}

.presentation-current {
  min-width: 0;
}

.presentation-side {
  width: 260px;
  flex: 0 0 260px;
  display: flex;
  flex-direction: column;
}

.presentation-panel-heading {
  height: 50px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.presentation-panel-heading.compact {
  height: 50px;
}

.presentation-section-title {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
  color: rgba(23, 32, 51, 0.48);
}

.presentation-slide-name {
  max-width: 52vw;
  margin-top: 3px;
  color: rgba(23, 32, 51, 0.78);
  font-size: 14px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.presentation-slide-badge {
  height: 32px;
  min-width: 68px;
  padding: 0 12px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: 1px solid rgba(128, 128, 128, 0.16);
  color: rgba(23, 32, 51, 0.76);
  font-size: 12px;
  font-weight: 900;
  box-shadow: 0 8px 24px rgba(32, 45, 73, 0.06);
}

.current-slide-frame,
.next-slide-frame,
.thumbnail-button {
  border: 0;
  padding: 0;
  background: #0d1117;
  color: inherit;
  cursor: pointer;
}

.current-slide-frame {
  flex: 1;
  min-height: 0;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(23, 32, 51, 0.08);
  box-shadow: 0 24px 70px rgba(32, 45, 73, 0.18);
}

.current-slide-frame img,
.next-slide-frame img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.next-slide-frame {
  aspect-ratio: 16 / 10;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(23, 32, 51, 0.08);
  box-shadow: 0 14px 42px rgba(32, 45, 73, 0.12);
}

.next-empty {
  color: rgba(255, 255, 255, 0.62);
  font-weight: 700;
}

.presentation-controls {
  width: fit-content;
  height: 52px;
  flex: 0 0 70px;
  align-self: center;
  margin-top: 12px;
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(128, 128, 128, 0.14);
  box-shadow: 0 12px 34px rgba(32, 45, 73, 0.1);
  backdrop-filter: blur(12px);
}

.slide-counter {
  min-width: 86px;
  text-align: center;
  font-weight: 800;
  color: rgba(23, 32, 51, 0.78);
}

.presentation-strip {
  flex: 0 0 178px;
  border-top: 1px solid rgba(128, 128, 128, 0.14);
  background: rgba(255, 255, 255, 0.54);
  backdrop-filter: blur(16px);
}

.thumbnail-placeholder {
  width: 100%;
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.18);
  color: var(--sidebar-text-secondary);
  font-size: 18px;
  font-weight: 800;
}

.thumbnail-row {
  height: 132px;
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 4px 16px 14px;
}

.thumbnail-button {
  position: relative;
  height: 106px;
  width: 150px;
  flex: 0 0 150px;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.52);
  opacity: 0.72;
  box-shadow: 0 10px 28px rgba(32, 45, 73, 0.1);
  transition: transform 0.16s ease, opacity 0.16s ease, border-color 0.16s ease;

  &:hover {
    opacity: 0.92;
    transform: translateY(-1px);
  }
}

.thumbnail-button.active {
  border-color: #3f72d8;
  opacity: 1;
  box-shadow: 0 12px 32px rgba(63, 114, 216, 0.24);
}

.thumbnail-button img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.thumbnail-button span {
  position: absolute;
  left: 6px;
  bottom: 6px;
  min-width: 22px;
  height: 22px;
  border-radius: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.72);
  color: white;
  font-size: 12px;
  font-weight: 800;
}

@media (max-width: 900px) {
  .presentation-workspace {
    flex-direction: column;
  }

  .presentation-side {
    width: 100%;
    flex: 0 0 auto;
  }

  .next-slide-frame {
    max-height: 180px;
  }

  .presentation-file-pill {
    max-width: 34vw;
  }

  .presentation-monitor-select {
    flex-basis: 170px;
    max-width: 170px;
  }
}
</style>
