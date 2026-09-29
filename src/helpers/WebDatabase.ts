// Keep validated JSON across browser sessions. Cache keys include the data
// source so switching servers cannot return records from another library.
const cacheName = "iasdpresenter-database-v1";

export async function readWebDatabase(url: string): Promise<unknown | null> {
  try {
    const cache = await caches.open(cacheName);
    const response = await cache.match(url);
    return response ? await response.json() : null;
  } catch {
    return null;
  }
}

export async function saveWebDatabase(url: string, data: unknown): Promise<void> {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(url, new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    }));
  } catch (error) {
    // A quota/storage failure must not discard successfully downloaded data.
    console.warn("Não foi possível guardar os dados para uso offline:", error);
  }
}
