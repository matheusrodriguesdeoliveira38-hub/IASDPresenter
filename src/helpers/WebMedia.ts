import database from "@/helpers/Database";
import path from "@/helpers/Path";

export const MEDIA_CACHE = "iasdpresenter-media-v1";
const LOCAL_CACHE = "iasdpresenter-imports-v1";

export async function albumMediaFiles(albumId: number): Promise<string[]> {
  const album = await database.get(`album_${albumId}`, { silent: true });
  if (!album?.musics) throw new Error("Não foi possível abrir a coletânea.");
  const paths = new Set<string>();
  if (album.url_image) paths.add(album.url_image);
  for (const item of album.musics) {
    const music = await database.get(`music_${item.id_music}`, { silent: true });
    if (!music) throw new Error(`Não foi possível abrir a música ${item.id_music}.`);
    [music.url_music, music.url_instrumental_music, music.url_image,
      ...(music.lyric || []).map(lyric => lyric.url_image)]
      .filter(Boolean).forEach(file => paths.add(file));
  }
  return [...paths].map(file => path.file(file)).filter(Boolean);
}

export async function saveRemoteMedia(url: string, signal?: AbortSignal): Promise<void> {
  const cache = await caches.open(MEDIA_CACHE);
  if (await cache.match(url)) return;
  const response = await fetch(url, { signal, mode: "cors" });
  if (!response.ok || response.status === 206) throw new Error(`Falha no download (${response.status}). Tente novamente mais tarde.`);
  const type = response.headers.get("content-type") || "";
  if (!/^(audio|video|image)\//i.test(type) && !type.includes("octet-stream")) {
    throw new Error("O servidor não retornou um arquivo de mídia.");
  }
  await cache.put(url, response);
}

export async function importLocalMedia(file: File): Promise<void> {
  if (!/\.(mp3|wav|flac|aac|ogg|m4a|mp4|webm|mov|mkv)$/i.test(file.name)) {
    throw new Error(`Formato não suportado para importação: ${file.name}`);
  }
  if (!file.size) throw new Error(`Arquivo vazio: ${file.name}`);
  const key = new URL(`${import.meta.env.BASE_URL}local-imports/${crypto.randomUUID()}/${encodeURIComponent(file.name)}`, location.origin).href;
  const cache = await caches.open(LOCAL_CACHE);
  await cache.put(key, new Response(file, { headers: { "Content-Type": file.type || "application/octet-stream" } }));
}

export async function listLocalMedia(): Promise<Array<{ key: string; name: string }>> {
  const cache = await caches.open(LOCAL_CACHE);
  return (await cache.keys()).map(request => ({ key: request.url, name: decodeURIComponent(new URL(request.url).pathname.split("/").pop()) }));
}

export async function localMediaUrl(key: string, name: string): Promise<string> {
  const response = await (await caches.open(LOCAL_CACHE)).match(key);
  if (!response) throw new Error("Arquivo local não encontrado.");
  return `${URL.createObjectURL(await response.blob())}#${encodeURIComponent(name)}`;
}
