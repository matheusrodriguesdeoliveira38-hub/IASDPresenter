<template>
  <v-app id="app-container">
    <AppTitlebar />
    <FirstBootLoader />
    <AppLoading />
    <QuickSearchOverlay />
    <v-btn
      v-show="false"
      v-shortkey="['ctrl', 'alt', 'd']"
      @shortkey="handleKeydown()"
    />
    <router-view />
  </v-app>
</template>

<script lang="ts">
import AppLoading from "@/layout/Loading.vue";
import FirstBootLoader from "@/layout/FirstBootLoader.vue";
import AppTitlebar from "@/layout/Titlebar.vue";
import BackgroundSync from "@/helpers/BackgroundSync";
import QuickSearchOverlay from "@/components/QuickSearchOverlay.vue";

export default {
  name: "App",
  components: {
    AppLoading,
    FirstBootLoader,
    AppTitlebar,
    QuickSearchOverlay,
  },
  created() {
    this.$userdata.load();
    const theme = this.$userdata.get("theme");
    if (theme !== "") {
      this.$vuetify.theme.global.name = theme;
    }
    this.$theme.applyAccentColor(this.$vuetify);
  },
  mounted() {
    window.addEventListener("keydown", this.handleGlobalKeydown);
    window.addEventListener("message", this.handleWindowMessage);

    if (window.electronAPI?.onPresentationShortcut) {
      this.removePresentationShortcutListener = window.electronAPI.onPresentationShortcut(this.handlePresentationShortcut);
    }
    
    if (window.electronAPI && window.electronAPI.getDisplays) {
      window.electronAPI.getDisplays().then(displays => {
        this.$appdata.set("system_displays", displays);
      });
      
      if (window.electronAPI.onDisplaysChanged) {
        window.electronAPI.onDisplaysChanged(async () => {
          const displays = await window.electronAPI.getDisplays();
          this.$appdata.set("system_displays", displays);
          
          if (displays.length === 1) {
            this.$popup.exit();
          } else {
            this.$media.syncMonitors();
          }
        });
      }
    }
    
    // A varredura de milhares de capas compete com a interface em discos e CPUs
    // lentos. No modo leve ela fica para a sincronização manual; nos demais
    // dispositivos só inicia quando o navegador estiver ocioso.
    if (!this.$performance.isLightMode()) {
      const startBackgroundSync = () => BackgroundSync.start();
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(startBackgroundSync, { timeout: 60000 });
      } else {
        setTimeout(startBackgroundSync, 30000);
      }
    }
  },
  unmounted() {
    window.removeEventListener("keydown", this.handleGlobalKeydown);
    window.removeEventListener("message", this.handleWindowMessage);
    if (this.removePresentationShortcutListener) {
      this.removePresentationShortcutListener();
    }
  },
  methods: {
    handleKeydown() {
      console.log("click ");
      this.$dev.toogle();
    },
    handleGlobalKeydown(e) {
      if (e.code === "Escape" && this.hasActiveProjection() && !this.isClockProjectionActive()) {
        e.preventDefault();
        this.$popup.exit();
        if (window.electronAPI?.setPresentationShortcutsEnabled) {
          window.electronAPI.setPresentationShortcutsEnabled(false);
        }
        return;
      }

      if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) {
        return;
      }

      if (this.isBibleProjectionActive() && ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].includes(e.code)) {
        e.preventDefault();
        const direction = ["ArrowLeft", "ArrowUp"].includes(e.code) ? "prev" : "next";
        window.dispatchEvent(new CustomEvent("bible-presentation-navigation", { detail: { direction } }));
        return;
      }

      const isFullscreen = this.$appdata.get("modules.media.config.fullscreen");
      const isMediaModuleOpen = this.$appdata.get("modules.media.show");
      const isMinimized = this.$appdata.get("modules.media.minimized");

      const isActive = isFullscreen || (isMediaModuleOpen && !isMinimized);

      if (!isActive) return;

      if (e.code === "Space") {
        e.preventDefault();
        const isPaused = this.$appdata.get("modules.media.config.is_paused");
        this.$media.pause(!isPaused);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        this.$media.nextSlide();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        this.$media.prevSlide();
      } else if (e.code === "Escape") {
        e.preventDefault();
        this.$media.close();
      } else if (e.code === "KeyF") {
        e.preventDefault();
        this.$media.fullscreen(!isFullscreen);
      } else if (e.code === "KeyM") {
        e.preventDefault();
        this.$media.minimize();
      }
    },
    handleWindowMessage(event) {
      if (event.origin !== window.location.origin && event.origin !== "file://" && event.origin !== "null") {
        return;
      }

      if (event.data?.action === "close-projections" && !this.isClockProjectionActive()) {
        this.$popup.exit();
        if (window.electronAPI?.setPresentationShortcutsEnabled) {
          window.electronAPI.setPresentationShortcutsEnabled(false);
        }
      }
    },
    handlePresentationShortcut(action) {
      if (this.isBibleProjectionActive()) {
        const direction = action === "prev" ? "prev" : "next";
        window.dispatchEvent(new CustomEvent("bible-presentation-navigation", { detail: { direction } }));
        return;
      }

      if (!this.isPresentationProjectionActive()) {
        if (window.electronAPI?.setPresentationShortcutsEnabled) {
          window.electronAPI.setPresentationShortcutsEnabled(false);
        }
        return;
      }

      const totalSlides = this.$appdata.get("modules.presentation.config.total_slides") || 0;
      if (!totalSlides) return;

      const currentIndex = this.$appdata.get("modules.presentation.config.slide_index") || 0;
      const delta = action === "prev" ? -1 : 1;
      const nextIndex = Math.min(Math.max(currentIndex + delta, 0), totalSlides - 1);
      if (nextIndex !== currentIndex) {
        this.$appdata.set("modules.presentation.config.slide_index", nextIndex);
        window.dispatchEvent(new CustomEvent("presentation-slide-index-change", { detail: nextIndex }));
      }
    },
    hasActiveProjection() {
      const popups = this.$appdata.get("popups") || [];
      const popup = this.$appdata.get("popup");
      return popups.some(p => p && !p.closed) || !!(popup && !popup.closed);
    },
    isClockProjectionActive() {
      return this.$appdata.get("popup_module") === "clock";
    },
    isPresentationProjectionActive() {
      return this.$appdata.get("popup_module") === "presentation" && this.hasActiveProjection();
    },
    isBibleProjectionActive() {
      return this.$appdata.get("popup_module") === "bible" && this.hasActiveProjection();
    },
  },
};
</script>

<style>
#app-container > div {
  height: 100vh;
}
</style>
