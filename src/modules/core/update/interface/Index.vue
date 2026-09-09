<template>
  <v-slide-y-reverse-transition>
    <div v-if="show" class="update-overlay">
      <section class="update-dialog" role="dialog" aria-modal="true" aria-labelledby="update-title">
        <header class="update-header">
          <div class="update-brand">
            <span class="update-brand-icon"><v-icon icon="mdi-cloud-sync-outline" size="25" /></span>
            <div><span>IASDPresenter</span><strong>Central de atualizações</strong></div>
          </div>
          <v-btn icon variant="text" aria-label="Fechar" @click="close"><v-icon>mdi-close</v-icon><v-tooltip activator="parent" location="bottom">Fechar</v-tooltip></v-btn>
        </header>

        <div class="update-body">
          <div class="version-summary">
            <div>
              <span class="summary-kicker">STATUS DO APLICATIVO</span>
              <h2 id="update-title">{{ statusTitle }}</h2>
              <p>{{ statusDescription }}</p>
            </div>
            <div class="version-comparison">
              <div><span>Instalada</span><strong>v{{ currentVersion }}</strong></div>
              <v-icon icon="mdi-arrow-right" size="19" />
              <div :class="{ highlighted: hasNewVersion }"><span>Disponível</span><strong>{{ updateVersion ? `v${updateVersion}` : '—' }}</strong></div>
            </div>
          </div>

          <div v-if="isChecking" class="update-state checking-state">
            <span class="state-visual"><v-progress-circular indeterminate color="primary" size="38" width="3" /></span>
            <div><strong>Procurando uma nova versão</strong><p>Isso deve levar apenas alguns segundos.</p></div>
          </div>

          <div v-else-if="updateStatus === 'not-available'" class="update-state success-state">
            <span class="state-visual"><v-icon icon="mdi-check-bold" size="28" /></span>
            <div><strong>Você está usando a versão mais recente</strong><p>Não é necessário fazer nenhuma alteração agora.</p></div>
          </div>

          <div v-else-if="updateStatus === 'error'" class="update-state error-state">
            <span class="state-visual"><v-icon icon="mdi-alert-outline" size="28" /></span>
            <div><strong>Não foi possível verificar as atualizações</strong><p>Confira sua conexão e tente novamente.</p></div>
          </div>

          <div v-else class="release-panel">
            <div class="release-heading"><span><v-icon icon="mdi-sparkles" size="17" /> NOVIDADES</span><h3>O que há de novo?</h3></div>
            <div v-if="releaseNotes" class="release-notes-content" v-html="releaseNotes" />
            <div v-else class="empty-release"><v-icon icon="mdi-text-box-outline" size="28" /><span>Esta versão não possui notas detalhadas de lançamento.</span></div>
          </div>

          <div v-if="updateStatus === 'downloading'" class="download-panel">
            <div><span>Baixando atualização</span><strong>{{ downloadPercent }}%</strong></div>
            <div class="download-track"><i :style="{ width: downloadPercent + '%' }" /></div>
            <small>Você pode continuar usando o aplicativo durante o download.</small>
          </div>
        </div>

        <footer class="update-footer">
          <span><v-icon icon="mdi-shield-check-outline" size="17" /> Atualização verificada e instalada com segurança.</span>
          <div>
            <v-btn variant="text" @click="close">Agora não</v-btn>
            <v-btn v-if="updateStatus === 'available'" color="primary" variant="flat" height="44" prepend-icon="mdi-download" @click="startDownload">Baixar atualização</v-btn>
            <v-btn v-else-if="updateStatus === 'downloading'" color="primary" variant="tonal" height="44" disabled prepend-icon="mdi-loading mdi-spin">Baixando...</v-btn>
            <v-btn v-else-if="updateStatus === 'ready'" color="success" variant="flat" height="44" prepend-icon="mdi-restart" @click="installUpdate">Reiniciar e instalar</v-btn>
            <v-btn v-else-if="updateStatus === 'error'" color="error" variant="flat" height="44" prepend-icon="mdi-refresh" @click="retryUpdate">Tentar novamente</v-btn>
            <v-btn v-else-if="updateStatus === 'not-available'" color="primary" variant="tonal" height="44" prepend-icon="mdi-check" @click="close">Concluir</v-btn>
          </div>
        </footer>
      </section>
    </div>
  </v-slide-y-reverse-transition>
</template>

<script lang="ts">
import packageJson from "../../../../../package.json";

export default {
  name: "UpdateModule",
  computed: {
    module_id() {
      return "update";
    },
    module() {
      return this.$modules.get(this.module_id);
    },
    show: {
      get() {
        return this.module?.show || false;
      },
      set(val) {
        if (!val) {
          this.close();
        }
      },
    },
    updateStatus() {
      return this.$appdata.get("modules.update.status") || "idle";
    },
    currentVersion() {
      return packageJson.version;
    },
    updateVersion() {
      return this.$appdata.get("modules.update.version") || "";
    },
    downloadPercent() {
      return this.$appdata.get("modules.update.downloadPercent") || 0;
    },
    releaseNotes() {
      return this.$appdata.get("modules.update.releaseNotes") || "";
    },
    isChecking() {
      return this.updateStatus === "checking" || (this.updateStatus === "idle" && !this.updateVersion);
    },
    hasNewVersion() {
      return Boolean(this.updateVersion && this.updateVersion !== this.currentVersion);
    },
    statusTitle() {
      return {
        checking: "Verificando atualizações",
        available: "Uma nova versão está disponível",
        downloading: "Preparando sua atualização",
        ready: "Atualização pronta para instalar",
        "not-available": "Tudo atualizado",
        error: "Não foi possível verificar",
      }[this.updateStatus] || "Verificando atualizações";
    },
    statusDescription() {
      return {
        checking: "Estamos comparando sua instalação com a versão mais recente.",
        available: "Confira as novidades e atualize quando estiver pronto.",
        downloading: "O download está em andamento e será instalado após sua confirmação.",
        ready: "Reinicie o IASDPresenter para concluir a instalação.",
        "not-available": "Seu IASDPresenter já possui as melhorias mais recentes.",
        error: "O serviço de atualização não respondeu neste momento.",
      }[this.updateStatus] || "Estamos consultando a versão mais recente do IASDPresenter.";
    },
  },
  watch: {
    show(val) {
      if (val) {
        if (this.updateStatus === "idle" || this.updateStatus === "not-available" || this.updateStatus === "error") {
          this.checkForUpdates();
        }
      }
    },
  },
  methods: {
    close() {
      this.$modules.close(this.module_id);
    },
    checkForUpdates() {
      if (!window.electronAPI) return;
      
      // O componente principal recebe e persiste os eventos do atualizador.
      this.$appdata.set("modules.update.status", "checking");

      window.electronAPI.checkForUpdates().catch(() => {
        this.$appdata.set("modules.update.status", "error");
      });
    },
    startDownload() {
      if (window.electronAPI) {
        this.$appdata.set("modules.update.status", "downloading");
        this.$appdata.set("modules.update.downloadPercent", 0);
        window.electronAPI.downloadUpdate();
      }
    },
    installUpdate() {
      if (window.electronAPI) {
        window.electronAPI.quitAndInstall();
      }
    },
    retryUpdate() {
      this.checkForUpdates();
    },
  },
};
</script>

<style scoped>
.update-overlay,
.update-overlay *,
.update-overlay *::before,
.update-overlay *::after { box-sizing: border-box; }
.update-overlay { position: absolute; inset: 0; z-index: 100; padding: 28px; display: grid; place-items: center; background: rgba(6, 14, 29, .62); backdrop-filter: blur(9px); }
.update-dialog { width: min(760px, 100%); max-height: min(820px, calc(100vh - 56px)); display: flex; flex-direction: column; overflow: hidden; color: var(--sidebar-text); border: 1px solid color-mix(in srgb, var(--accent-blue) 18%, var(--border-color)); border-radius: 26px; background: var(--card-bg); box-shadow: 0 32px 90px rgba(0, 0, 0, .32); }
.update-header { min-height: 76px; padding: 14px 18px 14px 22px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); background: color-mix(in srgb, var(--card-bg) 94%, var(--accent-blue)); }
.update-brand { display: flex; align-items: center; gap: 12px; }.update-brand-icon { width: 44px; height: 44px; display: grid; place-items: center; color: #fff; border-radius: 13px; background: linear-gradient(145deg, var(--accent-blue), var(--accent-blue-dark)); box-shadow: 0 9px 22px rgba(var(--accent-blue-rgb), .24); }.update-brand > div { display: flex; flex-direction: column; }.update-brand span { color: var(--sidebar-text-secondary); font-size: 11px; }.update-brand strong { color: var(--sidebar-text); font-size: 15px; }
.update-body { min-height: 0; padding: 27px; overflow-y: auto; }
.version-summary { display: flex; align-items: flex-start; justify-content: space-between; gap: 28px; }.summary-kicker { color: var(--accent-blue); font-size: 9px; font-weight: 850; letter-spacing: .14em; }.version-summary h2 { margin: 5px 0 7px; color: var(--sidebar-text); font-size: 26px; line-height: 1.2; letter-spacing: -.035em; }.version-summary p { max-width: 430px; margin: 0; color: var(--sidebar-text-secondary); font-size: 13px; line-height: 1.55; }
.version-comparison { flex: 0 0 auto; padding: 9px; display: flex; align-items: center; gap: 9px; border: 1px solid var(--border-color); border-radius: 14px; background: var(--main-bg); }.version-comparison > div { min-width: 86px; padding: 7px 9px; display: flex; flex-direction: column; border-radius: 9px; }.version-comparison span { color: var(--sidebar-text-secondary); font-size: 9px; }.version-comparison strong { margin-top: 2px; color: var(--sidebar-text); font-size: 13px; }.version-comparison .highlighted { background: var(--accent-soft); }.version-comparison .highlighted strong { color: var(--accent-blue); }
.update-state { margin-top: 25px; padding: 21px; display: flex; align-items: center; gap: 15px; border: 1px solid var(--border-color); border-radius: 17px; background: var(--main-bg); }.state-visual { width: 52px; height: 52px; flex: 0 0 52px; display: grid; place-items: center; color: var(--accent-blue); border-radius: 15px; background: var(--accent-soft); }.update-state > div { display: flex; flex-direction: column; }.update-state strong { color: var(--sidebar-text); font-size: 14px; }.update-state p { margin: 4px 0 0; color: var(--sidebar-text-secondary); font-size: 12px; }.success-state { border-color: rgba(36, 172, 111, .22); background: color-mix(in srgb, #22a96d 5%, var(--card-bg)); }.success-state .state-visual { color: #17935c; background: rgba(34, 169, 109, .12); }.error-state { border-color: rgba(230, 76, 88, .22); background: color-mix(in srgb, #e64c58 5%, var(--card-bg)); }.error-state .state-visual { color: #d33e4a; background: rgba(230, 76, 88, .11); }
.release-panel { margin-top: 25px; overflow: hidden; border: 1px solid var(--border-color); border-radius: 18px; background: var(--main-bg); }.release-heading { padding: 17px 20px 14px; border-bottom: 1px solid var(--border-color); }.release-heading span { display: flex; align-items: center; gap: 6px; color: var(--accent-blue); font-size: 9px; font-weight: 800; letter-spacing: .12em; }.release-heading h3 { margin: 4px 0 0; color: var(--sidebar-text); font-size: 17px; }.release-notes-content { max-height: 260px; padding: 18px 20px; overflow-y: auto; color: var(--sidebar-text-secondary); font-size: 13px; line-height: 1.65; }.empty-release { min-height: 120px; padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; color: var(--sidebar-text-secondary); font-size: 12px; text-align: center; }
.download-panel { margin-top: 16px; padding: 17px 19px; border: 1px solid color-mix(in srgb, var(--accent-blue) 20%, var(--border-color)); border-radius: 16px; background: var(--accent-soft); }.download-panel > div:first-child { display: flex; justify-content: space-between; color: var(--sidebar-text); font-size: 12px; }.download-panel strong { color: var(--accent-blue); }.download-track { height: 7px; margin: 10px 0 8px; overflow: hidden; border-radius: 99px; background: rgba(var(--accent-blue-rgb), .12); }.download-track i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--accent-blue), #48a0ff); transition: width .3s ease; }.download-panel small { color: var(--sidebar-text-secondary); font-size: 10px; }
.update-footer { min-height: 78px; padding: 15px 24px; display: flex; align-items: center; justify-content: space-between; gap: 18px; border-top: 1px solid var(--border-color); background: color-mix(in srgb, var(--card-bg) 95%, var(--main-bg)); }.update-footer > span { display: flex; align-items: center; gap: 6px; color: var(--sidebar-text-secondary); font-size: 10px; }.update-footer > div { display: flex; align-items: center; gap: 9px; }
.release-notes-content :deep(h1),
.release-notes-content :deep(h2),
.release-notes-content :deep(h3) {
  font-size: 1.05rem;
  margin-top: 1em;
  margin-bottom: 0.5em;
  color: var(--sidebar-text);
}
.release-notes-content :deep(ul),
.release-notes-content :deep(ol) {
  padding-left: 20px;
  margin-bottom: 1em;
}
.release-notes-content :deep(p) {
  margin-bottom: 1em;
}
.release-notes-content :deep(a) {
  color: var(--accent-blue);
  text-decoration: none;
}
.release-notes-content :deep(a:hover) {
  text-decoration: underline;
}
@media (max-width: 680px) { .update-overlay { padding: 12px; }.update-dialog { max-height: calc(100vh - 24px); border-radius: 20px; }.version-summary { flex-direction: column; }.version-comparison { width: 100%; justify-content: space-between; }.version-comparison > div { flex: 1; }.update-footer { align-items: stretch; flex-direction: column; }.update-footer > span { display: none; }.update-footer > div { justify-content: flex-end; flex-wrap: wrap; } }
</style>
