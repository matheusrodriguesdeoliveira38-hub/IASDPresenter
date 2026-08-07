import $userdata from "@/helpers/UserData";

const DEFAULT_CONFIG = {
  enabled: false,
  simulationMode: false,
  showStatus: true,
  devices: [],
  triggers: [],
};

function getConfig() {
  return {
    ...DEFAULT_CONFIG,
    ...($userdata.get("modules.config.automation") || {}),
  };
}

const helper: Record<string, any> = {
  getConfig,

  getTriggerOptions() {
    return getConfig().triggers
      .filter(trigger => trigger && trigger.enabled !== false)
      .map(trigger => ({ title: trigger.name, value: trigger.id }));
  },

  async runTrigger(triggerId, context = {}) {
    const config = getConfig();
    if (!config.enabled || !triggerId) return { ok: true, skipped: true };

    if (!window.electronAPI?.runAutomationTrigger) {
      return { ok: false, error: "Automações disponíveis apenas na versão desktop." };
    }

    return window.electronAPI.runAutomationTrigger(triggerId, context);
  },

  async runItemTrigger(item, context = {}) {
    const triggerId = item?.automationTriggerId;
    if (!triggerId) return { ok: true, skipped: true };

    return this.runTrigger(triggerId, {
      source: "liturgy",
      item: item ? JSON.parse(JSON.stringify(item)) : null,
      ...context,
    });
  },

  async restore(reason = "media_ended") {
    if (!window.electronAPI?.restoreAutomation) {
      return { ok: true, skipped: true };
    }

    return window.electronAPI.restoreAutomation(reason);
  },
};

export default helper;
