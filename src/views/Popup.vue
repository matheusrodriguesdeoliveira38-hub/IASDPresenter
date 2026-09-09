<template>
  <div class="popup-stage w-100 h-100" style="background: #000">
    <div
      ref="projectionContent"
      class="projection-content w-100 h-100"
    >
      <component :is="loadModuleComponent()" v-if="module" />
    </div>
    <div v-if="projectionOverride === 'blackout'" class="projection-override projection-blackout" />
    <div v-else-if="projectionOverride === 'logo'" class="projection-override projection-logo">
      <img src="/ico/logo-horizontal.png" alt="IASDPresenter" />
    </div>
    <PulpitMessageOverlay v-if="module === 'return_monitor'" />
  </div>
</template>

<script lang="ts">
import { defineAsyncComponent } from "vue";
import PulpitMessageOverlay from "@/components/PulpitMessageOverlay.vue";

const moduleComponents = new Map();

export default {
  name: "PopupPage",
  components: { PulpitMessageOverlay },
  data: () => ({
    message: null,
    frozen: false,
    pendingMessages: {},
  }),
  computed: {
    module() {
      const routeModule = this.$route.query.module;
      if (routeModule === "return_monitor") return routeModule;
      return this.$appdata.get("popup_module") || routeModule;
    },
    projectionTransition() {
      return this.$appdata.get("projection_transition") || { active: false, durationMs: 300 };
    },
    projectionOverride() {
      return this.$appdata.get("projection_override") || "none";
    },
  },
  watch: {
    projectionTransition: {
      deep: true,
      async handler(transition) {
        await this.$nextTick();
        const element = this.$refs.projectionContent as HTMLElement;
        if (!element) return;
        const opacity = transition.active ? "0" : "1";
        const from = getComputedStyle(element).opacity;
        element.getAnimations().forEach(animation => animation.cancel());
        element.style.opacity = opacity;
        const duration = Math.max(0, Number(transition.durationMs) || 0);
        const animation = element.animate([{ opacity: from }, { opacity }], {
          duration,
          easing: "ease-in-out",
        });
        try {
          await animation.finished;
          window.opener?.postMessage({
            action: "projection-transition-complete",
            requestId: transition.requestId,
          }, "*");
        } catch {
          // A newer transition superseded this one.
        }
      },
    },
  },
  mounted() {
    this.$appdata.set("is_popup", true);
    window.addEventListener("keydown", this.handleKeydown);
    window.addEventListener("message", (event) => {
      if (event.origin === window.location.origin || event.origin === "file://" || event.origin === "null") {
        this.message = event.data;
        if (event.data.param === "projection_override") {
          const wasFrozen = this.frozen;
          this.frozen = event.data.value === "freeze";
          if (wasFrozen && !this.frozen) {
            Object.entries(this.pendingMessages).forEach(([param, value]) => {
              this.$appdata.set(param, value);
            });
            this.pendingMessages = {};
          }
          this.$appdata.set(event.data.param, event.data.value);
        } else if (event.data.param && this.frozen) {
          this.pendingMessages[event.data.param] = event.data.value;
        } else if (event.data.param) {
          this.$appdata.set(event.data.param, event.data.value);
        }
      }
    });

    window.opener.postMessage("mounted", "*");
  },
  unmounted() {
    window.removeEventListener("keydown", this.handleKeydown);
  },
  methods: {
    handleKeydown(event) {
      if (event.code !== "Escape") return;
      if (this.module === "clock") return;

      event.preventDefault();
      window.opener?.postMessage({ action: "close-projections" }, "*");
      window.close();
    },
    loadModuleComponent() {
      if (moduleComponents.has(this.module)) {
        return moduleComponents.get(this.module);
      }

      const component = defineAsyncComponent(() => {
        return import(
          `@/modules/core/${this.module}/interface/Popup.vue`
        ).catch(() => {
          return import(`@/modules/${this.module}/interface/Popup.vue`).catch(
            (e) => {
              this.$alert.error({
                text: "messages.error_import_module",
                error: e,
              });

              return null;
            },
          );
        });
      });
      moduleComponents.set(this.module, component);
      return component;
    },
  },
};
</script>

<style scoped>
.popup-stage {
  position: relative;
  overflow: hidden;
}

.projection-override {
  position: absolute;
  inset: 0;
  z-index: 9999;
}

.projection-blackout {
  background: #000;
}

.projection-content {
  opacity: 1;
}

.projection-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

.projection-logo img {
  width: min(54vw, 680px);
  max-height: 45vh;
  object-fit: contain;
}
</style>
