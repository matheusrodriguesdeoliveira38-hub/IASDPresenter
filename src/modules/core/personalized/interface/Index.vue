<template>
  <div v-if="module?.show" class="d-none" />
</template>

<script>
import manifest from "../manifest.json";

const CUSTOM_ALBUM_ID = 900001;
const CUSTOM_ALBUM_NAME = "Personalizadas";

export default {
  name: manifest.id,
  computed: {
    module_id() {
      return manifest.id;
    },
    module() {
      return this.$modules.get(this.module_id);
    },
  },
  watch: {
    "module.show": {
      immediate: true,
      handler(value) {
        if (value) {
          this.openPersonalizedAlbum();
        }
      },
    },
  },
  methods: {
    async openPersonalizedAlbum() {
      let album = null;

      if (window.electronAPI?.getLocalDb) {
        album = await window.electronAPI.getLocalDb(`album_${CUSTOM_ALBUM_ID}`);
      }

      if (!album) {
        album = {
          id_album: CUSTOM_ALBUM_ID,
          name: CUSTOM_ALBUM_NAME,
          color: "#0097d7",
          url_image: "",
          categories: [],
          musics: [],
        };

        if (window.electronAPI?.saveLocalDb) {
          await window.electronAPI.saveLocalDb(`album_${CUSTOM_ALBUM_ID}`, album);
          sessionStorage.removeItem(`db:album_${CUSTOM_ALBUM_ID}`);
        }
      }

      this.$appdata.set("modules.album.loading", true);
      this.$appdata.set("modules.album.data", album);
      this.$appdata.set("modules.album.id_album", CUSTOM_ALBUM_ID);
      this.$appdata.set("modules.album.show", true);
      this.$appdata.set("modules.album.loading", false);
      this.$appdata.set(`modules.${this.module_id}.show`, false);
    },
  },
};
</script>
