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
                style="max-width: 110px;"
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
                style="max-width: 110px;"
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
                style="max-width: 110px;"
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
              style="max-width: 180px;"
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
.timer-controls {
  background:
    radial-gradient(circle at top right, rgba(var(--v-theme-primary), 0.11), transparent 38%),
    var(--card-bg, #ffffff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.05));
  border-radius: 24px;
  box-shadow: 0 18px 46px rgba(15, 23, 42, 0.08);
  padding: 20px;
}
.timer-mode-toggle {
  border: 1px solid rgba(var(--v-theme-primary), 0.16);
  border-radius: 14px;
  overflow: hidden;
  padding: 3px;
  background: rgba(var(--v-theme-primary), 0.06);
}
.timer-mode-btn {
  border: 0 !important;
  border-radius: 10px !important;
  letter-spacing: 0;
  text-transform: none;
}
.timer-field {
  flex: 0 1 132px;
  max-width: 132px !important;
}
.timer-field-end {
  flex-basis: 210px;
  max-width: 210px !important;
}
.timer-field :deep(.v-field) {
  border-radius: 14px;
  background: rgba(var(--v-theme-surface), 0.78);
  box-shadow: inset 0 0 0 1px rgba(var(--v-theme-primary), 0.05);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.timer-field :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.14);
  transform: translateY(-1px);
}
.timer-action-btn {
  min-height: 42px;
  border-radius: 13px;
  padding-inline: 20px;
  letter-spacing: 0;
  text-transform: none;
}
.timer-action-primary {
  box-shadow: 0 9px 22px rgba(var(--v-theme-primary), 0.25);
}
.timer-action-secondary {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
.timer-alerts {
  border-top: 1px solid var(--border-color, rgba(0,0,0,0.05));
  padding-top: 12px;
  gap: 10px;
}
.timer-option {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 2px 12px;
  color: var(--sidebar-text);
  background: rgba(var(--v-theme-on-surface), 0.035);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.07);
  border-radius: 13px;
}
.timer-option-negative {
  color: rgb(var(--v-theme-error));
  background: rgba(var(--v-theme-error), 0.06);
  border-color: rgba(var(--v-theme-error), 0.14);
}
.timer-option :deep(.v-label) {
  font-size: 0.875rem;
  font-weight: 600;
  opacity: 0.9;
}
.timer-option :deep(.v-switch) {
  flex: none;
}
@media (max-width: 720px) {
  .timer-controls {
    padding: 16px;
  }

  .timer-action-btn {
    flex: 1 1 140px;
  }
}
</style>
