<template>
  <v-btn class="pulpit-trigger" color="primary" prepend-icon="mdi-message-alert" @click="open = true">
    Mensagem ao púlpito
  </v-btn>
  <v-dialog v-model="open" max-width="560">
    <v-card title="Mensagem ao púlpito">
      <v-card-text>
        <p class="mb-4">
          Exibida somente no monitor de retorno. Configure uma tela exclusiva para o púlpito em Configurações → Projeção.
        </p>
        <div class="d-flex flex-wrap ga-2 mb-4">
          <v-chip v-for="preset in presets" :key="preset" @click="draft = preset">
            {{ preset }}
          </v-chip>
        </div>
        <v-textarea v-model="draft" label="Mensagem" maxlength="200" counter rows="3" />
        <v-select v-model="duration" label="Desaparecer automaticamente" :items="durations" />
        <figure class="pulpit-preview mb-4">
          <figcaption class="text-caption mb-2">Prévia do recado · tela de retorno (16:9)</figcaption>
          <div class="pulpit-preview-screen" :style="{ background: $userdata.get('modules.config.return_monitor_bg_color') || '#000000' }">
            <span class="pulpit-preview-hint">{{ draft.trim() ? 'Monitor de retorno' : 'Digite uma mensagem para visualizar' }}</span>
            <PulpitMessageBanner v-if="draft.trim()" :text="draft.trim().slice(0, 200)" />
          </div>
          <p class="text-caption mt-2">{{ duration ? `O recado desaparecerá ${duration} segundos após o envio.` : 'O recado ficará visível até ser removido.' }}</p>
        </figure>
        <v-alert v-if="error" type="warning" class="mb-3">
          {{ error }}
        </v-alert>
        <v-alert v-if="active" type="info" aria-live="polite">
          Em exibição: {{ active.text }}
          <div>{{ active.expiresAt ? `Desaparece em ${Math.ceil((active.expiresAt - now) / 1000)} s` : 'Até remover manualmente' }}</div>
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-btn :disabled="!active" @click="clear">
          Remover
        </v-btn>
        <v-spacer />
        <v-btn @click="open = false">
          Fechar
        </v-btn>
        <v-btn color="primary" variant="flat" :disabled="!draft.trim() || sending" :loading="sending" @click="send">
          Enviar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { activePulpitMessage, sendPulpitMessage, type PulpitMessage } from "@/helpers/PulpitMessage";
import PulpitMessageBanner from "@/components/PulpitMessageBanner.vue";

export default {
  components: { PulpitMessageBanner },
  data: () => ({
    open: false, draft: "", duration: 10, error: "", sending: false,
    message: null as PulpitMessage | null,
    now: Date.now(), timer: null as ReturnType<typeof setInterval> | null,
    presets: ["Faltam 5 minutos", "Microfone desligado", "Aguardar o próximo hino"],
    durations: [{ title: "Não desaparecer", value: 0 }, ...[5, 10, 15, 30, 60].map(value => ({ title: `${value} segundos`, value }))],
  }),
  computed: {
    active() { return activePulpitMessage(this.message, this.now); },
  },
  mounted() {
    this.timer = setInterval(() => { this.now = Date.now(); }, 250);
    window.addEventListener("message", this.onReady);
  },
  unmounted() {
    if (this.timer) clearInterval(this.timer);
    window.removeEventListener("message", this.onReady);
  },
  methods: {
    onReady(event: MessageEvent) {
      if (event.data?.action !== "pulpit-ready") return;
      const targets = (this.$appdata.get("popups") || []).filter(popup => popup === event.source);
      sendPulpitMessage(targets, activePulpitMessage(this.message));
    },
    clear() {
      this.message = null;
      sendPulpitMessage(this.$appdata.get("popups") || [], null);
    },
    async send() {
      this.error = "";
      this.sending = true;
      try {
        const monitor = this.$userdata.get("modules.config.return_monitor");
        const selected = this.$userdata.get("modules.config.slide_monitor") || [];
        const projections = Array.isArray(selected) ? selected : [selected];
        const sharedScreen = (this.$appdata.get("popups") || []).some(popup =>
          !popup.closed && popup.popupRole !== "return_monitor" && popup.popupRole !== "web_output" && popup.monitorId === monitor);
        if (projections.includes(monitor) || sharedScreen) {
          this.error = "Escolha um monitor de retorno diferente da projeção para enviar mensagens privadas.";
          return;
        }
        await this.$media.syncReturnMonitor(true);
        const message = { text: this.draft.trim().slice(0, 200), expiresAt: this.duration ? Date.now() + this.duration * 1000 : null };
        if (!message.text) return;
        if (!sendPulpitMessage(this.$appdata.get("popups") || [], message)) {
          this.error = "Monitor de retorno indisponível. Ative e selecione o monitor em Configurações → Projeção; verifique também o modo de desempenho.";
          return;
        }
        this.now = Date.now();
        this.message = message;
      } catch {
        this.error = "Não foi possível enviar. Verifique a conexão do monitor de retorno.";
      } finally { this.sending = false; }
    },
  },
};
</script>

<style scoped>
.pulpit-trigger { position: fixed; right: 20px; bottom: 60px; z-index: 1005; }
.pulpit-preview { margin: 0; }
.pulpit-preview-screen { position: relative; width: 100%; aspect-ratio: 16 / 9; container-type: size; overflow: hidden; border-radius: 8px; }
.pulpit-preview-hint { position: absolute; top: 22%; left: 5%; right: 5%; text-align: center; color: #999; font: 500 3cqw Arial, sans-serif; }
</style>
