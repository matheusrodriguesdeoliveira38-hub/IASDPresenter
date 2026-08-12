<template>
  <div v-if="import_modules">
    <component
      :is="loadModuleComponent(module)"
      v-for="module in loadedModules"
      :key="module.id"
    />
  </div>
</template>

<script lang="ts">
import { defineAsyncComponent } from "vue";

const coreModuleInterfaces = import.meta.glob("../modules/core/*/interface/Index.vue");
const customModuleInterfaces = import.meta.glob("../modules/*/interface/Index.vue");

export default {
  name: "ModulesLayout",
  data() {
    return {
      // Cache de componentes para evitar recriação em cada re-render
      componentCache: {},
      // Monta cada interface somente no primeiro uso. Isso evita que consultas,
      // observers e componentes pesados de todos os módulos rodem durante o boot.
      loadedModuleIds: [],
    };
  },
  computed: {
    modules() {
      return this.$modules.get();
    },
    import_modules() {
      return this.$appdata.get("import_modules");
    },
    loadedModules() {
      const modules = this.modules || {};
      const moduleIds = new Set([
        ...this.loadedModuleIds,
        ...this.visibleModuleIds,
      ]);
      return Array.from(moduleIds)
        .map((id) => modules[id])
        .filter(Boolean);
    },
    visibleModuleIds() {
      return Object.values(this.modules || {})
        .filter((module) => module?.show)
        .map((module) => module.id);
    },
  },
  watch: {
    visibleModuleIds: {
      immediate: true,
      handler(moduleIds) {
        for (const id of moduleIds) {
          if (!this.loadedModuleIds.includes(id)) {
            this.loadedModuleIds.push(id);
          }
        }
      },
    },
  },
  methods: {
    loadModuleComponent(module) {
      // Retorna do cache se já foi carregado, evitando remount
      if (this.componentCache[module.id]) {
        return this.componentCache[module.id];
      }

      const loader =
        coreModuleInterfaces[`../modules/core/${module.id}/interface/Index.vue`] ||
        customModuleInterfaces[`../modules/${module.id}/interface/Index.vue`];

      if (!loader) {
        this.$alert.error({
          text: "messages.error_import_module",
          error: `Interface do módulo ${module.id} não encontrada.`,
        });
        return null;
      }

      const comp = defineAsyncComponent(loader);

      this.componentCache[module.id] = comp;
      return comp;
    },
  },
};
</script>
