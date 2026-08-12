<template>
  <v-slide-y-reverse-transition>
    <div v-if="module?.show" class="module-full-page dashboard-home d-flex flex-column bg-main help-page">
      <header v-if="!manualOpen" class="help-header flex-shrink-0">
        <div class="d-flex align-center help-title-group">
          <MenuToggleButton class="mr-4 flex-shrink-0" @toggle-sidebar="toggleSidebar" />
          <div class="module-icon-box d-flex align-center justify-center mr-4 flex-shrink-0">
            <v-icon :icon="manifest.icon || 'mdi-help-circle'" size="24" />
          </div>
          <div>
            <h2 class="section-title mb-0">
Ajuda e sobre
</h2>
            <p class="help-subtitle mb-0">
Encontre respostas sem sair do IASDPresenter
</p>
          </div>
        </div>


        <div class="help-tabs-wrapper">
          <v-tabs v-model="tab" color="var(--accent-blue)" density="comfortable">
            <v-tab :value="1">
              <v-icon start icon="mdi-information-outline" />
              Sobre
            </v-tab>
            <v-tab :value="2">
              <v-icon start icon="mdi-account-group-outline" />
              Desenvolvedores
            </v-tab>
          </v-tabs>
        </div>
      </header>

      <main class="help-content flex-grow-1 w-100">
        <ManualView v-if="manualOpen" @close="closeManual" @open-module="openModule" />

        <v-tabs-window v-else v-model="tab" class="h-100 w-100">
          <v-tabs-window-item :value="1" class="h-100">
            <div class="about-scroll h-100 overflow-auto px-6 pb-6">
              <div class="about-container mx-auto pb-4">
                <v-card class="settings-card rounded-xl pa-2 mb-6" flat>
                  <v-card-text class="pa-6 d-flex flex-column align-center text-center">
                    <div class="app-logo mb-4 rounded-circle d-flex align-center justify-center">
<img src="/ico/favicon.png" alt="IASDPresenter" />
</div>
                    <h3 class="font-weight-bold mb-1 app-name">
IASDPresenter
</h3>
                    <div class="version-chip text-body-2 font-weight-medium mb-6">
Versão {{ appVersion }} (Beta)
</div>
                    <p class="text-body-2 px-4 app-description secondary-text">
Aplicativo desktop para gerenciamento e apresentação de músicas, hinos, letras e recursos multimídia para igrejas. Feito com amor e tecnologia para tornar a adoração ainda mais fluida.
</p>
                  </v-card-text>
                </v-card>

                <v-card class="settings-card rounded-xl pa-2 mb-6" flat>
                  <v-card-text class="pa-6">
                    <div class="about-action-row">
                      <div class="d-flex align-center">
<v-icon color="primary" class="mr-3" size="24">
mdi-book-open-page-variant
</v-icon><div>
<h3 class="about-action-title">
Manual de Uso
</h3><div class="text-caption secondary-text">
Aprenda a utilizar todos os recursos
</div>
</div>
</div>
                      <v-btn variant="tonal" color="primary" class="rounded-lg text-none font-weight-bold px-4" @click="openManual">
Acessar
</v-btn>
                    </div>
                    <v-divider class="my-7 subtle-divider" />
                    <div class="about-action-row">
                      <div class="d-flex align-center">
<v-icon color="primary" class="mr-3" size="24">
mdi-rocket-launch
</v-icon><div>
<h3 class="about-action-title">
Atualizações
</h3><div class="text-caption secondary-text">
Verifique se há uma nova versão disponível
</div>
</div>
</div>
                      <v-btn variant="flat" color="primary" class="rounded-lg text-none font-weight-bold px-4" @click="openUpdate">
Verificar
</v-btn>
                    </div>
                  </v-card-text>
                </v-card>

                <v-card class="settings-card rounded-xl pa-2" flat>
                  <v-card-text class="pa-6 d-flex align-start">
                    <v-icon icon="mdi-information-outline" color="primary" class="mr-3 mt-1" />
                    <div>
<h3 class="about-action-title mb-2">
Sobre esta versão
</h3><p class="text-body-2 secondary-text mb-0 app-description">
O IASDPresenter funciona localmente e reúne projeção em múltiplas telas, biblioteca offline, controle remoto pela rede e ferramentas de apoio. Alguns recursos variam conforme o sistema, os arquivos e o equipamento.
</p>
</div>
                  </v-card-text>
                </v-card>
              </div>
            </div>
          </v-tabs-window-item>

          <v-tabs-window-item :value="2" class="h-100">
            <div class="about-scroll h-100 overflow-auto px-6 pb-6">
              <div class="about-container mx-auto pb-4">
                <v-card class="settings-card rounded-xl pa-2 mb-6" flat>
                  <v-card-text class="pa-8 d-flex flex-column align-center justify-center text-center developer-card">
                    <div class="team-icon mb-6 rounded-circle d-flex align-center justify-center">
<v-icon size="38" color="primary">
mdi-account-group-outline
</v-icon>
</div>
                    <h3 class="font-weight-bold mb-2 app-name">
Equipe e Contribuidores
</h3>
                    <p class="text-body-2 px-4 secondary-text app-description developer-copy">
O IASDPresenter é desenvolvido para apoiar equipes de mídia e louvor com uma operação simples, confiável e integrada.
</p>
                    <v-chip color="primary" variant="tonal" prepend-icon="mdi-heart-outline">
Feito para servir
</v-chip>
                  </v-card-text>
                </v-card>
                <v-card class="settings-card rounded-xl pa-2" flat>
                  <v-card-text class="pa-6">
                    <h3 class="about-action-title mb-4">
Créditos técnicos
</h3>
                    <div class="credit-list">
                      <div class="credit-item">
<v-icon icon="mdi-vuejs" color="primary" /><div><strong>Interface</strong><span>Vue 3 e Vuetify</span></div>
</div>
                      <div class="credit-item">
<v-icon icon="mdi-desktop-classic" color="primary" /><div><strong>Aplicativo desktop</strong><span>Electron</span></div>
</div>
                      <div class="credit-item">
<v-icon icon="mdi-database-outline" color="primary" /><div><strong>Biblioteca local</strong><span>Armazenamento e sincronização offline</span></div>
</div>
                    </div>
                  </v-card-text>
                </v-card>
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
.help-header { padding: 22px 24px 0; display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; background: var(--main-bg); border-bottom: 1px solid var(--border-color); }
.section-title { color: var(--sidebar-text); font-size: 24px; font-weight: 650; line-height: 1.1; letter-spacing: -0.02em; }
.help-subtitle, .secondary-text { color: var(--sidebar-text-secondary); }
.help-subtitle { margin-top: 4px; font-size: 12px; }
.help-tabs-wrapper { max-width: 100%; overflow-x: auto; }
.help-content { min-height: 0; overflow: hidden; background: var(--main-bg); }
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
  .help-header { padding: 16px 16px 0; gap: 12px; }
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
</style>
