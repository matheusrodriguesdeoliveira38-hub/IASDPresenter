export interface PulpitMessage {
  text: string;
  expiresAt: number | null;
}

export function activePulpitMessage(message: PulpitMessage | null, now = Date.now()) {
  return message && (message.expiresAt === null || message.expiresAt > now) ? message : null;
}

export function sendPulpitMessage(popups: any[], message: PulpitMessage | null, monitorId?: string | number) {
  let sent = 0;
  for (const popup of popups) {
    if (popup.closed) continue;
    if (monitorId == null) {
      if (popup.popupRole !== "return_monitor") continue;
    } else if (String(popup.monitorId) !== String(monitorId)
      || !["projection", "return_monitor", "clock", "pulpit_message"].includes(popup.popupRole)) continue;
    try {
      popup.postMessage({ action: "pulpit-message", message }, "*");
      sent += 1;
    } catch { /* A monitor may close while sending. */ }
  }
  return sent;
}
