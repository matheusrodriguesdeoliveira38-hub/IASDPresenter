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
.collapsible-panel{overflow:hidden;border:1px solid var(--border-color);border-radius:18px!important;background:var(--card-bg);box-shadow:0 8px 26px rgba(16,29,74,.055)!important;transition:border-color .2s ease,box-shadow .2s ease,transform .2s ease!important}
.collapsible-panel:hover{border-color:color-mix(in srgb,var(--accent-blue) 18%,var(--border-color))!important;box-shadow:0 14px 34px rgba(16,29,74,.085)!important;transform:translateY(-1px)!important}
.collapsible-panel__header{display:flex;width:100%;min-height:86px;padding:19px 23px;align-items:center;justify-content:space-between;gap:20px;color:var(--sidebar-text);border:0;background:linear-gradient(110deg,color-mix(in srgb,var(--accent-blue) 3.5%,var(--card-bg)),var(--card-bg) 48%);text-align:left;cursor:pointer}
.collapsible-panel__header:focus-visible{outline:3px solid color-mix(in srgb,var(--accent-blue) 35%,transparent);outline-offset:-3px}
.collapsible-panel__identity,.collapsible-panel__tools{display:flex;min-width:0;align-items:center}.collapsible-panel__identity{gap:15px}.collapsible-panel__tools{flex-shrink:0;gap:14px}
.collapsible-panel__icon{display:grid;width:48px;height:48px;flex:0 0 48px;place-items:center;color:var(--accent-blue);border:1px solid color-mix(in srgb,var(--accent-blue) 13%,var(--border-color));border-radius:14px;background:var(--accent-soft);box-shadow:inset 0 1px rgba(255,255,255,.35)}
.collapsible-panel__copy{display:flex;min-width:0;flex-direction:column;gap:4px}.collapsible-panel__copy strong{font-size:1.06rem;line-height:1.25;letter-spacing:-.015em}.collapsible-panel__copy small{color:var(--sidebar-text-secondary);font-size:.82rem;line-height:1.4}
.collapsible-panel__toggle{display:grid;width:38px;height:38px;place-items:center;border:1px solid var(--border-color);border-radius:11px;color:var(--sidebar-text-secondary);background:var(--main-bg);transition:color .2s ease,transform .2s ease,background .2s ease}.collapsible-panel__toggle.is-open{color:var(--accent-blue);background:var(--accent-soft);transform:rotate(180deg)}
.collapsible-panel__body{padding:6px 24px 26px;border-top:1px solid var(--border-color);background:color-mix(in srgb,var(--main-bg) 32%,var(--card-bg))}
.collapsible-panel__body :deep(.legacy-panel-content){margin:0!important;padding:0!important;background:transparent!important;box-shadow:none!important;transform:none!important}
.collapsible-panel__body :deep(.legacy-panel-content>.v-card-text){padding:20px 0 0!important}
.collapsible-panel--hide-first .collapsible-panel__body :deep(.legacy-panel-content>.v-card-text>:first-child){display:none!important}
@media(max-width:700px){.collapsible-panel__header{padding:16px;gap:10px}.collapsible-panel__body{padding:5px 16px 20px}.collapsible-panel__actions{display:none}.collapsible-panel__icon{width:43px;height:43px;flex-basis:43px}.collapsible-panel__copy small{font-size:.76rem}}
</style>

<style>
.settings-container{width:min(100%,1040px);max-width:1040px!important}
.projection-grid{display:grid!important;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);grid-template-areas:"outputs window" "visual visual";gap:20px}
.projection-grid>.v-divider{display:none}
.projection-block{min-width:0;margin:0!important;padding:20px;border:1px solid var(--border-color);border-radius:16px;background:color-mix(in srgb,var(--main-bg) 72%,transparent)}
.collapsible-panel .legacy-panel-content,.collapsible-panel .legacy-panel-content:hover{margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;transform:none!important}
.settings-container .legacy-panel-content,.settings-container .legacy-panel-content:hover{transition:none!important;box-shadow:none!important;transform:none!important}
.collapsible-panel .legacy-panel-content>.v-card__overlay,.collapsible-panel .legacy-panel-content>.v-card__underlay{display:none!important}
.collapsible-panel .legacy-panel-content>.v-card-text{padding:20px 0 0!important}
.collapsible-panel--hide-first .legacy-panel-content>.v-card-text>:first-child{display:none!important}
.collapsible-panel__body{background:transparent!important}
.projection-block--outputs{grid-area:outputs}.projection-block--return{grid-area:return}.projection-block--window{grid-area:window}.projection-block--visual{grid-area:visual}
@media(max-width:900px){.settings-container{max-width:100%!important}.projection-grid{grid-template-columns:1fr;grid-template-areas:"outputs" "window" "visual"}}
@media(max-width:600px){.projection-block{padding:14px}.settings-container{width:100%}}
</style>
