import { createI18n } from "vue-i18n";
import UserData from "@/helpers/UserData";

export const SUPPORTED_LOCALES = ["pt", "en", "es"];

export function normalizeLocale(locale) {
  const language = String(locale || "").toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LOCALES.includes(language) ? language : "pt";
}

const loadLocaleMessages = async () => {
  const messages = {};
  for (const locale of SUPPORTED_LOCALES) {
    messages[locale] = (await import(`./lang/${locale}.json`)).default;
  }
  return messages;
};

export const createI18nInstance = async () => {
  const messages = await loadLocaleMessages();
  const savedLocale = normalizeLocale(UserData.get("language") || navigator.language);
  return createI18n({
    legacy: false,
    locale: savedLocale,
    fallbackLocale: "pt",
    messages,
  });
};

export default createI18nInstance;
