const helper: Record<string, any> = {
  db(path) {
    const url = import.meta.env.VITE_URL_DATABASE;
    return url + (path.startsWith("/") ? path : `/${  path}`);
  },
  file(path) {
    if (!path) return "";
    if (!window.electronAPI && /^https?:\/\//i.test(path)) return path;
    if (window.electronAPI) {
      const cleanPath = path.startsWith("/") ? path.substring(1) : path;
      if (cleanPath.startsWith("musics/custom/")) {
        return `local://media/music/${cleanPath.substring("musics/".length)}`;
      }
      return `local://media/${cleanPath}`;
    }
    const url = import.meta.env.VITE_URL_FILES || (__PWA_ENABLED__ ? "https://api.louvorja.com.br/file" : "");
    if (!url) return "";
    return url.replace(/\/$/, "") + (path.startsWith("/") ? path : `/${path}`).split("/").map(part => encodeURIComponent(part)).join("/");
  },
};

export default helper;
