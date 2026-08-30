<template>
  <v-footer
    v-if="isMediaMinimized"
    id="footer-bar"
    class="pa-0"
    color="primary"
  >
    <LPlayer location="footer" />
  </v-footer>
  <v-footer
    v-else-if="isExternalMediaMinimized"
    id="footer-bar"
    class="pa-0"
    color="primary"
  >
    <ExternalMediaFooterPlayer />
  </v-footer>
</template>

<script lang="ts">
import LPlayer from "@/components/Player.vue";
import ExternalMediaFooterPlayer from "@/components/ExternalMediaFooterPlayer.vue";

export default {
  name: "FooterLayout",
  components: {
    LPlayer,
    ExternalMediaFooterPlayer,
  },
  computed: {
    isMediaMinimized() {
      return this.$media.isMinimized();
    },
    isExternalMediaMinimized() {
      return this.$appdata.get("modules.external_media.minimized") === true && this.$appdata.get("modules.external_media.filePath");
    },
  },
};
</script>

<style scoped>
#footer-bar {
  flex: 0 !important;
}
</style>
