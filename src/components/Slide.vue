<template>
  <div ref="container" class="slide-container w-100 h-100">
    <video
      v-if="customBg && customBgType === 'video' && customBgImage"
      :src="customBgSource"
      class="position-absolute top-0 left-0 w-100 h-100"
      style="object-fit: cover;"
      :style="{ opacity: customBgOpacity / 100, backgroundColor: customBgColor }"
      autoplay
      muted
      loop
      playsinline
    />
    <div
      v-if="currentSlide && !(customBg && customBgType === 'video' && customBgImage)"
      class="position-absolute top-0 left-0 w-100 h-100"
      :style="style_bg(currentSlide)"
    />
    <transition
      name="slide-content"
      mode="in-out"
    >
      <div
        v-if="currentSlide"
        :key="currentSlide.id"
        class="position-absolute top-0 left-0 w-100 h-100"
        style="overflow: hidden;"
      >
        <div
          class="position-absolute top-0 left-0 w-100 h-100 d-flex justify-center"
          :class="slideAlignClass"
          :style="{ padding: `${Math.max(16, fontSizePc(4))}px` }"
        >
          <div class="d-flex flex-column align-center justify-center w-100">
            <div
              v-if="currentSlide.aux_text"
              :style="style_aux_text(currentSlide)"
              v-html="currentSlide.aux_text"
            />
            <div
              v-if="currentSlide.text"
              :style="style_text(currentSlide)"
              v-html="currentSlide.text"
            />
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
export default {
  name: "SlideComponent",
  props: {
    slide_number: Number,
    cover: Boolean,
    text: String,
    aux_text: String,
    image: String,
    image_position: [Number, String],
    settings: {
      type: Object,
      default: null,
    },
  },
  data: () => ({
    currentSlide: null,
    slideSequence: 0,
    repeat: false,
    width: 0,
    height: 0,
    slideAlignClass: "align-center",
    customTextFormat: false,
    customFontSize: 100,
    customFontColor: "#FFFFFF",
    customFontWeight: "700",
    customFontFamily: "Roboto",
    customLineHeight: 140,
    customLetterSpacing: 3,
    customTextBox: true,
    customBg: false,
    customBgColor: "#000000",
    customBgImage: null,
    customBgType: "image",
    customBgOpacity: 100,
    resizeObserver: null,
  }),
  computed: {
    props_slide() {
      return {
        slide_number: this.slide_number,
        cover: this.cover,
        text: this.text,
        aux_text: this.aux_text,
        image: this.image,
        image_position: this.image_position,
      };
    },
    screenSize() {
      return { width: this.width, height: this.height };
    },
    customBgSource() {
      if (window.electronAPI) {
        return this.$localFile.toLocalAppUrl(this.customBgImage);
      }
      return this.customBgImage;
    },
  },
  watch: {
    props_slide() {
      this.setSlide();
    },
    screenSize() {
      const self = this;
      setTimeout(() => {
        self.windowResize();
      }, 100);
    },
    settings: {
      deep: true,
      handler() {
        this.updateSettings();
      },
    },
  },
  mounted() {
    this.updateSettings();
    this.setSlide();
    this.windowResize();
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.windowResize);
      this.resizeObserver.observe(this.$refs.container);
    }
    window.addEventListener("resize", this.windowResize);
    window.addEventListener("storage", this.updateSettings);
  },
  unmounted() {
    window.removeEventListener("resize", this.windowResize);
    window.removeEventListener("storage", this.updateSettings);
    this.resizeObserver?.disconnect();
  },
  methods: {
    updateSettings() {
      const getSetting = (key, fallback) => {
        if (this.settings && this.settings[key] !== undefined) return this.settings[key];
        const stored = this.$userdata.get(`modules.config.${key}`);
        return stored ?? fallback;
      };

      const align = getSetting("slide_align", "Centro");
      if (align === "Cima") this.slideAlignClass = "align-start";
      else if (align === "Baixo") this.slideAlignClass = "align-end";
      else this.slideAlignClass = "align-center";

      this.customTextFormat = getSetting("slide_custom_text_format", false);
      this.customFontSize = getSetting("slide_font_size", 100);
      this.customFontColor = getSetting("slide_font_color", "#FFFFFF");
      this.customFontWeight = getSetting("slide_font_weight", "700");
      this.customFontFamily = getSetting("slide_font_family", "Roboto");
      this.customLineHeight = getSetting("slide_line_height", 140);
      this.customLetterSpacing = getSetting("slide_letter_spacing", 3);
      this.customTextBox = getSetting("slide_text_box", true);

      this.customBg = getSetting("slide_custom_bg", false);
      this.customBgColor = getSetting("slide_bg_color", "#000000");
      this.customBgImage = getSetting("slide_bg_image", null);
      this.customBgType = getSetting("slide_bg_type", "image");
      this.customBgOpacity = getSetting("slide_bg_opacity", 100);
    },
    setSlide() {
      this.updateSettings();
      const previousSlide = this.currentSlide || {};
      if (
        this.$string.clean(previousSlide.text) ==
        this.$string.clean(this.props_slide.text) &&
        this.$string.clean(previousSlide.aux_text) ==
        this.$string.clean(this.props_slide.aux_text) &&
        previousSlide.image == this.props_slide.image &&
        previousSlide.cover == this.props_slide.cover
      ) {
        this.repeat = !this.repeat;
      } else {
        this.repeat = false;
      }

      this.currentSlide = {
        ...this.props_slide,
        id: ++this.slideSequence,
        repeat: this.repeat,
      };
    },
    style_bg(slide) {
      if (this.customBg) {
        return {
          backgroundColor: this.customBgColor,
          backgroundImage: this.customBgSource ? `url(${this.customBgSource})` : "none",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center center",
          backgroundSize: "cover",
          opacity: this.customBgOpacity / 100,
        };
      }

      return {
        backgroundColor: "transparent",
        backgroundImage: `url(${slide.image})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: [
          "top left",
          "top center",
          "top right",
          "center left",
          "center center",
          "center right",
          "bottom left",
          "bottom center",
          "bottom right",
        ][this.image_position || 5],
        backgroundSize: "cover",
      };
    },
    style_aux_text(slide) {
      if (slide.cover) {
        return {
          fontSize: `${this.fontSizePc(7)}px`,
          color: "rgba(255, 255, 255, 0.95)",
          textTransform: "uppercase",
          fontWeight: "700",
          letterSpacing: "0.4em",
          marginBottom: `${this.fontSizePc(3)}px`,
          textShadow: "0px 4px 16px rgba(0,0,0,0.8)",
          textAlign: "center",
        };
      } 
      return {
        fontSize: `${this.fontSizePc(4)}px`,
        color: "rgba(255, 255, 255, 0.8)",
        textTransform: "uppercase",
        fontWeight: "500",
        letterSpacing: "0.1em",
        marginBottom: `${this.fontSizePc(2)}px`,
        textShadow: "0px 1px 4px rgba(0,0,0,0.5)",
        textAlign: "center",
      };
      
    },
    style_text(slide) {
      if (slide.cover) {
        return {
          fontSize: `${this.fontSizePc(24)}px`,
          color: "#f6c32a",
          fontWeight: "900",
          textTransform: "uppercase",
          letterSpacing: "-0.01em",
          textAlign: "center",
          textShadow: "0px 10px 30px rgba(0, 0, 0, 0.9), 0px 2px 6px rgba(0, 0, 0, 0.7)",
          lineHeight: "1.1",
        };
      } 

      if (this.customTextFormat) {
        const sizeMultiplier = this.customFontSize / 100;
        return {
          backgroundColor: this.customTextBox ? "rgba(0, 0, 0, 0.25)" : "transparent",
          border: this.customTextBox ? `${Math.max(2, this.fontSizePc(0.4))}px solid rgba(255, 255, 255, 0.85)` : "none",
          padding: `${this.fontSizePc(5)}px ${this.fontSizePc(8)}px`,
          backdropFilter: this.customTextBox ? "blur(8px)" : "none",
          WebkitBackdropFilter: this.customTextBox ? "blur(8px)" : "none",
          boxShadow: this.customTextBox ? "0px 10px 30px rgba(0, 0, 0, 0.4)" : "none",
          textAlign: "center",
          textTransform: "uppercase",
          fontSize: `${this.fontSizePc(15) * sizeMultiplier}px`,
          color: slide.repeat ? "#f6c32a" : this.customFontColor,
          fontWeight: this.customFontWeight,
          fontFamily: `${this.customFontFamily}, sans-serif`,
          letterSpacing: `${this.customLetterSpacing / 100}em`,
          lineHeight: String(this.customLineHeight / 100),
          textShadow: "0px 2px 10px rgba(0, 0, 0, 0.8)",
        };
      }

      return {
        backgroundColor: "rgba(0, 0, 0, 0.25)",
        border: `${Math.max(2, this.fontSizePc(0.4))}px solid rgba(255, 255, 255, 0.85)`,
        padding: `${this.fontSizePc(5)}px ${this.fontSizePc(8)}px`,
        textAlign: "center",
        textTransform: "uppercase",
        fontSize: `${this.fontSizePc(15)}px`,
        color: slide.repeat ? "#f6c32a" : "#ffffff",
        fontWeight: "700",
        letterSpacing: "0.03em",
        lineHeight: "1.4",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.4)",
      };
    },
    fontSizePc(pc) {
      const v = Math.min(this.width, this.height);
      return (pc * v) / 100 / 2;
    },
    windowResize() {
      const container = this.$refs.container;
      if (container) {
        this.width = container.offsetWidth;
        this.height = container.offsetHeight;

        if (this.width <= 0 || this.height <= 0) {
          const self = this;
          setTimeout(() => {
            self.windowResize();
          }, 100);
        }
      }
    },
  },
};
</script>

<style scoped>
.slide-container {
  position: relative;
  overflow: hidden;
}

.slide-content-enter-active,
.slide-content-leave-active {
  transition: opacity 0.2s ease-in-out;
}
.slide-content-enter-from,
.slide-content-leave-to {
  opacity: 0;
}
</style>
