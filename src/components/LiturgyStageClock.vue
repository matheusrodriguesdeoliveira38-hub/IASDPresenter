<template>
  <div v-if="timer" class="stage-clock" :class="{ 'stage-clock-overdue': overdue }" role="timer" aria-live="off">
    <div class="stage-clock-name">
{{ timer.name }}
</div>
    <strong>{{ overdue ? '+' : '' }}{{ formatStageTime(remaining === null ? elapsed : Math.abs(remaining)) }}</strong>
    <span>{{ statusText }}</span>
  </div>
</template>

<script lang="ts">
import { elapsedSeconds, remainingStageSeconds, formatStageTime, type StageTimer } from "@/helpers/LiturgyTiming";

export default {
  data: () => ({ now: Date.now(), interval: null as ReturnType<typeof setInterval> | null }),
  computed: {
    timer(): StageTimer | null { return this.$appdata.get("liturgy_stage_timer"); },
    elapsed(): number { return this.timer ? elapsedSeconds(this.timer, this.now) : 0; },
    remaining(): number | null { return this.timer ? remainingStageSeconds(this.timer, this.now) : null; },
    overdue(): boolean { return this.remaining !== null && this.remaining <= 0; },
    statusText(): string {
      const state = this.timer?.status;
      if (this.overdue) return this.$t("modules.liturgy.timing.overdue");
      if (state === "finished") return this.$t("modules.liturgy.timing.finished");
      if (state === "paused") return this.$t("modules.liturgy.timing.paused");
      return this.$t(`modules.liturgy.timing.${this.remaining !== null ? "remaining" : "elapsed"}`);
    },
  },
  mounted() { this.interval = setInterval(() => { this.now = Date.now(); }, 250); },
  beforeUnmount() { if (this.interval) clearInterval(this.interval); },
  methods: { formatStageTime },
};
</script>

<style scoped>
.stage-clock { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; padding: 12px 18px; border-radius: 12px; background: #14263b; color: white; }
.stage-clock-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stage-clock strong { font-size: 1.8rem; font-variant-numeric: tabular-nums; }
.stage-clock-overdue { background: #8b2020; }
</style>
