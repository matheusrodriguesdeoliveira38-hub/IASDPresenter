import $alert from "@/helpers/Alert";
import $path from "@/helpers/Path";
import $dev from "@/helpers/Dev";
import $storage from "@/helpers/Storage";

const isDesktop = !!(window.electronAPI && window.electronAPI.isElectron);

// Cache descartável: não deve impedir a abertura de dados válidos quando
// sessionStorage estiver cheio ou indisponível. Mantém as invalidações db:*.
const MAX_CACHE_CHARS = 2 * 1024 * 1024;
function cacheDatabase(key, data) {
  try {
    const serialized = JSON.stringify(data);
    if (serialized.length > MAX_CACHE_CHARS) return;
    const entries: { key: string; size: number }[] = [];
    let size = serialized.length;
    for (let index = 0; index < sessionStorage.length; index++) {
      const cachedKey = sessionStorage.key(index);
      if (cachedKey?.startsWith("db:") && cachedKey !== key) {
        const entrySize = (sessionStorage.getItem(cachedKey) || "").length;
        entries.push({ key: cachedKey, size: entrySize });
        size += entrySize;
      }
    }
    for (const entry of entries) {
      if (size <= MAX_CACHE_CHARS) break;
      sessionStorage.removeItem(entry.key);
      size -= entry.size;
    }
    sessionStorage.setItem(key, serialized);
  } catch (error) {
    $dev.write("Cache de BD indisponível", error);
  }
}

async function parseJsonResponse(response, file) {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!contentType.includes("application/json") && text.trim().startsWith("<")) {
    throw new Error(`Servidor retornou HTML ao buscar ${file}. Verifique a conexao ou a URL do banco de dados.`);
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Resposta invalida ao buscar ${file}: ${error.message}`);
  }
}

const helper: Record<string, any> = {
  async get(file, options: { silent?: boolean } = {}) {
    try {
      const cache_name = `db:${file}`;
      let cache = null;
      try {
        cache = $storage.get(cache_name, null, "session");
      } catch (error) {
        $dev.write("Cache de BD indisponível", error);
      }

      if (cache) {
        $dev.write("Lendo BD do cache", file);
        return cache;
      }

      if (isDesktop) {
        const localData = await window.electronAPI.getLocalDb(file);
        if (localData) {
          $dev.write("Lendo BD do disco local (Offline)", file);
          cacheDatabase(cache_name, localData);
          return localData;
        }
        if (navigator.onLine === false) {
          throw new Error(`Banco local "${file}" nao encontrado e o computador esta offline.`);
        }

        $dev.write("BD local não encontrado, baixando e salvando:", file);
      }

      const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const url = `${$path.db(`/${file}`)}?${date}`;
      $dev.write("Abrindo BD", url);
      
      let data = null;
      let retries = 3;
      let delayMs = 1000;
      
      while (retries > 0) {
        try {
          const response = await fetch(url, {
            headers: {
              "Api-Token": import.meta.env.VITE_API_TOKEN,
            },
          });

          if (response.status === 429) {
            $dev.write(`Rate limit 429 em ${file}. Tentando novamente...`, delayMs);
            await new Promise(r => setTimeout(r, delayMs));
            retries--;
            delayMs *= 1.5;
            continue;
          }

          if (!response.ok) {
            if (response.status >= 500) {
              await new Promise(r => setTimeout(r, delayMs));
              retries--;
              delayMs *= 1.5;
              continue;
            }
            throw new Error(`Status ${response.status}`);
          }
          
          data = await parseJsonResponse(response, file);
          break; // Sucesso
        } catch (error) {
          if (retries > 1 && (error.message.includes("Failed to fetch") || error.message.includes("NetworkError"))) {
            await new Promise(r => setTimeout(r, delayMs));
            retries--;
            delayMs *= 1.5;
            continue;
          }
          throw error;
        }
      }

      if (!data) throw new Error("Falha ao baixar dados após várias tentativas");

      $dev.write("Salvando BD em cache", file);
      cacheDatabase(cache_name, data);

      if (isDesktop) {
        await window.electronAPI.saveLocalDb(file, data);
        $dev.write("BD salvo no disco local para acesso offline:", file);
      }

      return data;
    } catch (error) {
      if (!options.silent) {
        $alert.error({ text: "messages.file_database_not_found", error });
      }
      return null;
    }
  },
};

export default helper;
