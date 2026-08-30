import $userdata from "@/helpers/UserData";

export const DEFAULT_PRIMARY_HYMNAL = "hymnal";

const HYMNAL_ALBUM_IDS = {
  hymnal: 712,
  hymnal_1996: 629,
};

export function getPrimaryHymnal() {
  const saved = $userdata.get("modules.config.primary_hymnal");
  return saved === "hymnal_1996" ? "hymnal_1996" : DEFAULT_PRIMARY_HYMNAL;
}

export function isHymnalAlbum(album, hymnal = getPrimaryHymnal()) {
  if (!album) return false;

  const albumId = Number(album.id_album);
  if (albumId === HYMNAL_ALBUM_IDS[hymnal]) return true;

  const name = String(album.name || "").toLowerCase();
  return hymnal === "hymnal_1996"
    ? name.includes("1996")
    : name.includes("hinário adventista") && !name.includes("1996");
}

export function getHymnalSearchPriority(item, track) {
  const hymnals = (item?.albums || []).filter(album => (
    album.type === "hymnal" && Number(album.pivot?.track ?? album.track) === Number(track)
  ));

  if (!hymnals.length) return 0;
  return hymnals.some(album => isHymnalAlbum(album)) ? 2 : 1;
}

export function getPreferredHymnalAlbum(item) {
  const hymnals = (item?.albums || []).filter(album => album.type === "hymnal");
  return hymnals.find(album => isHymnalAlbum(album)) || hymnals[0] || null;
}
