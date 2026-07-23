<template>
  <v-slide-y-reverse-transition>
    <div v-if="module?.show" class="module-full-page dashboard-home d-flex flex-column">
      <!-- Top Bar -->
      <div class="search-header pb-0 flex-shrink-0" style="padding-top: 24px; padding-left: 24px; padding-right: 24px; display: flex; align-items: center;">
        <MenuToggleButton style="margin-right: 16px;" @toggle-sidebar="toggleSidebar" />
        <div class="d-flex align-center mr-auto">
          <div class="module-icon-box d-flex align-center justify-center mr-4">
            <v-icon :icon="module.icon" size="24" />
          </div>
          <h2 class="section-title mb-0 mr-4" style="color: var(--sidebar-text); font-size: 24px; font-weight: 600; line-height: 1;">
            {{ t('title') }}
          </h2>
        </div>
        
        <div class="search-bar ml-4 d-flex align-center" style="flex: 1; justify-content: flex-end; gap: 12px;" />
      </div>

      <!-- Clock Display -->
      <div class="content-main flex-grow-1 w-100 pa-6 d-flex flex-column align-center justify-center" style="overflow: hidden; background: transparent; gap: 16px;">
        <div class="clock-widget-container d-flex flex-column justify-center align-center position-relative" style="width: 100%; max-width: 900px; aspect-ratio: 21/9; max-height: 58%; background: var(--card-bg, #ffffff); border-radius: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.05); border: 1px solid var(--border-color, rgba(0,0,0,0.05)); overflow: hidden; transition: transform 0.3s ease;">
          <div class="position-absolute top-0 right-0 ma-4 d-flex align-center" style="z-index: 2; gap: 8px;">
            <v-btn
              variant="tonal"
              color="primary"
              icon
              size="small"
              style="width: 36px; height: 36px;"
              class="config-palette-btn"
              @click="$refs.configModal.open()"
            >
              <v-icon>mdi-palette</v-icon>
              <v-tooltip
                activator="parent"
                location="bottom"
                open-delay="300"
                content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
              >
                {{ t('config') }}
              </v-tooltip>
            </v-btn>
            <LScreenBtn module="clock" monitor-config-key="modules.config.clock_monitor" />
          </div>
          <Screen :preview="true" />
        </div>

        <div class="timer-controls w-100" style="max-width: 900px;">
          <div class="d-flex align-center justify-space-between flex-wrap mb-3" style="gap: 12px;">
            <div class="d-flex align-center" style="gap: 10px;">
              <v-icon color="primary">
                mdi-timer-outline
              </v-icon>
              <div>
                <div class="font-weight-bold" style="color: var(--sidebar-text); line-height: 1.1;">
                  {{ t('timer') }}
                </div>
                <div class="text-caption opacity-70" style="color: var(--sidebar-text);">
                  {{ timerStatusText }}
                </div>
              </div>
            </div>

            <v-btn-toggle
              v-model="timerInputMode"
              mandatory
              density="comfortable"
              variant="tonal"
              color="primary"
              divided
            >
              <v-btn value="duration" size="small">
                <v-icon start>
                  mdi-timer-sand
                </v-icon>
                {{ t('timer_duration') }}
              </v-btn>
              <v-btn value="endTime" size="small">
                <v-icon start>
                  mdi-clock-end
                </v-icon>
                {{ t('timer_end_time') }}
              </v-btn>
            </v-btn-toggle>
          </div>

          <div class="d-flex align-center flex-wrap" style="gap: 10px;">
            <template v-if="timerInputMode === 'duration'">
              <v-text-field
                v-model.number="durationHours"
                :label="t('timer_hours')"
                type="number"
                min="0"
                max="99"
                hide-details
                density="compact"
                variant="outlined"
                style="max-width: 110px;"
                @keyup.enter="startTimer"
              />
              <v-text-field
                v-model.number="durationMinutes"
                :label="t('timer_minutes')"
                type="number"
                min="0"
                max="59"
                hide-details
                density="compact"
                variant="outlined"
                style="max-width: 110px;"
                @keyup.enter="startTimer"
              />
              <v-text-field
                v-model.number="durationSeconds"
                :label="t('timer_seconds')"
                type="number"
                min="0"
                max="59"
                hide-details
                density="compact"
                variant="outlined"
                style="max-width: 110px;"
                @keyup.enter="startTimer"
              />
            </template>

            <v-text-field
              v-else
              v-model="endTime"
              :label="t('timer_end_at')"
              type="time"
              hide-details
              density="compact"
              variant="outlined"
              style="max-width: 180px;"
              @keyup.enter="startTimer"
            />

            <v-spacer />

            <v-btn
              color="primary"
              variant="flat"
              :disabled="!canStartTimer"
              @click="startTimer"
            >
              <v-icon start>
                {{ clockTimer.running ? 'mdi-pause' : 'mdi-play' }}
              </v-icon>
              {{ clockTimer.running ? t('timer_pause') : t('timer_start') }}
            </v-btn>
            <v-btn
              variant="tonal"
              :disabled="!clockTimer.enabled"
              @click="resetTimer"
            >
              <v-icon start>
                mdi-refresh
              </v-icon>
              {{ t('timer_reset') }}
            </v-btn>
          </div>
        </div>
      </div>

      <!-- Config Modal -->
      <ConfigModal ref="configModal" />
    </div>
  </v-slide-y-reverse-transition>
</template>

<script>
import Screen from "../components/Screen.vue";
import LScreenBtn from "@/components/buttons/Screen.vue";
import ConfigModal from "./components/ConfigModal.vue";
import MenuToggleButton from "@/components/MenuToggleButton.vue";
import manifest from "../manifest.json";

export default {
  name: manifest.id,
  components: {
    Screen,
    LScreenBtn,
    ConfigModal,
    MenuToggleButton,
  },
  data: () => ({
    timerInputMode: "duration",
    durationHours: 0,
    durationMinutes: 5,
    durationSeconds: 0,
    endTime: "",
  }),
  computed: {
    module_id() {
      return manifest.id;
    },
    module() {
      return this.$appdata.get(`modules.${this.module_id}`);
    },
    clockTimer() {
      const state = this.$appdata.get("clock_timer");
      return {
        enabled: false,
        running: false,
        endsAt: null,
        remainingMs: 0,
        ...state,
      };
    },
    canStartTimer() {
      if (this.clockTimer.enabled && !this.clockTimer.running && this.clockTimer.remainingMs > 0) {
        return true;
      }

      if (this.timerInputMode === "duration") {
        return this.durationTotalSeconds > 0;
      }

      return !!this.endTime;
    },
    durationTotalSeconds() {
      const hours = this.clampNumber(this.durationHours, 0, 99);
      const minutes = this.clampNumber(this.durationMinutes, 0, 59);
      const seconds = this.clampNumber(this.durationSeconds, 0, 59);
      return (hours * 3600) + (minutes * 60) + seconds;
    },
    timerStatusText() {
      if (!this.clockTimer.enabled) return this.t("timer_ready");
      if (this.clockTimer.running) return this.t("timer_running");
      return this.t("timer_paused");
    },
  },
  mounted() {
    if (!this.$appdata.get("clock_timer")) {
      this.$appdata.set("clock_timer", {
        enabled: false,
        running: false,
        endsAt: null,
        remainingMs: 0,
      });
    }
  },
  methods: {
    t(text) {
      return this.$t(`modules.${this.module_id}.${text}`);
    },
    clampNumber(value, min, max) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return min;
      return Math.min(Math.max(Math.floor(parsed), min), max);
    },
    getEndTimeDate() {
      if (!this.endTime) return null;

      const [hours, minutes] = this.endTime.split(":").map(Number);
      if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

      const end = new Date();
      end.setHours(hours, minutes, 0, 0);

      if (end.getTime() <= Date.now()) {
        end.setDate(end.getDate() + 1);
      }

      return end;
    },
    startTimer() {
      if (this.clockTimer.running) {
        this.pauseTimer();
        return;
      }

      let remainingMs = Number(this.clockTimer.remainingMs) || 0;

      if (!this.clockTimer.enabled || remainingMs <= 0) {
        if (this.timerInputMode === "duration") {
          remainingMs = this.durationTotalSeconds * 1000;
        } else {
          const end = this.getEndTimeDate();
          remainingMs = end ? end.getTime() - Date.now() : 0;
        }
      }

      if (remainingMs <= 0) return;

      this.$appdata.set("clock_timer", {
        enabled: true,
        running: true,
        mode: this.timerInputMode,
        endsAt: Date.now() + remainingMs,
        remainingMs,
      });
    },
    pauseTimer() {
      const remainingMs = Math.max(0, Number(this.clockTimer.endsAt) - Date.now());

      this.$appdata.set("clock_timer", {
        ...this.clockTimer,
        running: false,
        endsAt: null,
        remainingMs,
      });
    },
    resetTimer() {
      this.$appdata.set("clock_timer", {
        enabled: false,
        running: false,
        mode: this.timerInputMode,
        endsAt: null,
        remainingMs: 0,
      });
    },
    toggleSidebar() {
      const mainEl = document.querySelector(".main-container");
      if (mainEl) mainEl.dispatchEvent(new CustomEvent("toggle-sidebar"));
    },
  },
};
</script>

<style scoped>
.timer-controls {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.05));
  border-radius: 16px;
  box-shadow: 0 14px 36px rgba(0,0,0,0.05);
  padding: 16px;
}
</style>
