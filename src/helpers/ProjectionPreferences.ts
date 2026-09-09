export function resolveProjectionPreferences(get, displays, independentMedia = false) {
  const prefix = independentMedia ? "modules.config.media_slide_" : "modules.config.slide_";
  const configured = get(prefix + "monitor");
  const ids = Array.isArray(configured) ? configured : configured == null ? [] : [configured];
  const primary = displays.find(display => display.isPrimary) || displays[0];
  const monitors = displays.filter(display => display.id !== primary?.id && ids.some(id => String(id) === String(display.id))).map(display => display.id);
  const fullscreen = get(prefix + "fullscreen") !== false;
  const operatorFullscreen = fullscreen && !(get(prefix + "disable_main_if_extended") !== false && monitors.length > 0);
  return {
    monitors,
    fullscreen,
    operatorFullscreen,
    minimize: get(prefix + "minimize_player") === true && !operatorFullscreen,
  };
}
