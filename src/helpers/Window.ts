const helper: Record<string, any> = {
  open(url, target, features) {
    if (features?.split(',').includes('monitor=virtual-monitor') && url.startsWith('#/popup?')) {
      url += '&virtualMonitor=1';
    }
    if (url.startsWith("/")) {
      url = (import.meta.env.BASE_URL ?? "/") + url.slice(1);
    }
    return window.open(url, target, features);
  },
};

export default helper;
