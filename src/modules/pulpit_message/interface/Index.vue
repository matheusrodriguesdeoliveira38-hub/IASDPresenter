<template>
  <PulpitMessageControl v-model="show" />
</template>

<script lang="ts">
import PulpitMessageControl from "@/components/PulpitMessageControl.vue";

export default {
  name: "PulpitMessageModule",
  components: { PulpitMessageControl },
  computed: {
    show: {
      get() { return this.$appdata.get("modules.pulpit_message.show") === true; },
      set(value: boolean) {
        if (!value) this.$modules.close("pulpit_message");
      },
    },
  },
};
</script>
