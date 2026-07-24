import $appdata from "@/helpers/AppData";
import $userdata from "@/helpers/UserData";

const DEFAULT_PRIMARY = "#0097d7";

function normalizeHex(color) {
  if (!color || typeof color !== "string") return DEFAULT_PRIMARY;

  const hex = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  if (/^#[0-9a-f]{8}$/i.test(hex)) return hex.slice(0, 7);
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    return `#${hex.slice(1).split("").map(char => char + char).join("")}`;
  }

  return DEFAULT_PRIMARY;
}

function hexToRgb(color) {
  const hex = normalizeHex(color).slice(1);
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function shadeHex(color, percent) {
  const { r, g, b } = hexToRgb(color);
  const factor = (100 + percent) / 100;
  const next = [r, g, b].map(value => {
    const channel = Math.round(value * factor);
    return Math.min(255, Math.max(0, channel)).toString(16).padStart(2, "0");
  });

  return `#${next.join("")}`;
}

export default {
  defaultPrimary: DEFAULT_PRIMARY,

  primary() {
    return !$appdata.get("is_dark") ? "primary" : undefined;
  },

  getAccentColor() {
    return normalizeHex($userdata.get("modules.config.accent_color") || DEFAULT_PRIMARY);
  },

  applyAccentColor(vuetify, color = this.getAccentColor()) {
    const accent = normalizeHex(color);
    const accentDark = shadeHex(accent, -22);
    const { r, g, b } = hexToRgb(accent);
    const applyVars = (target) => {
      target.style.setProperty("--accent-blue", accent);
      target.style.setProperty("--accent-blue-dark", accentDark);
      target.style.setProperty("--accent-blue-rgb", `${r}, ${g}, ${b}`);
      target.style.setProperty("--v-theme-primary", `${r}, ${g}, ${b}`);
      target.style.setProperty("--sidebar-hover", `rgba(${r}, ${g}, ${b}, 0.08)`);
      target.style.setProperty("--accent-soft", `rgba(${r}, ${g}, ${b}, 0.08)`);
    };

    applyVars(document.documentElement);
    document.querySelectorAll(".v-theme--light, .v-theme--dark").forEach(applyVars);

    if (vuetify?.theme?.themes?.value) {
      Object.values(vuetify.theme.themes.value).forEach(theme => {
        if (theme?.colors) {
          theme.colors.primary = accent;
        }
      });
    }

    return accent;
  },
};
