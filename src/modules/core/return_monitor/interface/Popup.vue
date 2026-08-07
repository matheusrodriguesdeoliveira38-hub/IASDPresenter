<template>
  <div class="return-monitor-page" :style="pageStyle">
    <section class="return-current" :style="currentAreaStyle">
      <div v-if="showClock" class="return-clock">
        {{ clockText }}
      </div>

      <div v-if="showTitle && title" class="return-title">
        {{ title }}
      </div>

      <div class="return-current-text" :style="currentTextStyle" v-html="currentText" />

      <div v-if="showCounter && totalSlides > 0" class="return-counter">
        Slide {{ currentNumber }} de {{ totalSlides }}
      </div>
    </section>

    <section class="return-preview" :style="previewAreaStyle">
      <div v-if="showNextLabel" class="return-preview-label">
        {{ nextLabel }}
      </div>
      <div class="return-preview-text" :style="previewTextStyle" v-html="nextText" />
    </section>
  </div>
</template>

<script lang="ts">
export default {
  name: "ReturnMonitorPopup",
  data: () => ({
    clockText: "",
    clockTimer: null,
  }),
  computed: {
    config() {
      return this.$media.config() || {};
    },
    slides() {
      return this.$media.slides() || [];
    },
    slideIndex() {
      return Number(this.config.slide_index || 0);
    },
    currentSlide() {
      return this.slides[this.slideIndex] || null;
    },
    nextSlide() {
      return this.slides[this.slideIndex + 1] || null;
    },
    totalSlides() {
      return this.slides.length;
    },
    currentNumber() {
      return Math.min(this.slideIndex + 1, this.totalSlides);
    },
    title() {
      return this.config.title || this.$appdata.get("modules.media.data.name") || "";
    },
    currentText() {
      if (this.currentSlide?.aux_lyric || this.currentSlide?.lyric) {
        return [this.currentSlide.aux_lyric, this.currentSlide.lyric].filter(Boolean).join("<br><br>");
      }
      if (this.currentSlide?.text) return this.currentSlide.text;
      return "Monitor de retorno";
    },
    nextText() {
      if (this.nextSlide?.aux_lyric || this.nextSlide?.lyric) {
        return [this.nextSlide.aux_lyric, this.nextSlide.lyric].filter(Boolean).join("<br><br>");
      }
      if (this.nextSlide?.text) return this.nextSlide.text;
      return "Fim da musica";
    },
    nextLabel() {
      if (!this.nextSlide) return "PROXIMO:";
      const slideName = this.nextSlide.marker || this.nextSlide.name || (this.nextSlide.cover ? "Titulo" : "");
      return slideName ? `PROXIMO: ${slideName}` : "PROXIMO:";
    },
    bgColor() {
      return this.$userdata.get("modules.config.return_monitor_bg_color") || "#000000";
    },
    textColor() {
      return this.$userdata.get("modules.config.return_monitor_text_color") || "#FFFFFF";
    },
    currentFontSize() {
      return this.$userdata.get("modules.config.return_monitor_current_font_size") || 92;
    },
    previewFontSize() {
      return this.$userdata.get("modules.config.return_monitor_preview_font_size") || 38;
    },
    ratio() {
      const value = Number(this.$userdata.get("modules.config.return_monitor_ratio") || 75);
      return Math.min(90, Math.max(55, value));
    },
    showTitle() {
      return this.$userdata.get("modules.config.return_monitor_show_title") !== false;
    },
    showNextLabel() {
      return this.$userdata.get("modules.config.return_monitor_show_next_label") !== false;
    },
    showClock() {
      return this.$userdata.get("modules.config.return_monitor_show_clock") === true;
    },
    showCounter() {
      return this.$userdata.get("modules.config.return_monitor_show_counter") !== false;
    },
    pageStyle() {
      return {
        background: this.bgColor,
        color: this.textColor,
        gridTemplateRows: `${this.ratio}fr ${100 - this.ratio}fr`,
      };
    },
    currentAreaStyle() {
      return {
        borderBottom: `4px solid ${this.textColor}`,
      };
    },
    previewAreaStyle() {
      return {
        background: this.overlayColor,
      };
    },
    currentTextStyle() {
      return {
        fontSize: `${this.currentFontSize}px`,
      };
    },
    previewTextStyle() {
      return {
        fontSize: `${this.previewFontSize}px`,
      };
    },
    overlayColor() {
      return this.isDarkColor(this.bgColor) ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
    },
  },
  mounted() {
    this.updateClock();
    this.clockTimer = setInterval(this.updateClock, 1000);
  },
  unmounted() {
    clearInterval(this.clockTimer);
  },
  methods: {
    updateClock() {
      this.clockText = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    isDarkColor(color) {
      const hex = String(color).replace("#", "");
      if (hex.length !== 6) return true;
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return (r * 299 + g * 587 + b * 114) / 1000 < 128;
    },
  },
};
</script>

<style scoped>
.return-monitor-page {
  display: grid;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  font-family: Arial, Helvetica, sans-serif;
}

.return-current,
.return-preview {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
  padding: 3vh 4vw;
}

.return-current-text,
.return-preview-text {
  width: 100%;
  text-align: center;
  text-transform: uppercase;
  font-weight: 800;
  line-height: 1.18;
  overflow: hidden;
  overflow-wrap: anywhere;
  text-shadow: 0 4px 18px rgba(0, 0, 0, 0.7);
}

.return-preview-text {
  font-weight: 700;
  line-height: 1.25;
}

.return-title,
.return-clock,
.return-counter,
.return-preview-label {
  position: absolute;
  font-weight: 700;
  opacity: 0.86;
  letter-spacing: 0;
}

.return-title {
  top: 2vh;
  left: 4vw;
  right: 16vw;
  font-size: 32px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.return-clock {
  top: 2vh;
  right: 4vw;
  font-size: 34px;
}

.return-counter {
  right: 4vw;
  bottom: 2vh;
  font-size: 28px;
}

.return-preview-label {
  top: 2vh;
  left: 4vw;
  font-size: 24px;
}
</style>
