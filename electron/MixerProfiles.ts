// Shared by the renderer and desktop runtime. Keep this module free of Node APIs.
export const mixerProfiles = [
  { id: "ui12", name: "Soundcraft Ui12", type: "soundcraft-ui", inputs: 8, port: 0 },
  { id: "ui16", name: "Soundcraft Ui16", type: "soundcraft-ui", inputs: 12, port: 0 },
  { id: "ui24r", name: "Soundcraft Ui24R", type: "soundcraft-ui", inputs: 24, port: 0 },
  { id: "x32", name: "Behringer X32", type: "behringer-x32", inputs: 32, port: 10023 },
  { id: "m32", name: "Midas M32", type: "midas-m32", inputs: 32, port: 10023 },
  { id: "xr12", name: "Behringer X Air XR12", type: "behringer-xair", inputs: 12, port: 10024 },
  { id: "xr16", name: "Behringer X Air XR16", type: "behringer-xair", inputs: 16, port: 10024 },
  { id: "xr18", name: "Behringer X Air XR18", type: "behringer-xair", inputs: 16, port: 10024 },
  { id: "x18", name: "Behringer X Air X18", type: "behringer-xair", inputs: 16, port: 10024 },
];

export function getMixerProfile(device) {
  // Old Ui16 configurations did not store a model.
  const model = device?.model || (device?.type === "soundcraft-ui" ? "ui16" : "");
  return mixerProfiles.find(profile => profile.id === model && profile.type === device?.type);
}

export function mixerTargetOptions(device) {
  const profile = getMixerProfile(device);
  if (!profile) return [];
  return [
    { title: "Canal de entrada", value: "input" },
    ...(profile.type === "soundcraft-ui" ? [
      { title: "Line In L", value: "line-left" },
      { title: "Line In R", value: "line-right" },
    ] : []),
    ...(profile.type === "behringer-xair" ? [{ title: "Aux estéreo (17/18)", value: "aux" }] : []),
    { title: "Master", value: "master" },
  ];
}

export function normalizeMixerDevice(device) {
  const profile = getMixerProfile(device);
  return {
    id: String(device.id || ""),
    name: String(device.name || "").trim(),
    type: String(device.type || ""),
    model: String(device.model || profile?.id || ""),
    ip: String(device.ip || "").trim().replace(/^(?:https?|wss?):\/\//i, "").split("/")[0].trim(),
    port: Number(device.port ?? profile?.port ?? 0),
  };
}

export function validateMixerDevice(device) {
  const profile = getMixerProfile(device);
  if (!profile) throw new Error("Modelo de mesa não suportado. Selecione um modelo da lista.");
  if (!device.id || !device.name?.trim()) throw new Error("Informe o nome da mesa.");
  if (!device.ip || /\s/.test(device.ip)) throw new Error(`Informe o endereço da mesa ${device.name}.`);
  if (profile.port && (!Number.isInteger(device.port) || device.port < 1 || device.port > 65535 || /[:/]/.test(device.ip))) {
    throw new Error(`Confira o endereço e a porta UDP da mesa ${device.name}.`);
  }
  return profile;
}

export function validateMixerAction(device, action) {
  const profile = validateMixerDevice(device);
  if (!mixerTargetOptions(device).some(option => option.value === action.target)) {
    throw new Error(`Alvo não disponível na mesa ${device.name}.`);
  }
  if (action.target === "input" && (!Number.isInteger(action.channel) || action.channel < 1 || action.channel > profile.inputs)) {
    throw new Error(`${device.name}: escolha um canal entre 1 e ${profile.inputs}.`);
  }
  if (!["setFaderLevelDB", "fadeToDB", "mute", "unmute"].includes(action.operation)) throw new Error("Ação de automação inválida.");
  if (profile.type === "soundcraft-ui" && action.target === "master" && ["mute", "unmute"].includes(action.operation)) {
    throw new Error("No Master Soundcraft, use Definir volume ou Fade para volume. Mute e desmute estão disponíveis nos canais.");
  }
  if (["setFaderLevelDB", "fadeToDB"].includes(action.operation)) {
    const levels = action.restoreOnMediaEnd ? [action.valueDB, action.endValueDB] : [action.valueDB];
    if (levels.some(value => !Number.isFinite(value) || value < -90 || value > 10)) throw new Error("O volume deve estar entre -90 e +10 dB.");
    const durations = [action.fadeMs ?? 0, ...(action.restoreOnMediaEnd ? [action.endFadeMs ?? 0] : [])];
    if (durations.some(value => !Number.isFinite(value) || value < 0 || value > 60000)) throw new Error("O fade deve estar entre 0 e 60000 ms.");
  }
}

export function validateMixerConfig(config) {
  const ids = new Set();
  for (const device of config.devices) {
    validateMixerDevice(device);
    if (ids.has(device.id)) throw new Error("Existem mesas com identificadores duplicados.");
    ids.add(device.id);
  }
  for (const trigger of config.triggers) {
    for (const action of trigger.actions || []) {
      const device = config.devices.find(item => item.id === action.deviceId);
      if (!device) throw new Error(`Selecione uma mesa para as ações do gatilho ${trigger.name}.`);
      validateMixerAction(device, action);
    }
  }
}
