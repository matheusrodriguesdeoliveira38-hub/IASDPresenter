/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

interface Window {
  monitorId?: string | number;
  popupRole?: string;
  popupModule?: string;
  popupFullscreen?: boolean;
  electronAPI?: Record<string, any> & { isElectron?: boolean };
}
