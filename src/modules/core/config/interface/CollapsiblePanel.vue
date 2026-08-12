<template>
  <section class="collapsible-panel rounded-xl" :class="{ 'collapsible-panel--hide-first': hideFirst }">
    <button type="button" class="collapsible-panel__header" :aria-expanded="open" @click="open = !open">
      <span class="collapsible-panel__identity">
        <span class="collapsible-panel__icon">
          <v-icon :icon="icon" color="primary" size="26" />
        </span>
        <span class="collapsible-panel__copy">
          <strong>{{ title }}</strong>
          <small v-if="subtitle">{{ subtitle }}</small>
        </span>
      </span>
      <span class="collapsible-panel__tools">
        <span v-if="$slots.actions" class="collapsible-panel__actions" @click.stop><slot name="actions" /></span>
        <span class="collapsible-panel__toggle" :class="{ 'is-open': open }">
          <v-icon icon="mdi-chevron-down" size="24" />
        </span>
      </span>
    </button>
    <v-expand-transition>
      <div v-show="open" class="collapsible-panel__body"><slot /></div>
    </v-expand-transition>
  </section>
</template>

<script lang="ts">
export default {
  name: "CollapsiblePanel",
  props: {
    title: { type: String, required: true },
    subtitle: { type: String, default: "" },
    icon: { type: String, default: "mdi-tune-variant" },
    defaultOpen: { type: Boolean, default: true },
    hideFirst: { type: Boolean, default: true },
  },
  data() { return { open: this.defaultOpen }; },
};
</script>

<style scoped>
.collapsible-panel{overflow:hidden;border:1px solid color-mix(in srgb,var(--border-color) 78%,transparent);background:var(--card-bg);box-shadow:none!important;transition:none!important}
.collapsible-panel:hover{border-color:color-mix(in srgb,var(--border-color) 78%,transparent)!important;box-shadow:none!important;transform:none!important}
.collapsible-panel__header{display:flex;width:100%;min-height:78px;padding:18px 24px;align-items:center;justify-content:space-between;gap:20px;color:var(--sidebar-text);border:0;background:transparent;text-align:left;cursor:pointer}
.collapsible-panel__header:focus-visible{outline:3px solid color-mix(in srgb,var(--accent-blue) 35%,transparent);outline-offset:-3px}
.collapsible-panel__identity,.collapsible-panel__tools{display:flex;min-width:0;align-items:center}.collapsible-panel__identity{gap:14px}.collapsible-panel__tools{flex-shrink:0;gap:14px}
.collapsible-panel__icon{display:grid;width:42px;height:42px;flex:0 0 42px;place-items:center;border-radius:12px;background:color-mix(in srgb,var(--accent-blue) 11%,transparent)}
.collapsible-panel__copy{display:flex;min-width:0;flex-direction:column;gap:3px}.collapsible-panel__copy strong{font-size:1.08rem;line-height:1.25}.collapsible-panel__copy small{color:var(--sidebar-text-secondary);font-size:.78rem;line-height:1.35}
.collapsible-panel__toggle{display:grid;width:36px;height:36px;place-items:center;border-radius:10px;color:var(--sidebar-text-secondary);background:var(--main-bg);transition:color .2s ease,transform .2s ease}.collapsible-panel__toggle.is-open{color:var(--accent-blue);transform:rotate(180deg)}
.collapsible-panel__body{padding:4px 24px 24px;border-top:1px solid color-mix(in srgb,var(--border-color) 70%,transparent)}
.collapsible-panel__body :deep(.legacy-panel-content){margin:0!important;padding:0!important;background:transparent!important;box-shadow:none!important;transform:none!important}
.collapsible-panel__body :deep(.legacy-panel-content>.v-card-text){padding:20px 0 0!important}
.collapsible-panel--hide-first .collapsible-panel__body :deep(.legacy-panel-content>.v-card-text>:first-child){display:none!important}
@media(max-width:700px){.collapsible-panel__header{padding:16px;gap:10px}.collapsible-panel__body{padding:4px 16px 18px}.collapsible-panel__actions{display:none}}
</style>

<style>
.settings-container{width:min(100%,1040px);max-width:1040px!important}
.projection-grid{display:grid!important;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);grid-template-areas:"outputs window" "visual visual";gap:20px}
.projection-grid>.v-divider{display:none}
.projection-block{min-width:0;margin:0!important;padding:20px;border:1px solid var(--border-color);border-radius:16px;background:color-mix(in srgb,var(--main-bg) 72%,transparent)}
.collapsible-panel .legacy-panel-content,.collapsible-panel .legacy-panel-content:hover{margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;transform:none!important}
.settings-card.collapsible-panel,.settings-card.collapsible-panel:hover{box-shadow:none!important;transform:none!important}
.settings-container .settings-card,.settings-container .settings-card:hover{transition:none!important;box-shadow:none!important;transform:none!important}
.settings-container .theme-grid button,.settings-container .theme-grid button:hover{transition:none!important;box-shadow:none!important;transform:none!important}
.settings-container .theme-grid button.active,.settings-container .theme-grid button.active:hover{box-shadow:none!important;transform:none!important}
.settings-container .mini-preview,.settings-container .mini-preview:hover{box-shadow:none!important;transform:none!important;transition:none!important}
.collapsible-panel .legacy-panel-content>.v-card__overlay,.collapsible-panel .legacy-panel-content>.v-card__underlay{display:none!important}
.collapsible-panel .legacy-panel-content>.v-card-text{padding:20px 0 0!important}
.collapsible-panel--hide-first .legacy-panel-content>.v-card-text>:first-child{display:none!important}
.collapsible-panel__body{background:transparent!important}
.projection-block--outputs{grid-area:outputs}.projection-block--return{grid-area:return}.projection-block--window{grid-area:window}.projection-block--visual{grid-area:visual}
@media(max-width:900px){.settings-container{max-width:100%!important}.projection-grid{grid-template-columns:1fr;grid-template-areas:"outputs" "window" "visual"}}
@media(max-width:600px){.projection-block{padding:14px}.settings-container{width:100%}}
</style>
