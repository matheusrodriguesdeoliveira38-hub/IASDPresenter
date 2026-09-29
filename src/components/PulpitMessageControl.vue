<template>
  <v-btn class="pulpit-trigger" color="primary" prepend-icon="mdi-message-alert" @click="open = true">
    Mensagem ao púlpito
  </v-btn>
  <v-dialog v-model="open" max-width="560">
    <v-card title="Mensagem ao púlpito">
      <v-card-text>
        <p class="mb-4">
          Escolha o monitor em que a mensagem será exibida.
        </p>
        <v-select v-model="monitorId" label="Monitor de destino" :items="monitors" :disabled="sending" class="mb-2" />
        <div class="d-flex flex-wrap ga-2 mb-4">
          <v-chip v-for="preset in presets" :key="preset" @click="draft = preset">
            {{ preset }}
          </v-chip>
        </div>
        <v-textarea v-model="draft" label="Mensagem" maxlength="200" counter rows="3" />
        <v-select v-model="duration" label="Desaparecer automaticamente" :items="durations" />
        <figure class="pulpit-preview mb-4">
          <figcaption class="text-caption mb-2">Prévia do recado · {{ monitorLabel }} (16:9)</figcaption>
          <div class="pulpit-preview-screen" :style="{ background: $userdata.get('modules.config.return_monitor_bg_color') || '#000000' }">
            <span class="pulpit-preview-hint">{{ draft.trim() ? monitorLabel : 'Digite uma mensagem para visualizar' }}</span>
            <PulpitMessageBanner v-if="draft.trim()" :text="draft.trim().slice(0, 200)" />
          </div>
          <p class="text-caption mt-2">{{ duration ? `O recado desaparecerá ${duration} segundos após o envio.` : 'O recado ficará visível até ser removido.' }}</p>
        </figure>
        <v-alert v-if="error" type="warning" class="mb-3">
          {{ error }}
        </v-alert>
        <v-alert v-if="active" type="info" aria-live="polite">
          Em exibição em {{ activeMonitorLabel }}: {{ active.text }}
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
        <v-btn color="primary" variant="flat" :disabled="!draft.trim() || monitorId == null || sending" :loading="sending" @click="send">
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
    monitors: [], monitorId: null as string | number | null,
    activeMonitorId: null as string | number | null, activeMonitorLabel: "",
    message: null as PulpitMessage | null,
    now: Date.now(), timer: null as ReturnType<typeof setInterval> | null,
    presets: ["Faltam 5 minutos", "Microfone desligado", "Aguardar o próximo hino"],
    durations: [{ title: "Não desaparecer", value: 0 }, ...[5, 10, 15, 30, 60].map(value => ({ title: `${value} segundos`, value }))],
  }),
  computed: {
    active() { return activePulpitMessage(this.message, this.now); },
    monitorLabel() { return this.monitors.find(m => m.value === this.monitorId)?.title || "Selecione um monitor"; },
  },
  watch: {
    open(value) { if (value) this.refreshMonitors(); },
    active(value) { if (!value) this.$popup.closePulpitMonitors(); },
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
    async refreshMonitors() {
      this.error = "";
      try {
        const displays = await window.electronAPI?.getDisplays?.() || [];
        this.monitors = displays.map((display, index) => ({
          value: display.id,
          title: `${display.label || `Monitor ${index + 1}`}${display.isPrimary ? " (principal)" : ""}`,
        }));
        const preferred = this.monitorId ?? this.$userdata.get("modules.config.pulpit_message_monitor")
          ?? this.$userdata.get("modules.config.return_monitor");
        this.monitorId = this.monitors.find(m => String(m.value) === String(preferred))?.value ?? null;
        if (!this.monitors.length) this.error = "Nenhum monitor disponível.";
      } catch { this.error = "Não foi possível listar os monitores."; }
    },
    onReady(event: MessageEvent) {
      if (event.data?.action !== "pulpit-ready") return;
      if (this.activeMonitorId == null) return;
      const targets = (this.$appdata.get("popups") || []).filter(popup => (popup.nativeWindow || popup) === event.source);
      sendPulpitMessage(targets, activePulpitMessage(this.message), this.activeMonitorId);
    },
    clear() {
      this.message = null;
      if (this.activeMonitorId != null) sendPulpitMessage(this.$appdata.get("popups") || [], null, this.activeMonitorId);
      this.$popup.closePulpitMonitors();
      this.activeMonitorId = null;
    },
    async send() {
      this.error = "";
      this.sending = true;
      try {
        const monitor = this.monitorId;
        const displays = await window.electronAPI?.getDisplays?.() || [];
        if (monitor == null || !displays.some(d => String(d.id) === String(monitor))) {
          this.error = "Selecione um monitor conectado.";
          return;
        }
        const message = { text: this.draft.trim().slice(0, 200), expiresAt: this.duration ? Date.now() + this.duration * 1000 : null };
        if (!message.text) return;
        this.clear();
        this.activeMonitorId = monitor;
        this.activeMonitorLabel = this.monitorLabel;
        this.message = message;
        this.now = Date.now();
        this.$popup.openPulpitMonitor(monitor);
        if (!sendPulpitMessage(this.$appdata.get("popups") || [], message, monitor)) {
          this.clear();
          this.error = "Não foi possível abrir a mensagem no monitor selecionado.";
          return;
        }
        this.$userdata.set("modules.config.pulpit_message_monitor", monitor);
      } catch {
        this.clear();
        this.error = "Não foi possível enviar. Verifique a conexão do monitor selecionado.";
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
