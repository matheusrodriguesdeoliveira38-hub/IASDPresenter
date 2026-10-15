<template>
  <section class="timing-panel mx-6 mb-3" :aria-label="$t('modules.liturgy.timing.title')">
    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <v-icon size="20">
mdi-timer-outline
</v-icon>
      <strong>{{ $t('modules.liturgy.timing.title') }}</strong>
      <span class="text-caption">{{ $t('modules.liturgy.timing.total') }}: {{ formatStageTime(totalSeconds) }}</span>
      <span v-if="unplanned" class="text-caption">{{ $t('modules.liturgy.timing.unplanned', { count: unplanned }) }}</span>
    </div>
    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <v-select v-model="selectedId" :items="stages" item-title="name" item-value="id" :label="$t('modules.liturgy.timing.stage')" density="compact" variant="outlined" hide-details style="min-width: 180px; flex: 1" />
      <v-btn color="primary" variant="tonal" :disabled="!selectedStage || busy" @click="start">
{{ $t('modules.liturgy.timing.start') }}
</v-btn>
      <template v-if="timer && timer.status !== 'finished'">
        <v-btn variant="text" @click="setStatus(timer.status === 'running' ? 'paused' : 'running')">
{{ $t(`modules.liturgy.timing.${timer.status === 'running' ? 'pause' : 'resume'}`) }}
</v-btn>
        <v-btn variant="text" @click="setStatus('finished')">
{{ $t('modules.liturgy.timing.finish') }}
</v-btn>
      </template>
      <v-btn v-else-if="timer" variant="text" @click="$appdata.set('liturgy_stage_timer', null)">
{{ $t('modules.liturgy.timing.dismiss') }}
</v-btn>
    </div>
    <LiturgyStageClock />
    <div class="text-caption mt-1">
{{ $t('modules.liturgy.timing.hint') }}
</div>
  </section>
</template>

<script lang="ts">
import { type PropType } from "vue";
import LiturgyStageClock from "./LiturgyStageClock.vue";
import { stageDuration, validEndTime, formatStageTime, startStage, changeStageStatus, type StageTimer } from "@/helpers/LiturgyTiming";

type Stage = { id: string | number; name: string; type: string; plannedMinutes?: unknown; timingMode?: string; endTime?: string };
export default {
  components: { LiturgyStageClock },
  props: { items: { type: Array as PropType<Stage[]>, required: true } },
  data: () => ({ selectedId: null as string | number | null }),
  computed: {
    stages(): Stage[] { return this.items.filter(item => item.type !== "category"); },
    selectedStage(): Stage | undefined { return this.stages.find(item => item.id === this.selectedId); },
    timer(): StageTimer | null { return this.$appdata.get("liturgy_stage_timer"); },
    busy(): boolean { return !!this.timer && this.timer.status !== "finished"; },
    totalSeconds(): number { return this.stages.reduce((sum, item) => sum + stageDuration(item), 0); },
    unplanned(): number { return this.stages.filter(item => item.timingMode === "deadline" ? !validEndTime(item.endTime) : !stageDuration(item)).length; },
  },
  methods: {
    formatStageTime,
    start() {
      if (!this.selectedStage || this.busy) return;
      this.$appdata.set("liturgy_stage_timer", startStage(this.selectedStage, Date.now()));
    },
    setStatus(status: StageTimer["status"]) {
      if (this.timer) this.$appdata.set("liturgy_stage_timer", changeStageStatus(this.timer, status, Date.now()));
    },
  },
};
</script>

<style scoped>
.timing-panel { padding: 14px; border: 1px solid var(--border-color); border-radius: 14px; color: var(--sidebar-text); }
</style>
