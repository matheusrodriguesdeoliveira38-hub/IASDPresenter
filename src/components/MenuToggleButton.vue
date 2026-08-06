<template>
  <button v-if="showButton" :aria-label="buttonLabel" class="menu-toggle-btn" :class="{ 'launcher-back-btn': isLauncherLayout }" @click="handleClick">
    <v-icon>{{ buttonIcon }}</v-icon>
    <v-tooltip
      activator="parent"
      location="bottom"
      open-delay="300"
      content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
    >
      {{ buttonLabel }}
    </v-tooltip>
  </button>
</template>

<script>
export default {
  name: "MenuToggleButton",
  emits: ["toggle-sidebar"],
  computed: {
    isLauncherLayout() {
      return this.$userdata.get("modules.config.home_layout") === "launcher";
    },
    currentModule() {
      const modules = this.$appdata.get("modules") || {};
      const overlays = ["album", "media", "lyric"];

      for (const [key, module] of Object.entries(modules)) {
        if (module.show && !overlays.includes(key)) {
          return key;
        }
      }
      return "home";
    },
    showButton() {
      return !this.isLauncherLayout || this.currentModule !== "home";
    },
    buttonIcon() {
      return this.isLauncherLayout ? "mdi-arrow-left" : "mdi-menu";
    },
    buttonLabel() {
      return this.isLauncherLayout ? "Voltar" : "Menu";
    },
  },
  methods: {
    handleClick() {
      if (this.isLauncherLayout) {
        this.$modules.open("home");
        return;
      }

      this.$emit("toggle-sidebar");
    },
  },
};
</script>

<style scoped>
.menu-toggle-btn {
  display: none;
  background: none;
  border: none;
  outline: none;
  cursor: pointer;
  max-width: 40px;
  padding: 8px;
  margin: 20px 16px;
  margin-right: 12px;
  border-radius: 50%;
  transition: background 0.2s, transform 0.2s;
  color: var(--sidebar-text);
}

.menu-toggle-btn:hover {
  background: var(--sidebar-hover);
  transform: scale(1.05);
}

.launcher-back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--card-bg);
  box-shadow: var(--shadow);
}

.menu-toggle-btn:active {
  transform: scale(0.95);
}

@media (max-width: 1024px) {
  .menu-toggle-btn {
    display: inline-flex;
    align-items: center;
  }
}
</style>
