<template>
  <div v-if="active" class="pulpit-message-layer" role="alert">
    <PulpitMessageBanner :text="active.text" />
  </div>
</template>

<script lang="ts">
import { activePulpitMessage, type PulpitMessage } from "@/helpers/PulpitMessage";
import PulpitMessageBanner from "@/components/PulpitMessageBanner.vue";

export default {
  components: { PulpitMessageBanner },
  data: () => ({ message: null as PulpitMessage | null, now: Date.now(), timer: null as ReturnType<typeof setInterval> | null }),
  computed: { active() { return activePulpitMessage(this.message, this.now); } },
  mounted() {
    window.addEventListener("message", this.receive);
    this.timer = setInterval(() => { this.now = Date.now(); }, 100);
    window.opener?.postMessage({ action: "pulpit-ready" }, "*");
  },
  unmounted() {
    window.removeEventListener("message", this.receive);
    if (this.timer) clearInterval(this.timer);
  },
  methods: {
    receive(event: MessageEvent) {
      if (event.source !== window.opener || event.data?.action !== "pulpit-message") return;
      const message = event.data.message;
      this.now = Date.now();
      this.message = message && typeof message.text === "string" && (message.expiresAt === null || Number.isFinite(message.expiresAt))
        ? { text: message.text.slice(0, 200), expiresAt: message.expiresAt } : null;
    },
  },
};
</script>

<style scoped>
.pulpit-message-layer { position: absolute; inset: 0; z-index: 10000; container-type: size; pointer-events: none; }
</style>
