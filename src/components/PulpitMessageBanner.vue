<template>
  <div class="pulpit-message">
    <small>MENSAGEM AO PÚLPITO</small>
    <div>{{ text }}</div>
  </div>
</template>

<script lang="ts">
export default {
  props: { text: { type: String, required: true } },
};
</script>

<style scoped>
.pulpit-message { position: absolute; inset: auto 3% 3%; padding: 3cqh 3cqw; border: max(1px, 0.21cqw) solid #ffcf40; border-radius: 0.84cqw; background: #171300; color: #fff4c4; text-align: center; font: 800 min(4cqw, 76px)/1.2 Arial, sans-serif; overflow-wrap: anywhere; white-space: pre-wrap; box-shadow: 0 0.42cqw 2.1cqw #000; }
.pulpit-message small { display: block; margin-bottom: 1cqh; color: #ffcf40; font-size: 0.35em; letter-spacing: 0.1em; }
</style>
