// Keep clock windows below visible content, regardless of which window finished
// loading last. Closing the last output restores the same clock window.
export function syncClockWindowOrder(windows) {
  const visible = windows.filter(win => !win.isDestroyed() && win.isVisible());
  for (const clock of visible.filter(win => /[?&]module=clock(?:&|$)/.test(win.webContents.getURL()))) {
    const bounds = clock.getBounds();
    const outputs = visible.filter(win => {
      const url = win.webContents.getURL();
      if (win === clock || !url.includes('#/popup?') || /[?&]module=clock(?:&|$)/.test(url)) return false;
      if (/[?&](webOutput|virtualMonitor)=1(?:&|$)/.test(url)) return false;
      const other = win.getBounds();
      return other.x < bounds.x + bounds.width && other.x + other.width > bounds.x
        && other.y < bounds.y + bounds.height && other.y + other.height > bounds.y;
    });
    clock.setAlwaysOnTop(outputs.length === 0, 'screen-saver');
    // Return content takes precedence when projection and return share a screen.
    outputs.sort((a, b) => Number(b.webContents.getURL().includes('module=return_monitor'))
      - Number(a.webContents.getURL().includes('module=return_monitor')));
    if (outputs[0]) outputs[0].moveTop();
  }
}
