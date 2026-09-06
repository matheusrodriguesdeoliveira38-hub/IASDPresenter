export const CUSTOM_SONG_ALBUM_ID = 900001;

export function applyCustomSongTrack(music, track) {
  const normalizedTrack = Math.max(1, Number(track) || 1);
  const normalized = {
    ...music,
    track: normalizedTrack,
  };

  if (Array.isArray(music?.albums)) {
    normalized.albums = music.albums.map((album) => {
      if (Number(album?.id_album) !== CUSTOM_SONG_ALBUM_ID) return album;

      const updatedAlbum = {
        ...album,
        track: normalizedTrack,
        order: normalizedTrack,
      };
      if (album?.pivot && typeof album.pivot === "object") {
        updatedAlbum.pivot = {
          ...album.pivot,
          track: normalizedTrack,
        };
      }
      return updatedAlbum;
    });
  }

  return normalized;
}

export function normalizeCustomSongTracks(musics) {
  return (Array.isArray(musics) ? musics : [])
    .filter(Boolean)
    .map((music, originalIndex) => ({ music, originalIndex }))
    .sort((a, b) => {
      const aTrack = Number(a.music.track);
      const bTrack = Number(b.music.track);
      const aOrder = Number.isFinite(aTrack) && aTrack > 0 ? aTrack : Number.MAX_SAFE_INTEGER;
      const bOrder = Number.isFinite(bTrack) && bTrack > 0 ? bTrack : Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder || a.originalIndex - b.originalIndex;
    })
    .map(({ music }, index) => applyCustomSongTrack(music, index + 1));
}

export function getCustomSongTrackMap(musics) {
  return new Map(
    (Array.isArray(musics) ? musics : []).map((music) => [music.id_music, music.track]),
  );
}
