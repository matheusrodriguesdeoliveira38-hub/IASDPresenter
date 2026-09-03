<template>
  <v-slide-y-reverse-transition>
    <div v-if="module?.show" class="module-full-page dashboard-home clock-page d-flex flex-column">
      <!-- Top Bar -->
      <div class="search-header clock-page-header pb-0 flex-shrink-0" style="padding-top: 24px; padding-left: 24px; padding-right: 24px; display: flex; align-items: center;">
        <MenuToggleButton style="margin-right: 16px;" @toggle-sidebar="toggleSidebar" />
        <div class="d-flex align-center mr-auto">
          <div class="module-icon-box d-flex align-center justify-center mr-4">
            <v-icon :icon="module.icon" size="24" />
          </div>
          <h2 class="section-title clock-page-title mb-0 mr-4" style="color: var(--sidebar-text); font-size: 24px; font-weight: 600; line-height: 1;">
            {{ t('title') }}
          </h2>
        </div>
        
        <div class="search-bar ml-4 d-flex align-center" style="flex: 1; justify-content: flex-end; gap: 12px;" />
      </div>

      <!-- Clock Display -->
      <div class="content-main clock-page-content flex-grow-1 w-100 pa-6 d-flex flex-column align-center" style="overflow: hidden; background: transparent; gap: 18px;">
        <div class="clock-widget-container d-flex flex-column justify-center align-center position-relative">
          <div class="clock-panel-decoration" aria-hidden="true" />
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
            <LScreenBtn
              class="clock-project-btn"
              module="clock"
              monitor-config-key="modules.config.clock_monitor"
            />
          </div>
          <Screen :preview="true" />
        </div>

        <div class="timer-controls w-100">
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
              class="timer-mode-toggle"
              mandatory
              density="comfortable"
              variant="tonal"
              color="primary"
              divided
            >
              <v-btn class="timer-mode-btn" value="duration" size="small">
                <v-icon start>
                  mdi-timer-sand
                </v-icon>
                {{ t('timer_duration') }}
              </v-btn>
              <v-btn class="timer-mode-btn" value="endTime" size="small">
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
                class="timer-field"
                :label="t('timer_hours')"
                prepend-inner-icon="mdi-clock-outline"
                type="number"
                min="0"
                max="99"
                hide-details
                density="compact"
                variant="outlined"
                @keyup.enter="startTimer"
              />
              <v-text-field
                v-model.number="durationMinutes"
                class="timer-field"
                :label="t('timer_minutes')"
                prepend-inner-icon="mdi-clock-outline"
                type="number"
                min="0"
                max="59"
                hide-details
                density="compact"
                variant="outlined"
                @keyup.enter="startTimer"
              />
              <v-text-field
                v-model.number="durationSeconds"
                class="timer-field"
                :label="t('timer_seconds')"
                prepend-inner-icon="mdi-clock-outline"
                type="number"
                min="0"
                max="59"
                hide-details
                density="compact"
                variant="outlined"
                @keyup.enter="startTimer"
              />
            </template>

            <v-text-field
              v-else
              v-model="endTime"
              class="timer-field timer-field-end"
              :label="t('timer_end_at')"
              prepend-inner-icon="mdi-clock-end"
              type="time"
              hide-details
              density="compact"
              variant="outlined"
              @keyup.enter="startTimer"
            />

            <v-spacer />

            <v-btn
              class="timer-action-btn timer-action-primary"
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
              class="timer-action-btn timer-action-secondary"
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

          <div class="timer-alerts d-flex align-center flex-wrap mt-4">
            <div class="timer-option">
              <v-icon size="20">
                mdi-bell-ring-outline
              </v-icon>
              <v-switch
                :model-value="clockTimer.alert5Enabled"
                color="primary"
                density="compact"
                hide-details
                inset
                :label="t('timer_alert_5min')"
                @update:model-value="setTimerAlert('alert5Enabled', $event)"
              />
            </div>
            <div class="timer-option">
              <v-icon size="20">
                mdi-bell-alert-outline
              </v-icon>
              <v-switch
                :model-value="clockTimer.alert1Enabled"
                color="primary"
                density="compact"
                hide-details
                inset
                :label="t('timer_alert_1min')"
                @update:model-value="setTimerAlert('alert1Enabled', $event)"
              />
            </div>
            <div class="timer-option timer-option-negative">
              <v-icon size="20">
                mdi-timer-minus-outline
              </v-icon>
              <v-switch
                :model-value="clockTimer.negativeEnabled"
                color="error"
                density="compact"
                hide-details
                inset
                :label="t('timer_negative')"
                @update:model-value="setNegativeTime"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Config Modal -->
      <ConfigModal ref="configModal" />
    </div>
  </v-slide-y-reverse-transition>
</template>

<script lang="ts">
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
    now: Date.now(),
    timerAlertInterval: null,
    previousTimerRemainingMs: null,
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
        alert5Enabled: false,
        alert1Enabled: false,
        alert5Played: false,
        alert1Played: false,
        negativeEnabled: false,
        expiredAt: null,
        ...state,
      };
    },
    canStartTimer() {
      if (this.clockTimer.enabled && !this.clockTimer.running && (
        this.clockTimer.remainingMs > 0
        || (this.clockTimer.negativeEnabled && this.clockTimer.remainingMs < 0)
      )) {
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
      if (this.timerRemainingMs <= 0) return this.t("timer_expired");
      if (this.clockTimer.running) return this.t("timer_running");
      return this.t("timer_paused");
    },
    timerRemainingMs() {
      if (!this.clockTimer.enabled) return 0;

      if (this.clockTimer.running && this.clockTimer.endsAt) {
        const remainingMs = Number(this.clockTimer.endsAt) - this.now;
        return this.clockTimer.negativeEnabled ? remainingMs : Math.max(0, remainingMs);
      }

      const remainingMs = Number(this.clockTimer.remainingMs) || 0;
      return this.clockTimer.negativeEnabled ? remainingMs : Math.max(0, remainingMs);
    },
  },
  mounted() {
    if (!this.$appdata.get("clock_timer")) {
      this.$appdata.set("clock_timer", {
        enabled: false,
        running: false,
        endsAt: null,
        remainingMs: 0,
        alert5Enabled: false,
        alert1Enabled: false,
        alert5Played: false,
        alert1Played: false,
        negativeEnabled: false,
        expiredAt: null,
      });
    }

    this.timerAlertInterval = setInterval(() => {
      this.now = Date.now();
      this.checkTimerAlerts();
    }, 500);
  },
  unmounted() {
    clearInterval(this.timerAlertInterval);
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
      const canResume = this.clockTimer.enabled && (
        remainingMs > 0
        || (this.clockTimer.negativeEnabled && remainingMs < 0)
      );

      if (!canResume) {
        if (this.timerInputMode === "duration") {
          remainingMs = this.durationTotalSeconds * 1000;
        } else {
          const end = this.getEndTimeDate();
          remainingMs = end ? end.getTime() - Date.now() : 0;
        }
      }

      if (!canResume && remainingMs <= 0) return;

      const isFreshTimer = !canResume;

      this.$appdata.set("clock_timer", {
        ...this.clockTimer,
        enabled: true,
        running: true,
        mode: this.timerInputMode,
        endsAt: Date.now() + remainingMs,
        remainingMs,
        expiredAt: isFreshTimer ? null : this.clockTimer.expiredAt,
        alert5Played: isFreshTimer ? false : this.clockTimer.alert5Played,
        alert1Played: isFreshTimer ? false : this.clockTimer.alert1Played,
      });
    },
    pauseTimer() {
      const rawRemainingMs = Number(this.clockTimer.endsAt) - Date.now();
      const remainingMs = this.clockTimer.negativeEnabled
        ? rawRemainingMs
        : Math.max(0, rawRemainingMs);

      this.$appdata.set("clock_timer", {
        ...this.clockTimer,
        running: false,
        endsAt: null,
        remainingMs,
        expiredAt: rawRemainingMs <= 0
          ? (this.clockTimer.expiredAt || Number(this.clockTimer.endsAt))
          : this.clockTimer.expiredAt,
      });
    },
    resetTimer() {
      this.$appdata.set("clock_timer", {
        enabled: false,
        running: false,
        mode: this.timerInputMode,
        endsAt: null,
        remainingMs: 0,
        expiredAt: null,
        alert5Enabled: this.clockTimer.alert5Enabled,
        alert1Enabled: this.clockTimer.alert1Enabled,
        negativeEnabled: this.clockTimer.negativeEnabled,
        alert5Played: false,
        alert1Played: false,
      });
    },
    setTimerAlert(field, enabled) {
      this.$appdata.set("clock_timer", {
        ...this.clockTimer,
        [field]: enabled,
      });
    },
    setNegativeTime(enabled) {
      const now = Date.now();
      const timerExpired = this.clockTimer.enabled && this.timerRemainingMs <= 0;
      const expiredAt = Number(this.clockTimer.expiredAt)
        || (this.clockTimer.endsAt ? Number(this.clockTimer.endsAt) : null);
      const updates = {
        negativeEnabled: enabled,
      };

      if (enabled && timerExpired && expiredAt) {
        updates.running = true;
        updates.endsAt = expiredAt;
        updates.remainingMs = expiredAt - now;
        updates.expiredAt = expiredAt;
      } else if (!enabled && timerExpired) {
        updates.running = false;
        updates.endsAt = null;
        updates.remainingMs = 0;
        updates.expiredAt = expiredAt || now;
      }

      this.$appdata.set("clock_timer", {
        ...this.clockTimer,
        ...updates,
      });
    },
    checkTimerAlerts() {
      if (!this.clockTimer.enabled || !this.clockTimer.running) {
        this.previousTimerRemainingMs = null;
        return;
      }

      const remainingMs = this.timerRemainingMs;
      const previousMs = this.previousTimerRemainingMs;
      this.previousTimerRemainingMs = remainingMs;

      if (previousMs === null) return;

      const updates = {};
      const crossedFiveMinutes = previousMs > 5 * 60 * 1000 && remainingMs <= 5 * 60 * 1000;
      const crossedOneMinute = previousMs > 60 * 1000 && remainingMs <= 60 * 1000;

      if (this.clockTimer.alert5Enabled && !this.clockTimer.alert5Played && crossedFiveMinutes) {
        this.playTimerAlert("5min");
        updates.alert5Played = true;
      }

      if (this.clockTimer.alert1Enabled && !this.clockTimer.alert1Played && crossedOneMinute) {
        this.playTimerAlert("1min");
        updates.alert1Played = true;
      }

      if (Object.keys(updates).length) {
        this.$appdata.set("clock_timer", {
          ...this.clockTimer,
          ...updates,
        });
      }
    },
    playTimerAlert(fileName) {
      const baseUrl = import.meta.env.BASE_URL || "/";
      const audio = new Audio(`${baseUrl}audio/${fileName}.mp3`);
      audio.play().catch(() => {});
    },
    toggleSidebar() {
      const mainEl = document.querySelector(".main-container");
      if (mainEl) mainEl.dispatchEvent(new CustomEvent("toggle-sidebar"));
    },
  },
};
</script>

<style scoped>
.clock-page {
  font-family: "Segoe UI Variable", "Segoe UI", Inter, Roboto, Arial, sans-serif;
  background:
    radial-gradient(circle at 92% 20%, rgba(37, 99, 235, 0.035), transparent 25%),
    linear-gradient(135deg, rgba(37, 99, 235, 0.018), transparent 36%),
    var(--main-bg, #fcfdff);
  isolation: isolate;
}

.clock-page::before,
.clock-page::after {
  content: "";
  position: absolute;
  pointer-events: none;
  z-index: 0;
}

.clock-page::before {
  width: 86%;
  height: 31%;
  left: -7%;
  bottom: -15%;
  border-radius: 50% 55% 0 0 / 100% 100% 0 0;
  background: rgba(80, 120, 230, 0.075);
  transform: rotate(3deg);
}

.clock-page::after {
  width: 72%;
  height: 27%;
  right: -13%;
  bottom: -13%;
  border-radius: 55% 50% 0 0 / 100% 100% 0 0;
  background: rgba(255, 107, 53, 0.075);
  transform: rotate(-7deg);
}

.clock-page-header,
.clock-page-content {
  position: relative;
  z-index: 1;
}

.clock-page-header {
  padding: 28px 40px 0 !important;
}

.clock-page-title {
  color: #172033 !important;
  font-size: 27px !important;
  font-weight: 700 !important;
  letter-spacing: -0.02em;
  line-height: 1.15 !important;
}

.clock-page-content {
  justify-content: flex-start;
  padding: clamp(34px, 5vh, 58px) 32px 28px !important;
}

.clock-widget-container,
.timer-controls {
  width: min(100%, 1060px) !important;
  max-width: 1060px !important;
}

.clock-widget-container {
  height: clamp(260px, 33vh, 322px);
  min-height: 240px;
  overflow: hidden;
  border: 1px solid rgba(31, 65, 130, 0.28);
  border-radius: 30px;
  background:
    radial-gradient(circle at 10% 10%, rgba(55, 115, 225, 0.38), transparent 38%),
    linear-gradient(135deg, #102b61 0%, #071b3d 52%, #0a214a 100%);
  box-shadow: 0 18px 50px rgba(15, 35, 75, 0.11);
}

.clock-widget-container :deep(.clock-screen--preview) {
  background: transparent !important;
}

.clock-widget-container :deep(.config-palette-btn) {
  width: 48px !important;
  height: 48px !important;
  color: #dce9ff !important;
  background: rgba(37, 99, 235, 0.28) !important;
  border: 1px solid rgba(116, 159, 255, 0.18);
  transition: background 0.2s ease, transform 0.2s ease;
}

.clock-widget-container :deep(.config-palette-btn:hover) {
  background: rgba(59, 130, 246, 0.42) !important;
  transform: translateY(-1px);
}

.clock-widget-container :deep(.clock-project-btn) {
  width: 48px !important;
  height: 48px !important;
  color: #ffffff !important;
  background: rgba(255, 255, 255, 0.14) !important;
  border: 1px solid rgba(255, 255, 255, 0.24) !important;
  box-shadow: 0 8px 20px rgba(2, 12, 32, 0.2);
  opacity: 1 !important;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.clock-widget-container :deep(.clock-project-btn .v-icon) {
  color: #ffffff !important;
  opacity: 1 !important;
}

.clock-widget-container :deep(.clock-project-btn:hover) {
  background: rgba(59, 130, 246, 0.48) !important;
  border-color: rgba(147, 184, 255, 0.48) !important;
  transform: translateY(-1px);
}

.clock-widget-container :deep(.clock-project-btn.v-btn--active) {
  color: #ffffff !important;
  background: #2563eb !important;
  border-color: #5b8cff !important;
  box-shadow: 0 0 0 3px rgba(91, 140, 255, 0.2), 0 8px 22px rgba(37, 99, 235, 0.32);
}

.clock-panel-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.22;
  background:
    radial-gradient(circle at 15% 106%, transparent 0 28%, rgba(89, 143, 255, 0.65) 28.2% 28.45%, transparent 28.7%),
    radial-gradient(circle at 90% 0%, transparent 0 27%, rgba(89, 143, 255, 0.5) 27.2% 27.45%, transparent 27.7%);
}

.clock-panel-decoration::before,
.clock-panel-decoration::after {
  content: "";
  position: absolute;
  width: 220px;
  height: 220px;
  opacity: 0.28;
  background-image: radial-gradient(circle, #79a5ff 1px, transparent 1.4px);
  background-size: 9px 9px;
  mask-image: radial-gradient(circle, #000 8%, transparent 70%);
}

.clock-panel-decoration::before {
  left: -45px;
  bottom: -78px;
}

.clock-panel-decoration::after {
  right: -38px;
  top: -65px;
}

.clock-widget-container :deep(.clock-screen) {
  z-index: 0;
}

.clock-widget-container > .position-absolute {
  margin: 18px !important;
  z-index: 3 !important;
}

.timer-controls {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #e5eaf2;
  border-radius: 27px;
  box-shadow: 0 18px 46px rgba(15, 35, 75, 0.075);
  padding: 26px 30px 24px;
  color: #172033;
}

.timer-controls > .d-flex:first-child {
  margin-bottom: 22px !important;
}

.timer-controls > .d-flex:first-child .font-weight-bold {
  font-size: 18px;
  font-weight: 700 !important;
  line-height: 1.15 !important;
}

.timer-controls > .d-flex:first-child .text-caption {
  margin-top: 3px;
  color: #667085 !important;
  font-size: 13px;
  opacity: 1 !important;
}

.timer-mode-toggle {
  height: 50px;
  border: 1px solid #e6eaf0;
  border-radius: 14px;
  overflow: hidden;
  padding: 4px;
  background: #f3f5f8;
}
.timer-mode-btn {
  border: 0 !important;
  border-radius: 11px !important;
  min-height: 40px !important;
  padding-inline: 16px !important;
  color: #172033;
  font-weight: 650;
  font-size: 14px;
  line-height: 1.2;
  letter-spacing: 0;
  text-transform: none;
}
.timer-mode-btn.v-btn--active {
  color: #2563eb !important;
  background: #eaf2ff !important;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.12);
}
.timer-field {
  flex: 0 1 164px;
  max-width: 164px !important;
}
.timer-field-end {
  flex-basis: 240px;
  max-width: 240px !important;
}
.timer-field :deep(.v-field) {
  border-radius: 14px;
  min-height: 54px;
  background: #fff;
  color: #172033;
  box-shadow: none;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}
.timer-field :deep(.v-field__input) {
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.35;
}
.timer-field :deep(.v-label) {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
}
.timer-field :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
.timer-field :deep(.v-field__outline) {
  color: #cfd6e1;
}
.timer-field :deep(.v-field--focused .v-field__outline) {
  color: #2563eb;
}
.timer-field :deep(.v-field__prepend-inner .v-icon) {
  color: #344054;
}
.timer-action-btn {
  min-height: 54px;
  border-radius: 14px;
  padding-inline: 26px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}
.timer-action-primary {
  background: linear-gradient(135deg, #2f6cf0, #2563eb) !important;
  box-shadow: 0 9px 22px rgba(37, 99, 235, 0.24);
}
.timer-action-secondary {
  color: #667085;
  background: #f3f5f8 !important;
  border: 1px solid transparent;
}
.timer-alerts {
  border-top: 1px solid #e8ecf2;
  padding-top: 18px;
  gap: 12px;
}
.timer-option {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 54px;
  padding: 3px 16px;
  color: #172033;
  background: #f8f9fb;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
}
.timer-option-negative {
  color: #e11d48;
  background: #fff1f2;
  border-color: #fecaca;
}
.timer-option :deep(.v-label) {
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.25;
  opacity: 0.9;
}
.timer-option :deep(.v-switch) {
  flex: none;
}

.v-theme--dark .clock-page-title {
  color: var(--sidebar-text) !important;
}

.v-theme--dark .timer-controls {
  color: var(--sidebar-text);
  background: rgba(28, 32, 47, 0.96);
  border-color: var(--border-color);
}

.v-theme--dark .timer-field :deep(.v-field),
.v-theme--dark .timer-option,
.v-theme--dark .timer-action-secondary,
.v-theme--dark .timer-mode-toggle {
  background: rgba(255, 255, 255, 0.055) !important;
  color: var(--sidebar-text);
  border-color: var(--border-color);
}

@media (max-width: 1200px) {
  .clock-page-content {
    padding-top: 26px !important;
  }

  .clock-widget-container {
    height: clamp(235px, 31vh, 285px);
  }

  .timer-controls {
    padding: 22px;
  }

  .timer-field {
    flex-basis: 132px;
    max-width: 132px !important;
  }
}

@media (max-width: 850px) {
  .clock-page-header {
    padding: 20px 22px 0 !important;
  }

  .clock-page-content {
    overflow-y: auto !important;
    padding: 24px 20px 28px !important;
  }

  .clock-widget-container {
    min-height: 220px;
  }

  .timer-controls > .d-flex:first-child {
    align-items: flex-start !important;
  }
}

@media (max-width: 720px) {
  .timer-controls {
    padding: 16px;
  }

  .timer-mode-toggle {
    width: 100%;
  }

  .timer-mode-btn {
    flex: 1;
  }

  .timer-field,
  .timer-field-end {
    flex: 1 1 120px;
    max-width: none !important;
  }

  .timer-action-btn {
    flex: 1 1 140px;
  }
}
</style>
