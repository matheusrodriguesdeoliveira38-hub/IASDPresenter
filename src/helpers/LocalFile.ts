const helper: Record<string, any> = {
  toLocalAppUrl(filePath) {
    if (!filePath) return "";
    if (/^(data|blob|https?|local):/i.test(filePath)) return filePath;

    const normalized = String(filePath).replace(/\\/g, "/");
    const absolutePath = normalized.startsWith("/") ? normalized : `/${normalized}`;
    const encodedPath = absolutePath
      .split("/")
      .map((part, index) => (index === 0 ? "" : encodeURIComponent(part)))
      .join("/");

    return `local://app${encodedPath}`;
  },
};

export default helper;
