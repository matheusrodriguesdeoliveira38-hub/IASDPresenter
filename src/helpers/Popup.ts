import $appdata from "@/helpers/AppData";
import $window from "@/helpers/Window";
import $performance from "@/helpers/Performance";
import { markRaw } from "vue";

const helper: Record<string, any> = {
  projectionRole: "projection",
  returnRole: "return_monitor",
  webOutputRole: "web_output",
  clockRole: "clock",

  managedWindow(nativeWindow, metadata) {
    let closed = false;
    return markRaw({
      ...metadata,
      nativeWindow,
      get closed() { return closed || nativeWindow.closed; },
      close() { closed = true; nativeWindow.close(); },
      focus() { nativeWindow.focus(); },
      postMessage(message, origin) { nativeWindow.postMessage(message, origin); },
    });
  },

  isClockMonitor(monitorId) {
    return ($appdata.get("popups") || []).some(p => p && !p.closed
      && p.popupRole === this.clockRole && String(p.monitorId) === String(monitorId));
  },
  async openClock(monitorId) {
    if (monitorId == null) return;
    if (monitorId === 'virtual-monitor' && !this.virtualMonitorAvailable()) return;
    let popups = ($appdata.get("popups") || []).filter(p => p && !p.closed);
    const existing = popups.find(p => p.popupRole === this.clockRole && String(p.monitorId) === String(monitorId));
    if (existing) return;
    popups.forEach(p => {
      if (p.popupRole === this.clockRole) p.close();
    });
    popups = popups.filter(p => !p.closed);
    const clockWindow = $window.open("#/popup?module=clock", `Clock_${monitorId}`, `width=800,height=600,monitor=${monitorId},fullscreen=yes`);
    if (!clockWindow) return;
    // Window properties can be reset when its document loads. Keep the control
    // data in the opener so the toggle survives loading.
    const popup = this.managedWindow(clockWindow, {
      monitorId,
      popupRole: this.clockRole,
      popupModule: "clock",
      popupFullscreen: true,
    });
    popups.push(markRaw(popup));
    $appdata.set("popups", popups);
    $appdata.set("popup", popups[0] || null);
  },
  closeClock() {
    const popups = ($appdata.get("popups") || []).filter(p => {
      if (p?.popupRole === this.clockRole && !p.closed) p.close();
      return p && !p.closed && p.popupRole !== this.clockRole;
    });
    $appdata.set("popups", popups);
    $appdata.set("popup", popups[0] || null);
  },

  async open(params) {
    if (typeof params !== "object") {
      params = { module: params };
    }
    if (params.module === "clock") return this.openClock(params.monitorId);
    if (params.monitorId === 'virtual-monitor' && !this.virtualMonitorAvailable()) return;

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
        existing.popupModule = popupModule;
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
      const clockPopups = popups.filter(p => p.popupRole === this.clockRole);
      popups = popups.filter(p => p.popupRole !== this.clockRole);
      const existingMatchesFullscreen = popups[0]?.popupFullscreen === !!params.fullscreen;
      if (popups.length > 0 && !popups[0].closed && existingMatchesFullscreen) {
        popups[0].popupModule = popupModule;
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
      popups.push(...clockPopups);
    }

    $appdata.set("popups", popups);
    $appdata.set("popup", popups[0] || null);
  },
  async exit() {
    const popups = $appdata.get("popups") || [];
    popups.forEach(popup => {
      if (popup && !popup.closed && popup.popupRole !== this.clockRole) {
        popup.close();
      }
    });
    $appdata.set("popup_module", "");
    const remaining = popups.filter(p => p && !p.closed && p.popupRole === this.clockRole);
    $appdata.set("popups", remaining);
    $appdata.set("popup", remaining[0] || null);
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
    if (moduleName === "clock") return this.openClock(monitors?.[0]);
    monitors = (monitors || []).filter(id => id !== 'virtual-monitor' || this.virtualMonitorAvailable());
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
        // The popup renders popup_module dynamically; keep its metadata in sync.
        if (existing) existing.popupModule = moduleName;
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
    if (monitorId === 'virtual-monitor' && !this.virtualMonitorAvailable()) monitorId = null;
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
        if (newPopup) popups.push(this.managedWindow(newPopup, {
          monitorId,
          popupRole: this.returnRole,
          popupModule: "return_monitor",
        }));
      } else {
        existing.focus();
      }
    }

    $appdata.set("popups", popups);
    if (popups.length > 0) {
      $appdata.set("popup", popups[0]);
    }
  },

  virtualMonitorAvailable() {
    return ($appdata.get('system_displays') || []).some(display => display.id === 'virtual-monitor');
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
    $appdata.set("popup", popups[0] || null);
  },
};

export default helper;
