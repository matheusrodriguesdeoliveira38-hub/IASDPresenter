<template>
  <v-slide-y-reverse-transition>
    <div v-if="module?.show" class="module-full-page dashboard-home d-flex flex-column bg-main help-page">
      <header v-if="!manualOpen" class="help-header flex-shrink-0">
        <div class="help-title-group">
          <MenuToggleButton class="flex-shrink-0" @toggle-sidebar="toggleSidebar" />
          <div class="module-icon-box d-flex align-center justify-center flex-shrink-0">
            <v-icon :icon="manifest.icon || 'mdi-help-circle'" size="24" />
          </div>
          <div>
            <h2 class="section-title">Ajuda e sobre</h2>
            <p class="help-subtitle">Informações, suporte e guias do IASDPresenter</p>
          </div>
        </div>

        <nav class="help-tabs" aria-label="Seções de ajuda">
          <button type="button" :class="{ active: tab === 1 }" @click="tab = 1">
            <v-icon icon="mdi-information-outline" size="18" />
            <span>Visão geral</span>
          </button>
          <button type="button" :class="{ active: tab === 2 }" @click="tab = 2">
            <v-icon icon="mdi-account-group-outline" size="18" />
            <span>Equipe e créditos</span>
          </button>
        </nav>
      </header>

      <main class="help-content flex-grow-1 w-100">
        <ManualView v-if="manualOpen" @close="closeManual" @open-module="openModule" />

        <v-tabs-window v-else v-model="tab" class="h-100 w-100">
          <v-tabs-window-item :value="1" class="h-100">
            <div class="about-scroll h-100 overflow-auto">
              <div class="about-container">
                <section class="about-hero">
                  <div class="about-hero-copy">
                    <div class="product-mark">
                      <div class="app-logo"><img src="/ico/favicon.png" alt="IASDPresenter" /></div>
                      <div><span>IASDPresenter</span><strong>Central de suporte</strong></div>
                    </div>
                    <span class="hero-kicker"><v-icon icon="mdi-sparkles" size="15" /> TUDO EM UM SÓ LUGAR</span>
                    <h1>Apresente com confiança.<br><em>Encontre ajuda rapidamente.</em></h1>
                    <p>Consulte instruções práticas, conheça os recursos do aplicativo e mantenha sua instalação atualizada.</p>
                    <div class="hero-actions">
                      <v-btn color="primary" variant="flat" prepend-icon="mdi-book-open-page-variant" @click="openManual">Abrir manual</v-btn>
                      <v-btn color="primary" variant="tonal" prepend-icon="mdi-update" @click="openUpdate">Buscar atualizações</v-btn>
                    </div>
                  </div>
                  <div class="about-hero-visual" aria-hidden="true">
                    <div class="visual-glow" />
                    <div class="visual-screen">
                      <div class="visual-screen-top"><i /><i /><i /><span>IASDPresenter</span></div>
                      <div class="visual-screen-content">
                        <span class="visual-play"><v-icon icon="mdi-play" size="30" /></span>
                        <div><strong>Pronto para apresentar</strong><small>Biblioteca e ferramentas integradas</small></div>
                      </div>
                    </div>
                    <div class="floating-status"><v-icon icon="mdi-check-circle" size="20" /><span><strong>Versão {{ appVersion }}</strong><small>Beta</small></span></div>
                  </div>
                </section>

                <section class="help-section">
                  <div class="section-heading">
                    <div><span>COMECE POR AQUI</span><h2>Como podemos ajudar?</h2></div>
                    <p>Acesse diretamente o recurso de que você precisa.</p>
                  </div>
                  <div class="help-action-grid">
                    <article class="help-action-card featured">
                      <span class="action-icon"><v-icon icon="mdi-book-open-variant" size="27" /></span>
                      <div><span>GUIA COMPLETO</span><h3>Manual de uso</h3><p>Passos claros para configurar telas, preparar músicas, usar a Bíblia e operar cada ferramenta.</p></div>
                      <v-btn color="primary" variant="flat" append-icon="mdi-arrow-right" @click="openManual">Explorar manual</v-btn>
                    </article>
                    <article class="help-action-card">
                      <span class="action-icon orange"><v-icon icon="mdi-rocket-launch-outline" size="27" /></span>
                      <div><span>MANUTENÇÃO</span><h3>Atualizações</h3><p>Confira a versão instalada e procure melhorias disponíveis para o aplicativo.</p></div>
                      <v-btn color="primary" variant="tonal" append-icon="mdi-arrow-right" @click="openUpdate">Verificar agora</v-btn>
                    </article>
                  </div>
                </section>

                <section class="capabilities-grid">
                  <article><span><v-icon icon="mdi-monitor-multiple" size="22" /></span><div><strong>Múltiplas telas</strong><small>Projeção e retorno independentes</small></div></article>
                  <article><span><v-icon icon="mdi-cloud-off-outline" size="22" /></span><div><strong>Biblioteca offline</strong><small>Conteúdo disponível localmente</small></div></article>
                  <article><span><v-icon icon="mdi-remote" size="22" /></span><div><strong>Controle remoto</strong><small>Operação pela rede local</small></div></article>
                  <article><span><v-icon icon="mdi-shield-check-outline" size="22" /></span><div><strong>Dados locais</strong><small>Controle e privacidade no computador</small></div></article>
                </section>

                <section class="version-panel">
                  <div class="version-icon"><v-icon icon="mdi-information-outline" size="24" /></div>
                  <div><span>SOBRE ESTA VERSÃO</span><h3>IASDPresenter {{ appVersion }} <small>Beta</small></h3><p>Aplicativo desktop para gerenciamento e apresentação de músicas, hinos, letras, Bíblia e recursos multimídia para igrejas.</p></div>
                </section>
              </div>
            </div>
          </v-tabs-window-item>

          <v-tabs-window-item :value="2" class="h-100">
            <div class="about-scroll h-100 overflow-auto">
              <div class="about-container">
                <section class="team-hero">
                  <div class="team-symbol"><v-icon icon="mdi-account-group-outline" size="38" /></div>
                  <span>NOSSA MISSÃO</span>
                  <h1>Tecnologia criada para servir.</h1>
                  <p>O IASDPresenter é desenvolvido para apoiar equipes de mídia e louvor com uma operação simples, confiável e integrada.</p>
                  <v-chip color="primary" variant="tonal" prepend-icon="mdi-heart-outline">Feito para servir</v-chip>
                </section>

                <section class="help-section credits-section">
                  <div class="section-heading"><div><span>TECNOLOGIA</span><h2>Créditos técnicos</h2></div><p>Uma base moderna para uma experiência rápida e confiável.</p></div>
                  <div class="credit-grid">
                    <article><span><v-icon icon="mdi-vuejs" size="25" /></span><div><strong>Interface</strong><small>Vue 3 e Vuetify</small><p>Componentes responsivos e uma navegação fluida.</p></div></article>
                    <article><span><v-icon icon="mdi-desktop-classic" size="25" /></span><div><strong>Aplicativo desktop</strong><small>Electron</small><p>Integração nativa com telas, arquivos e mídia.</p></div></article>
                    <article><span><v-icon icon="mdi-database-outline" size="25" /></span><div><strong>Biblioteca local</strong><small>Armazenamento offline</small><p>Conteúdo acessível mesmo sem conexão com a internet.</p></div></article>
                  </div>
                </section>
              </div>
            </div>
          </v-tabs-window-item>
        </v-tabs-window>
      </main>
    </div>
  </v-slide-y-reverse-transition>
</template>

<script lang="ts">
import MenuToggleButton from "@/components/MenuToggleButton.vue";
import ManualView from "./ManualView.vue";
import packageJson from "../../../../../package.json";
import manifest from "../manifest.json";


export default {
  name: "HelpModule",
  components: { MenuToggleButton, ManualView },
  data: () => ({
    tab: 1,
    manualOpen: false,
    manifest,
  }),
  computed: {
    module_id() { return manifest.id; },
    module() { return this.$modules.get(this.module_id); },
    appVersion() { return packageJson.version; },
  },
  watch: {
    "module.show"(show: boolean) {
      if (!show) this.closeManual();
    },
  },
  methods: {
    toggleSidebar() { document.querySelector(".main-container")?.dispatchEvent(new CustomEvent("toggle-sidebar", { bubbles: true })); },
    openManual() { this.manualOpen = true; },
    closeManual() { this.manualOpen = false; },
    openModule(moduleId: string) { this.closeManual(); this.$modules.open(moduleId); },
    openUpdate() { this.$modules.open("update"); },
  },
};
</script>

<style scoped>
.help-page { position: absolute; inset: 0; z-index: 50; overflow: hidden; }
.help-header { padding: 28px var(--page-gutter) 0; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; background: transparent; border-bottom: 1px solid var(--border-color); }
.section-title { color: var(--sidebar-text); font-size: 24px; font-weight: 650; line-height: 1.1; letter-spacing: -0.02em; }
.help-subtitle, .secondary-text { color: var(--sidebar-text-secondary); }
.help-subtitle { margin-top: 4px; font-size: 12px; }
.help-tabs-wrapper { max-width: 100%; overflow-x: auto; }
.help-content { min-height: 0; overflow: hidden; background: transparent; }
.about-scroll { padding-top: 28px; }
.about-container { max-width: 660px; }
.settings-card { background: var(--card-bg); box-shadow: var(--shadow); border: 1px solid var(--border-color); }
.app-logo { width: 96px; height: 96px; background: color-mix(in srgb, var(--accent-blue) 6%, transparent); border: 1px solid var(--border-color); }
.app-logo img { width: 56px; height: 56px; }
.app-name, .about-action-title { color: var(--sidebar-text); }
.app-name { font-size: 1.5rem; letter-spacing: -0.02em; }
.version-chip { padding: 4px 12px; color: var(--sidebar-text-secondary); background: var(--main-bg); border-radius: 20px; box-shadow: inset 0 0 0 1px var(--border-color); }
.app-description { line-height: 1.65; }
.about-action-row { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
.about-action-title { margin: 0; font-size: 1.05rem; font-weight: 700; line-height: 1.2; }
.subtle-divider { opacity: 0.25; }
.developer-card { min-height: 330px; }
.team-icon { width: 82px; height: 82px; background: color-mix(in srgb, var(--accent-blue) 7%, transparent); border: 1px dashed var(--border-color); }
.developer-copy { max-width: 430px; }
.credit-list { display: grid; gap: 16px; }
.credit-item { display: grid; grid-template-columns: 30px minmax(0, 1fr); align-items: center; gap: 10px; }
.credit-item div { display: flex; flex-direction: column; }
.credit-item strong { color: var(--sidebar-text); font-size: 13px; }
.credit-item span { color: var(--sidebar-text-secondary); font-size: 12px; }
@media (max-width: 900px) {
  .manual-shell { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); }
  .manual-sidebar { padding: 12px 16px; display: flex; gap: 8px; overflow-x: auto; overflow-y: hidden; border-right: 0; border-bottom: 1px solid var(--border-color); }
  .manual-sidebar-heading { display: none; }
  .manual-nav-item { width: auto; min-width: max-content; grid-template-columns: 22px auto auto; }
}
@media (max-width: 650px) {
  .help-header { padding: 16px var(--page-gutter) 0; gap: 12px; }
  .help-title-group, .help-tabs-wrapper { width: 100%; }
  .help-subtitle { display: none; }
  .section-title { font-size: 20px; }
  .manual-main { padding: 18px 14px 36px; }
  .manual-hero { min-height: 132px; padding: 22px 74px 22px 22px; }
  .manual-hero-icon { right: 18px; font-size: 58px; }
  .manual-hero h3 { font-size: 23px; }
  .manual-hero p { font-size: 12px; }
  .manual-panels :deep(.v-expansion-panel-text__wrapper) { padding: 2px 16px 18px; }
  .topic-title-copy span { white-space: normal; }
  .about-action-row { align-items: flex-start; flex-direction: column; }
}

/* Modern help hub */
.help-page,
.help-page *,
.help-page *::before,
.help-page *::after { box-sizing: border-box; }
.help-page {
  background:
    radial-gradient(circle at 84% 4%, rgba(var(--accent-blue-rgb), .07), transparent 28%),
    radial-gradient(circle at 8% 100%, rgba(255, 107, 53, .045), transparent 28%),
    var(--main-bg);
}
.help-header {
  min-height: 96px;
  padding: 24px clamp(24px, 3vw, 44px) 18px !important;
  flex-wrap: nowrap;
  border-bottom: 1px solid var(--border-color);
}
.help-title-group { min-width: 0; display: flex; align-items: center; gap: 14px; }
.help-title-group .module-icon-box { margin: 0 !important; }
.help-title-group .section-title { margin: 0; }
.help-subtitle { margin: 5px 0 0; font-size: 13px; }
.help-tabs { flex: 0 0 auto; padding: 4px; display: flex; gap: 4px; border: 1px solid var(--border-color); border-radius: 13px; background: color-mix(in srgb, var(--card-bg) 88%, var(--main-bg)); box-shadow: var(--shadow); }
.help-tabs button { min-height: 38px; padding: 0 15px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; color: var(--sidebar-text-secondary); border: 0; border-radius: 9px; background: transparent; cursor: pointer; font: inherit; font-size: 13px; font-weight: 650; transition: color .18s ease, background .18s ease, box-shadow .18s ease; }
.help-tabs button:hover { color: var(--sidebar-text); background: var(--sidebar-hover); }
.help-tabs button.active { color: #fff; background: linear-gradient(135deg, var(--accent-blue), var(--accent-blue-dark)); box-shadow: 0 6px 15px rgba(var(--accent-blue-rgb), .25); }
.about-scroll { padding: 30px clamp(24px, 3.2vw, 50px) 54px !important; }
.about-container { width: 100%; max-width: 1160px; margin: 0 auto; padding: 0 !important; }
.about-hero { position: relative; min-height: 360px; padding: clamp(34px, 4vw, 58px); display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(330px, .8fr); align-items: center; gap: 44px; overflow: hidden; border: 1px solid rgba(79, 120, 190, .3); border-radius: 28px; background: linear-gradient(125deg, #07182f 0%, #0b2851 55%, #123e73 100%); box-shadow: 0 24px 60px rgba(8, 28, 59, .2); }
.about-hero::before { content: ""; position: absolute; width: 440px; height: 440px; right: -150px; top: -250px; border-radius: 50%; background: rgba(67, 139, 255, .16); }
.about-hero::after { content: ""; position: absolute; width: 300px; height: 300px; left: 38%; bottom: -260px; border-radius: 50%; background: rgba(255, 107, 53, .13); }
.about-hero-copy { position: relative; z-index: 2; }
.product-mark { margin-bottom: 26px; display: flex; align-items: center; gap: 11px; }
.app-logo { width: 48px; height: 48px; display: grid; place-items: center; border: 1px solid rgba(255,255,255,.2); border-radius: 14px; background: rgba(255,255,255,.1); box-shadow: none; }
.app-logo img { width: 31px; height: 31px; }
.product-mark > div:last-child { display: flex; flex-direction: column; }
.product-mark span { color: rgba(226, 240, 255, .68); font-size: 11px; }
.product-mark strong { color: #fff; font-size: 15px; }
.about-hero .hero-kicker { display: inline-flex; align-items: center; gap: 6px; color: #7fc8ff; font-size: 10px; font-weight: 800; letter-spacing: .13em; }
.about-hero h1 { max-width: 650px; margin: 11px 0 14px; color: #fff; font-size: clamp(32px, 3.4vw, 48px); line-height: 1.08; letter-spacing: -.045em; }
.about-hero h1 em { color: #7fc8ff; font-style: normal; }
.about-hero-copy > p { max-width: 630px; margin: 0; color: rgba(224, 237, 252, .74); font-size: 15px; line-height: 1.65; }
.hero-actions { margin-top: 27px; display: flex; flex-wrap: wrap; gap: 11px; }
.about-hero .hero-actions :deep(.v-btn--variant-tonal) { color: #fff !important; background: rgba(255,255,255,.1) !important; border-color: rgba(255,255,255,.18) !important; }
.about-hero-visual { position: relative; z-index: 2; min-height: 230px; }
.visual-glow { position: absolute; inset: 12% 5%; border-radius: 50%; background: rgba(54, 132, 255, .32); filter: blur(45px); }
.visual-screen { position: absolute; inset: 10px 10px 36px 0; overflow: hidden; border: 1px solid rgba(255,255,255,.22); border-radius: 21px; background: rgba(8, 23, 46, .72); box-shadow: 0 28px 45px rgba(0,0,0,.28); transform: perspective(900px) rotateY(-7deg) rotateX(2deg); }
.visual-screen-top { height: 38px; padding: 0 13px; display: flex; align-items: center; gap: 5px; color: rgba(255,255,255,.5); border-bottom: 1px solid rgba(255,255,255,.1); font-size: 9px; }
.visual-screen-top i { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,.24); }.visual-screen-top span { margin-left: auto; }
.visual-screen-content { height: calc(100% - 38px); display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; text-align: center; }
.visual-play { width: 58px; height: 58px; margin-bottom: 14px; display: grid; place-items: center; border-radius: 18px; background: linear-gradient(145deg, var(--accent-blue), #4a8bff); box-shadow: 0 12px 30px rgba(var(--accent-blue-rgb), .35); }
.visual-screen-content div { display: flex; flex-direction: column; gap: 4px; }.visual-screen-content strong { font-size: 14px; }.visual-screen-content small { color: rgba(255,255,255,.55); font-size: 10px; }
.floating-status { position: absolute; right: 0; bottom: 10px; min-width: 150px; padding: 11px 14px; display: flex; align-items: center; gap: 9px; color: #23c483; border: 1px solid rgba(255,255,255,.24); border-radius: 14px; background: rgba(255,255,255,.95); box-shadow: 0 14px 30px rgba(0,0,0,.2); }
.floating-status span { display: flex; flex-direction: column; }.floating-status strong { color: #14223b; font-size: 11px; }.floating-status small { color: #718096; font-size: 9px; }
.help-section { margin-top: 42px; }
.section-heading { margin-bottom: 17px; display: flex; align-items: flex-end; justify-content: space-between; gap: 28px; }
.section-heading span, .version-panel > div:nth-child(2) > span, .team-hero > span { color: var(--accent-blue); font-size: 10px; font-weight: 800; letter-spacing: .14em; }
.section-heading h2 { margin: 3px 0 0; color: var(--sidebar-text); font-size: 25px; letter-spacing: -.03em; }
.section-heading > p { max-width: 390px; margin: 0; color: var(--sidebar-text-secondary); font-size: 13px; text-align: right; }
.help-action-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.help-action-card { min-width: 0; min-height: 245px; padding: 25px; display: grid; grid-template-columns: 52px minmax(0, 1fr); grid-template-rows: 1fr auto; gap: 0 17px; color: var(--sidebar-text); border: 1px solid var(--border-color); border-radius: 20px; background: var(--card-bg); box-shadow: var(--shadow); transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease; }
.help-action-card:hover { border-color: color-mix(in srgb, var(--accent-blue) 26%, var(--border-color)); box-shadow: var(--shadow-hover); transform: translateY(-2px); }
.action-icon { width: 52px; height: 52px; display: grid; place-items: center; color: var(--accent-blue); border-radius: 15px; background: var(--accent-soft); }.action-icon.orange { color: #f26735; background: rgba(242, 103, 53, .1); }
.help-action-card > div > span { color: var(--accent-blue); font-size: 9px; font-weight: 800; letter-spacing: .12em; }.help-action-card h3 { margin: 4px 0 7px; font-size: 19px; }.help-action-card p { margin: 0; color: var(--sidebar-text-secondary); font-size: 13px; line-height: 1.55; }
.help-action-card > .v-btn { grid-column: 2; align-self: end; justify-self: start; margin-top: 20px; }
.capabilities-grid { margin-top: 16px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.capabilities-grid article { min-width: 0; padding: 17px; display: flex; align-items: center; gap: 12px; border: 1px solid var(--border-color); border-radius: 16px; background: color-mix(in srgb, var(--card-bg) 94%, var(--main-bg)); }
.capabilities-grid article > span { width: 39px; height: 39px; flex: 0 0 39px; display: grid; place-items: center; color: var(--accent-blue); border-radius: 11px; background: var(--accent-soft); }.capabilities-grid article > div { min-width: 0; display: flex; flex-direction: column; }.capabilities-grid strong { color: var(--sidebar-text); font-size: 12px; }.capabilities-grid small { margin-top: 2px; color: var(--sidebar-text-secondary); font-size: 10px; line-height: 1.35; }
.version-panel { margin-top: 16px; padding: 22px 24px; display: grid; grid-template-columns: 48px minmax(0, 1fr); align-items: start; gap: 16px; border: 1px solid var(--border-color); border-radius: 18px; background: var(--card-bg); }
.version-icon { width: 48px; height: 48px; display: grid; place-items: center; color: var(--accent-blue); border-radius: 14px; background: var(--accent-soft); }.version-panel h3 { margin: 3px 0 5px; color: var(--sidebar-text); font-size: 16px; }.version-panel h3 small { padding: 3px 7px; color: var(--accent-blue); border-radius: 99px; background: var(--accent-soft); font-size: 9px; vertical-align: 2px; }.version-panel p { margin: 0; color: var(--sidebar-text-secondary); font-size: 12px; line-height: 1.55; }
.team-hero { min-height: 340px; padding: 54px 30px; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; text-align: center; border: 1px solid var(--border-color); border-radius: 26px; background: radial-gradient(circle at 50% 0, rgba(var(--accent-blue-rgb), .12), transparent 55%), var(--card-bg); box-shadow: var(--shadow); }
.team-symbol { width: 78px; height: 78px; margin-bottom: 20px; display: grid; place-items: center; color: #fff; border-radius: 22px; background: linear-gradient(145deg, var(--accent-blue), var(--accent-blue-dark)); box-shadow: 0 15px 32px rgba(var(--accent-blue-rgb), .25); }.team-hero h1 { margin: 7px 0 10px; color: var(--sidebar-text); font-size: clamp(30px, 4vw, 44px); letter-spacing: -.045em; }.team-hero p { max-width: 610px; margin: 0 0 22px; color: var(--sidebar-text-secondary); font-size: 14px; line-height: 1.65; }
.credit-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 15px; }.credit-grid article { min-height: 190px; padding: 23px; display: flex; align-items: flex-start; gap: 14px; border: 1px solid var(--border-color); border-radius: 18px; background: var(--card-bg); box-shadow: var(--shadow); }.credit-grid article > span { width: 46px; height: 46px; flex: 0 0 46px; display: grid; place-items: center; color: var(--accent-blue); border-radius: 13px; background: var(--accent-soft); }.credit-grid article > div { display: flex; flex-direction: column; }.credit-grid strong { color: var(--sidebar-text); font-size: 14px; }.credit-grid small { margin-top: 2px; color: var(--accent-blue); font-size: 11px; font-weight: 650; }.credit-grid p { margin: 15px 0 0; color: var(--sidebar-text-secondary); font-size: 12px; line-height: 1.55; }
@media (max-width: 1050px) { .about-hero { grid-template-columns: 1fr; }.about-hero-visual { display: none; }.capabilities-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.credit-grid { grid-template-columns: 1fr; }.credit-grid article { min-height: 0; } }
@media (max-width: 760px) { .help-header { align-items: flex-start; flex-direction: column; }.help-tabs { width: 100%; }.help-tabs button { flex: 1; }.help-action-grid { grid-template-columns: 1fr; }.section-heading { align-items: flex-start; flex-direction: column; gap: 6px; }.section-heading > p { text-align: left; }.about-hero { min-height: 0; padding: 30px 24px; }.capabilities-grid { grid-template-columns: 1fr; } }
@media (max-width: 480px) { .help-tabs button span { display: none; }.about-scroll { padding: 18px 14px 40px !important; }.about-hero h1 { font-size: 31px; }.help-action-card { grid-template-columns: 46px minmax(0, 1fr); padding: 20px; }.action-icon { width: 46px; height: 46px; }.version-panel { grid-template-columns: 1fr; } }
</style>
