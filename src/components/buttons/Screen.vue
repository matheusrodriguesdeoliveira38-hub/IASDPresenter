<template>
  <v-btn
    v-if="!is_mobile"
    :variant="variant"
    :size="size"
    :active="is_popup_opened"
    icon
    :class="{ 'rotate-icon': is_selected }"
    @click="popup()"
  >
    <v-icon>mdi-presentation-play</v-icon>
    <v-tooltip
      activator="parent"
      location="top"
      open-delay="300"
      content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
    >
      Projetar
    </v-tooltip>
  </v-btn>
</template>

<script lang="ts">
import type { PropType } from "vue";
import $userdata from "@/helpers/UserData";

export default {
  name: "ButtonScreenComponent",
  props: {
    module: {
      type: String,
      required: true,
    },
    size: {
      type: String,
      default: "small",
    },
    variant: {
      type: String as PropType<"flat" | "elevated" | "outlined" | "plain" | "text" | "tonal">,
      default: "text",
    },
    monitorConfigKey: {
      type: String,
      default: "",
    },
  },
  computed: {
    is_mobile() {
      return this.$appdata.get("is_mobile");
    },
    is_popup_opened() {
      return !!this.$appdata.get("popup");
    },
    popup_module() {
      return this.$appdata.get("popup_module");
    },
    is_selected() {
      return this.is_popup_opened && this.popup_module == this.module;
    },
  },
  methods: {
    async popup(forceOpen = false, isCurrent = () => true) {
      if (this.is_selected && forceOpen !== true) {
        this.$popup.exit();
        if (this.module === "bible" && window.electronAPI?.setPresentationShortcutsEnabled) {
          window.electronAPI.setPresentationShortcutsEnabled(false);
        }
      } else {
        let selectedMonitors = [];
        let fullscreen = true;
        const usesIndependentMediaSettings = this.module === "external_media"
          && $userdata.get("modules.config.media_sync_projection_settings") === false;

        if (usesIndependentMediaSettings) {
          fullscreen = $userdata.get("modules.config.media_slide_fullscreen") !== false;
        } else {
          fullscreen = $userdata.get("modules.config.slide_fullscreen") !== false;
        }

        if (window.electronAPI && window.electronAPI.getDisplays) {
          const displays = await window.electronAPI.getDisplays();
          if (!isCurrent()) return;
          if (displays && displays.length > 1) {
            let configMonitors = [];
            if (this.monitorConfigKey) {
              configMonitors = $userdata.get(this.monitorConfigKey);
            } else if (usesIndependentMediaSettings) {
              configMonitors = $userdata.get("modules.config.media_slide_monitor");
            } else {
              configMonitors = $userdata.get("modules.config.slide_monitor");
            }
            if (!Array.isArray(configMonitors)) {
              configMonitors = configMonitors ? [configMonitors] : [];
            }
            const primary = displays.find(d => d.isPrimary) || displays[0];
            selectedMonitors = displays
              .filter(display => display.id !== primary.id && configMonitors.some(id => String(id) === String(display.id)))
              .map(display => display.id);
          }
        }
        
        if (selectedMonitors.length > 0) {
          await this.$popup.syncMonitors(selectedMonitors, this.module, true, fullscreen);
        } else {
          if (this.module === "external_media") {
            if (fullscreen) {
              this.$emit("fullscreen");
            }
          } else {
            this.$popup.open({ module: this.module, fullscreen });
          }
        }

        if (this.module === "bible" && window.electronAPI?.setPresentationShortcutsEnabled) {
          window.electronAPI.setPresentationShortcutsEnabled(true);
        }
      }
    },
  },
};
</script>

<style scoped>
.rotate-icon {
  transform: rotate(180deg);
  transition: transform 0.3s ease;
}
</style>
