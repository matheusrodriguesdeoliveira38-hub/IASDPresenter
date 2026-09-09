let sequence = 0;

// Wait for the actual output windows, rather than timing the operator's renderer.
export function transitionProjection(appdata, active: boolean, durationMs: number): Promise<void> {
  const requestId = `projection-${Date.now()}-${++sequence}`;
  const popups = [...(appdata.get("popups") || []), appdata.get("popup")];
  const pending = new Set<Window>(popups.filter(popup => popup && !popup.closed));
  return new Promise(resolve => {
    const finish = () => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      resolve();
    };
    const onMessage = (event: MessageEvent) => {
      if (event.data?.action !== "projection-transition-complete" || event.data.requestId !== requestId) return;
      if (!pending.delete(event.source as Window)) return;
      if (pending.size === 0) finish();
    };
    // Closed, frozen or not-yet-mounted windows must not lock the liturgy controls.
    const timeout = window.setTimeout(finish, durationMs + 1000);
    window.addEventListener("message", onMessage);
    appdata.set("projection_transition", { active, durationMs, requestId });
    if (pending.size === 0) finish();
  });
}
