<template>
  <section class="mini-preview" :aria-label="label">
    <header>
<div><small>PR&Eacute;-VISUALIZA&Ccedil;&Atilde;O</small><span>{{ label }}</span></div><v-icon size="18" color="primary">
mdi-eye-outline
</v-icon>
</header>
    <div v-if="variant === 'theme'" class="theme-grid">
      <button v-for="theme in themes" :key="theme.id" type="button" :class="{ active: activeTheme === theme.id }" :aria-pressed="activeTheme === theme.id" @click="$emit('select-theme', theme.id)">
        <div class="theme-canvas" :style="themeStyle(theme)">
          <aside><i /><b v-for="item in 3" :key="item" :class="{ selected: item === 1 }" /></aside>
          <main><strong /><div><i v-for="item in 3" :key="item"><b /><em /></i></div></main>
        </div>
        <span><v-icon size="16">{{ theme.icon }}</v-icon>{{ theme.name }}<v-icon v-if="activeTheme === theme.id" size="16" color="primary">mdi-check-circle</v-icon></span>
      </button>
    </div>
    <div v-else class="projection-frame">
      <LSlide
        :slide_number="1"
        text="Grande ? o Senhor<br />e mui digno de louvor"
        :settings="projectionSettings"
      />
      <b class="ratio">16:9</b>
    </div>
  </section>
</template>

<script lang="ts">
import LSlide from "@/components/Slide.vue";

export default {
  name: "ConfigMiniPreview",
  components: { LSlide },
  props: {
    variant: { type: String, default: "theme" }, label: { type: String, default: "Veja o resultado em tempo real" },
    activeTheme: { type: String, default: "light" }, accentColor: { type: String, default: "#0097d7" }, alignment: { type: String, default: "Centro" },
    customText: Boolean, fontSize: { type: Number, default: 100 }, fontColor: { type: String, default: "#FFFFFF" }, fontWeight: { type: String, default: "700" },
    customBackground: Boolean, backgroundColor: { type: String, default: "#000000" }, backgroundImage: { type: String, default: null },
    backgroundType: { type: String, default: "image" }, backgroundOpacity: { type: Number, default: 100 }, showTitle: { type: Boolean, default: true },
  },
  emits: ["select-theme"],
  data: () => ({ themes: [
    { id: "light", name: "Claro", icon: "mdi-white-balance-sunny", bg: "#f4f7fb", surface: "#fff", text: "#172033", muted: "#dbe2ec" },
    { id: "dark", name: "Escuro", icon: "mdi-weather-night", bg: "#10151f", surface: "#1b2230", text: "#f3f6fb", muted: "#303a4b" },
  ] }),
  computed: {
    projectionSettings() {
      return {
        slide_align: this.alignment,
        slide_custom_text_format: this.customText,
        slide_font_size: this.fontSize,
        slide_font_color: this.fontColor,
        slide_font_weight: this.fontWeight,
        slide_custom_bg: this.customBackground,
        slide_bg_color: this.backgroundColor,
        slide_bg_image: this.backgroundImage,
        slide_bg_type: this.backgroundType,
        slide_bg_opacity: this.backgroundOpacity,
      };
    },
  },
  methods: { themeStyle(t) { return { "--p-bg": t.bg, "--p-surface": t.surface, "--p-text": t.text, "--p-muted": t.muted, "--p-accent": this.accentColor }; } },
};
</script>

<style scoped>
.mini-preview{padding:16px;border:1px solid var(--border-color);border-radius:16px;background:var(--main-bg)}
header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}header div{display:flex;flex-direction:column}header small{color:var(--accent-blue);font-size:.66rem;font-weight:800;letter-spacing:.09em}header span{color:var(--sidebar-text-secondary);font-size:.78rem}
.theme-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.theme-grid button{min-width:0;padding:0;overflow:hidden;color:var(--sidebar-text);border:2px solid transparent;border-radius:13px;background:var(--card-bg);cursor:pointer;transition:.2s}.theme-grid button:hover{transform:translateY(-2px);box-shadow:var(--shadow)}.theme-grid button.active{border-color:var(--accent-blue);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent-blue) 16%,transparent)}.theme-grid button>span{display:flex;height:37px;align-items:center;justify-content:center;gap:6px;font-size:.78rem;font-weight:700}
.theme-canvas{display:flex;height:104px;overflow:hidden;background:var(--p-bg)}.theme-canvas aside{display:flex;width:28%;padding:10px 7px;flex-direction:column;gap:8px;background:var(--p-surface);border-right:1px solid var(--p-muted)}.theme-canvas aside i{width:17px;height:17px;margin-bottom:5px;border-radius:5px;background:var(--p-accent)}.theme-canvas aside b{width:100%;height:7px;border-radius:5px;background:var(--p-muted)}.theme-canvas aside b.selected{background:var(--p-accent)}
.theme-canvas main{flex:1;padding:13px 10px}.theme-canvas main>strong{display:block;width:45%;height:7px;margin-bottom:14px;border-radius:5px;background:var(--p-text)}.theme-canvas main>div{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.theme-canvas main i{display:flex;height:50px;padding:7px 5px;flex-direction:column;align-items:center;gap:6px;border-radius:7px;background:var(--p-surface);box-shadow:0 3px 10px #00000017}.theme-canvas main i b{width:18px;height:18px;border-radius:6px;background:var(--p-accent)}.theme-canvas main i em{width:70%;height:5px;border-radius:4px;background:var(--p-text);opacity:.35}
.projection-frame{position:relative;aspect-ratio:16/9;overflow:hidden;border-radius:12px;background:#000}.projection-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background-position:center;background-size:cover}.projection-content{position:absolute;inset:0;display:flex;padding:7%;align-items:center}.projection-copy{display:flex;width:100%;flex-direction:column;align-items:center;text-align:center}.projection-copy small{margin-bottom:4px;color:#ffffffd1;font-size:8px;font-weight:600;letter-spacing:.18em;text-shadow:0 1px 4px #000}.projection-copy span{max-width:100%;padding:3.5% 5%;border:1px solid #ffffffd1;background:#00000040;line-height:1.35;letter-spacing:.03em;text-transform:uppercase;text-shadow:0 2px 6px #000;backdrop-filter:blur(3px);transition:.2s}.ratio{position:absolute;right:8px;bottom:6px;padding:2px 5px;color:#ffffffb3;border-radius:4px;background:#0000006b;font-size:8px}
@media(max-width:480px){.theme-grid{grid-template-columns:1fr}}
</style>
