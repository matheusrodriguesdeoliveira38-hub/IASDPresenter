// User-selected files and edited records are kept separately from the bundled library.
// Cache writes intentionally propagate quota failures: user work must never appear saved
// when the browser has refused it.
export const USER_FILES_CACHE = "iasdpresenter-user-files-v1";
const USER_RECORDS_CACHE = "iasdpresenter-user-records-v1";

function key(folder: string, name: string) {
  return new URL(`${import.meta.env.BASE_URL}${folder}/${name}`, location.origin).href;
}

export async function readUserRecord(name: string) {
  const response = await (await caches.open(USER_RECORDS_CACHE)).match(key("user-records", encodeURIComponent(name)));
  return response ? response.json() : null;
}

export async function saveUserRecord(name: string, value: unknown) {
  await (await caches.open(USER_RECORDS_CACHE)).put(key("user-records", encodeURIComponent(name)),
    new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } }));
}

export async function storeUserFile(file: File) {
  if (!file.size) throw new Error("O arquivo selecionado está vazio.");
  const url = key("user-files", `${crypto.randomUUID()}/${encodeURIComponent(file.name)}`);
  await (await caches.open(USER_FILES_CACHE)).put(url, new Response(file, {
    headers: { "Content-Type": file.type || "application/octet-stream" },
  }));
  return url;
}

async function readFile(url: string) {
  const response = await (await caches.open(USER_FILES_CACHE)).match(url);
  if (!response) throw new Error("Arquivo não encontrado neste dispositivo. Importe-o novamente.");
  return response;
}

function chooseFile(options): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file";
    const extensions = options?.filters?.flatMap(filter => filter.extensions) || [];
    input.accept = extensions.includes("*") ? "" : [...new Set(extensions)].map(ext => `.${ext}`).join(",");
    input.addEventListener("change", () => { resolve(input.files?.[0] || null); input.remove(); }, { once: true });
    input.addEventListener("cancel", () => { resolve(null); input.remove(); }, { once: true });
    input.hidden = true;
    document.body.append(input);
    input.click();
  });
}

const pendingSaves = new Map<string, any>();
export const browserFiles = {
  getLocalDb: readUserRecord,
  saveLocalDb: saveUserRecord,
  async openFileDialog(options) {
    const file = await chooseFile(options);
    return file ? storeUserFile(file) : null;
  },
  async saveFileDialog(options) {
    if (!("showSaveFilePicker" in window)) return options.defaultPath;
    try {
      const handle = await (window as any).showSaveFilePicker({ suggestedName: options.defaultPath });
      const token = crypto.randomUUID();
      pendingSaves.set(token, handle);
      return token;
    } catch (error) {
      if (error.name === "AbortError") return null;
      throw error;
    }
  },
  async writeTextFile(path: string, content: string) {
    const handle = pendingSaves.get(path);
    pendingSaves.delete(path);
    if (handle) {
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
    } else {
      const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = path;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
    return { ok: true };
  },
  async readTextFile(path: string) { return { ok: true, content: await (await readFile(path)).text() }; },
  async isFileReadable(path: string) {
    return !!await (await caches.open(USER_FILES_CACHE)).match(path);
  },
  async saveCustomMusic(path: string) { await readFile(path); return path; },
  async preparePresentationFile(path: string) {
    await readFile(path);
    if (!/\.pdf$/i.test(path)) {
      return { ok: false, needsConversion: true, sourcePath: path,
        error: "Exporte a apresentação como PDF no PowerPoint ou Google Apresentações e importe o PDF aqui." };
    }
    return { ok: true, sourcePath: path, filePath: path, sourceType: "pdf" };
  },
  async readPresentationFile(path: string) {
    return { ok: true, data: new Uint8Array(await (await readFile(path)).arrayBuffer()) };
  },
};

// Only file/database operations use this adapter; desktop networking and device
// capabilities must still be checked against electronAPI itself.
export default (window.electronAPI || browserFiles) as Record<string, any>;
