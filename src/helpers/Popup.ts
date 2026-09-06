import $appdata from "@/helpers/AppData";
import $window from "@/helpers/Window";
import $performance from "@/helpers/Performance";
import { markRaw } from "vue";

const helper: Record<string, any> = {
  projectionRole: "projection",
  returnRole: "return_monitor",
  webOutputRole: "web_output",

  async open(params) {
    if (typeof params !== "object") {
      params = { module: params };
    }

    let popups = $appdata.get("popups") || [];

    popups = popups.filter(p => !p.closed);
    const role = params.role || this.projectionRole;
    const popupModule = params.popupModule || params.module;
    const url = `#/popup?module=${popupModule}`;
    const windowName = params.popupModule
      ? `${params.popupModule}_${params.monitorId || "window"}`
      : `PopupWindow_${params.monitorId || "window"}`;

    $appdata.set("popup_module", params.module);

    if (params.monitorId) {
      const existing = popups.find(p => p.monitorId === params.monitorId && (p.popupRole || this.projectionRole) === role);
      const existingMatchesFullscreen = existing?.popupFullscreen === !!params.fullscreen;
      if (existing && !existing.closed && existingMatchesFullscreen) {
        existing.focus();
      } else {
        if (existing && !existing.closed) {
          existing.close();
          popups = popups.filter(p => p !== existing);
        }
        let features = `width=800,height=600,monitor=${params.monitorId}`;
        if (params.fullscreen) features += ",fullscreen=yes";
        const newPopup = $window.open(url, windowName, features);
        newPopup.monitorId = params.monitorId;
        newPopup.popupRole = role;
        newPopup.popupModule = popupModule;
        newPopup.popupFullscreen = !!params.fullscreen;
        popups.push(markRaw(newPopup));
      }
    } else {
      const existingMatchesFullscreen = popups[0]?.popupFullscreen === !!params.fullscreen;
      if (popups.length > 0 && !popups[0].closed && existingMatchesFullscreen) {
        popups[0].focus();
      } else {
        popups.forEach(popup => {
          if (popup && !popup.closed) popup.close();
        });
        let features = "width=800,height=600";
        if (params.fullscreen) features += ",fullscreen=yes";
        const newPopup = $window.open(url, windowName, features);
        newPopup.popupRole = role;
        newPopup.popupModule = popupModule;
        newPopup.popupFullscreen = !!params.fullscreen;
        popups = [markRaw(newPopup)];
      }
    }

    $appdata.set("popups", popups);
    $appdata.set("popup", popups[0] || null);
  },
  async exit() {
    const popups = $appdata.get("popups") || [];
    popups.forEach(popup => {
      if (popup && !popup.closed) {
        popup.close();
      }
    });
    $appdata.set("popup_module", "");
    $appdata.set("popups", []);
    $appdata.set("popup", null);
  },
  closeProjection(moduleName) {
    let popups = $appdata.get("popups") || [];
    popups.forEach(popup => {
      const role = popup?.popupRole || this.projectionRole;
      if (popup && !popup.closed && role === this.projectionRole && popup.popupModule === moduleName) {
        popup.close();
      }
    });
    popups = popups.filter(popup => popup && !popup.closed);
    $appdata.set("popups", popups);
    $appdata.set("popup", popups[0] || null);

    const sameModuleStillOpen = popups.some(popup => popup.popupModule === moduleName);
    if (!sameModuleStillOpen && $appdata.get("popup_module") === moduleName) {
      $appdata.set("popup_module", "");
    }
  },
  async openWebOutput(moduleName) {
    if (!moduleName) return;

    let popups = ($appdata.get("popups") || []).filter(popup => popup && !popup.closed);
    const existing = popups.find(popup => popup.popupRole === this.webOutputRole);
    if (existing && existing.popupModule === moduleName) return;

    if (existing && !existing.closed) existing.close();
    popups = popups.filter(popup => popup !== existing && !popup.closed);

    const newPopup = $window.open(
      `#/popup?module=${moduleName}&webOutput=1`,
      "IASDPresenterWebOutput",
      "width=1920,height=1080,weboutput=yes",
    );
    newPopup.popupRole = this.webOutputRole;
    newPopup.popupModule = moduleName;
    newPopup.popupFullscreen = false;
    popups.push(markRaw(newPopup));
    $appdata.set("popups", popups);
    if (!$appdata.get("popup")) $appdata.set("popup", newPopup);
  },
  closeWebOutput() {
    let popups = $appdata.get("popups") || [];
    popups.forEach(popup => {
      if (popup && !popup.closed && popup.popupRole === this.webOutputRole) popup.close();
    });
    popups = popups.filter(popup => popup && !popup.closed && popup.popupRole !== this.webOutputRole);
    $appdata.set("popups", popups);
    $appdata.set("popup", popups[0] || null);
  },
  async syncMonitors(monitors, moduleName = "media", forceOpen = false, fullscreen = true) {
    let popups = $appdata.get("popups") || [];
    popups = popups.filter(p => !p.closed);
    const targetMonitors = $performance.limitProjectionWindows()
      ? (monitors || []).slice(0, 1)
      : (monitors || []);
    const projectionPopups = popups.filter(p => (p.popupRole || this.projectionRole) === this.projectionRole);

    projectionPopups.forEach(popup => {
      if (popup.monitorId && (!targetMonitors.includes(popup.monitorId) || popup.popupFullscreen !== !!fullscreen)) {
        popup.close();
      }
    });

    popups = popups.filter(p => !p.closed);

    if ($appdata.get("popup_module") === moduleName || forceOpen) {
      $appdata.set("popup_module", moduleName);
      for (const monitorId of targetMonitors) {
        const existing = popups.find(p => p.monitorId === monitorId && (p.popupRole || this.projectionRole) === this.projectionRole);
        if (!existing || existing.closed) {
          const features = `width=800,height=600,monitor=${monitorId},fullscreen=yes`;
          const windowFeatures = fullscreen ? features : `width=800,height=600,monitor=${monitorId}`;
          const newPopup = $window.open(`#/popup?module=${moduleName}`, `PopupWindow_${monitorId}`, windowFeatures);
          newPopup.monitorId = monitorId;
          newPopup.popupRole = this.projectionRole;
          newPopup.popupModule = moduleName;
          newPopup.popupFullscreen = !!fullscreen;
          popups.push(markRaw(newPopup));
        }
      }
      if (targetMonitors.length > 0) {
        $appdata.set("popup_module", moduleName);
      } else if (popups.length === 0) {
        $appdata.set("popup_module", "");
      }
    }

    $appdata.set("popups", popups);
    if (popups.length > 0) {
      $appdata.set("popup", popups[0]);
    }
  },

  async syncReturnMonitor(monitorId, forceOpen = false) {
    if ($performance.limitProjectionWindows()) {
      this.closeReturnMonitor();
      return;
    }

    let popups = $appdata.get("popups") || [];
    popups = popups.filter(p => !p.closed);

    popups.forEach(popup => {
      if ((popup.popupRole || this.projectionRole) === this.returnRole && popup.monitorId !== monitorId) {
        popup.close();
      }
    });

    popups = popups.filter(p => !p.closed);

    if (!monitorId) {
      $appdata.set("popups", popups);
      return;
    }

    const enabled = $appdata.get("modules.media.id_music") != null || forceOpen;
    if (enabled) {
      const existing = popups.find(p => p.monitorId === monitorId && (p.popupRole || this.projectionRole) === this.returnRole);
      if (!existing || existing.closed) {
        const features = `width=800,height=600,monitor=${monitorId},fullscreen=yes`;
        const newPopup = $window.open("#/popup?module=return_monitor", `ReturnMonitor_${monitorId}`, features);
        newPopup.monitorId = monitorId;
        newPopup.popupRole = this.returnRole;
        newPopup.popupModule = "return_monitor";
        popups.push(markRaw(newPopup));
      }
    }

    $appdata.set("popups", popups);
    if (popups.length > 0) {
      $appdata.set("popup", popups[0]);
    }
  },

  closeReturnMonitor() {
    let popups = $appdata.get("popups") || [];
    popups.forEach(popup => {
      if (popup && !popup.closed && (popup.popupRole || this.projectionRole) === this.returnRole) {
        popup.close();
      }
    });
    popups = popups.filter(p => p && !p.closed);
    $appdata.set("popups", popups);
  },
};

export default helper;
