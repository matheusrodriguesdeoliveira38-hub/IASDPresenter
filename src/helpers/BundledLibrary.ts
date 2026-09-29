const buckets = new Map<string, Promise<Record<string, unknown>>>();

export function bucketFor(key: string): string {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return String(hash % 64).padStart(2, "0");
}

export async function readBundledLibrary(key: string): Promise<unknown> {
  const bucket = bucketFor(key);
  let pending = buckets.get(bucket);
  if (!pending) {
    pending = fetch(`${import.meta.env.BASE_URL}library/${__BUNDLED_LIBRARY_VERSION__}/${bucket}.json`)
      .then(async response => {
        if (!response.ok) throw new Error(`Biblioteca indisponível (${response.status}).`);
        return response.json();
      });
    buckets.set(bucket, pending);
    // Bound parsed JSON memory; the service worker keeps all files on disk.
    if (buckets.size > 4) buckets.delete(buckets.keys().next().value);
  }
  try {
    const records = await pending;
    if (!Object.prototype.hasOwnProperty.call(records, key)) {
      throw new Error(`Conteúdo não incluído na biblioteca em português: ${key}`);
    }
    return records[key];
  } catch (error) {
    if (buckets.get(bucket) === pending) buckets.delete(bucket);
    throw error;
  }
}
