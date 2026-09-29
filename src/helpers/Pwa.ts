import { shallowReactive } from "vue";

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

export const pwa = shallowReactive({
  enabled: __PWA_ENABLED__ && !window.electronAPI,
  libraryBundled: !!__BUNDLED_LIBRARY_VERSION__,
  installEvent: null as InstallEvent | null,
  offlineReady: false,
  updateReady: false,
  error: "",
});

let applyUpdate: ((reload?: boolean) => Promise<void>) | undefined;

export function startPwa() {
  if (!pwa.enabled) return;
  window.addEventListener("beforeinstallprompt", (event: InstallEvent) => {
    event.preventDefault();
    pwa.installEvent = event;
  });
  window.addEventListener("appinstalled", () => { pwa.installEvent = null; });
  import("virtual:pwa-register").then(({ registerSW }) => {
    applyUpdate = registerSW({
      immediate: true,
      onOfflineReady() { pwa.offlineReady = true; },
      onRegisteredSW(_url, registration) {
        if (registration?.active && !registration.installing) pwa.offlineReady = true;
      },
      onNeedRefresh() { pwa.updateReady = true; },
      onRegisterError() { pwa.error = "Não foi possível preparar o aplicativo para uso offline."; },
    });
  }).catch(() => { pwa.error = "Não foi possível iniciar o modo offline."; });
}

export async function installPwa() {
  const event = pwa.installEvent;
  if (!event) return;
  pwa.installEvent = null;
  try {
    await event.prompt();
    await event.userChoice;
  } catch {
    pwa.error = "Use o menu do Chrome para instalar o aplicativo.";
  }
}

export async function updatePwa() {
  await applyUpdate?.(true);
}
