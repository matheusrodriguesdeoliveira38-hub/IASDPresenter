<template>
  <div class="song-opening" :style="openingStyle">
    <div v-if="hymnal" class="opening-heading">
      <span v-if="hymnal" class="opening-logo opening-logo-small" aria-hidden="true" />
      <span class="opening-heading-copy">{{ hymnal ? "HINÁRIO ADVENTISTA DO SÉTIMO DIA" : album }}</span>
    </div>
    <span v-if="hymnal" class="opening-logo opening-logo-large" aria-hidden="true" />
    <div v-if="hymnal && number" class="opening-number">{{ number }}</div>
    <div class="opening-frame" aria-hidden="true">
      <svg viewBox="0 0 124 124">
        <path d="M123 19 V1 H1 V123 H123 V105" pathLength="402" />
      </svg>
    </div>
    <div class="opening-title" :style="{ fontSize: `${titleSize}px` }">
      <span class="opening-title-copy" v-html="title" />
    </div>
  </div>
</template>

<script lang="ts">
import logo from "@/assets/images/hymnal-opening-logo.png";

export default {
  name: "SongOpening",
  props: {
    title: String,
    number: [Number, String],
    album: String,
    hymnal: Boolean,
    paused: Boolean,
  },
  data: () => ({ logo, height: 0, width: 0, observer: null, fontReady: false }),
  computed: {
    openingStyle() {
      return {
        "--opening-unit": `${this.height / 100}px`,
        "--small-logo-width": `${this.height * .061 * 392 / 650}px`,
        "--logo": `url(${this.logo})`,
        "--opening-play-state": this.paused ? "paused" : "running",
      };
    },
    titleSize() {
      // Fit using the embedded font, including the final 1.285 enlargement.
      void this.fontReady;
      const size = this.height * .1265;
      if (!size || !this.width) return 0;
      const text = (this.title || "").replace(/<[^>]*>/g, "");
      const context = document.createElement("canvas").getContext("2d");
      context.font = `700 ${size}px "OpeningBebas"`;
      const measured = context.measureText(text).width + text.length * size * .07;
      return size * Math.min(1, this.width * .76 / Math.max(measured * .9635 * 1.285, 1));
    },
  },
  mounted() {
    this.observer = new ResizeObserver(([entry]) => {
      this.height = entry.contentRect.height;
      this.width = entry.contentRect.width;
    });
    this.observer.observe(this.$el);
    document.fonts.load('700 72px "OpeningBebas"').then(() => {
      this.fontReady = true;
    });
  },
  beforeUnmount() {
    this.observer?.disconnect();
  },
};
</script>

<style scoped>
@font-face {
  font-family: "OpeningBebas";
  src: url("../assets/fonts/BebasNeue-Bold.ttf") format("truetype");
  font-weight: 700;
  font-display: block;
}
@font-face {
  font-family: "OpeningBebas";
  src: url("../assets/fonts/BebasNeue-Book.ttf") format("truetype");
  font-weight: 300;
  font-display: block;
}
.song-opening {
  position: absolute;
  inset: 0;
  overflow: hidden;
  color: #fff;
  font-family: "OpeningBebas", sans-serif;
  text-transform: uppercase;
  pointer-events: none;
}
.opening-heading {
  position: absolute;
  top: 12%;
  left: 10.2%;
  right: 5%;
  height: 6.1%;
  display: flex;
  align-items: center;
  gap: calc(var(--opening-unit) * 2.42);
  font-size: calc(var(--opening-unit) * 5.4);
  line-height: 1;
  letter-spacing: .06em;
  animation: opening-heading 11s linear both;
}
.opening-heading-copy { font-weight: 300; transform: translateY(calc(var(--opening-unit) * 1.34)) scaleX(1.058); transform-origin: left center; }
.opening-logo {
  display: block;
  background: #fff;
  mask-image: var(--logo);
  mask-mode: alpha;
  mask-repeat: no-repeat;
  /* Use the supplied PNG unchanged; its artwork occupies x=102..494, y=98..748. */
  mask-size: 152.040816% 129.538462%;
  mask-position: 50% 51.041667%;
}
.opening-logo-small { width: var(--small-logo-width); height: 100%; flex-shrink: 0; }
.opening-logo-large {
  position: absolute;
  left: 41%;
  top: 8%;
  width: 70%;
  aspect-ratio: 392 / 650;
  animation: opening-logo 11s linear both;
}
.opening-number {
  position: absolute;
  left: 5.1%;
  top: 53.2%;
  transform: translateY(-50%);
  font-size: calc(var(--opening-unit) * 9.75);
  line-height: 1;
  letter-spacing: .057em;
  font-weight: 700;
  animation: opening-number 11s linear both;
}
.opening-frame {
  position: absolute;
  left: 13.75%;
  top: 51.9%;
  width: 12.9%;
  height: 22.9%;
  transform-origin: right center;
  animation: opening-frame-motion 11s linear both;
}
.opening-frame svg { display: block; width: 100%; height: 100%; overflow: visible; }
.opening-frame path { fill: none; stroke: #fff; stroke-width: 2; stroke-dasharray: 402; animation: opening-draw 11s linear both; }
.opening-title {
  position: absolute;
  left: 17.8%;
  top: 52.85%;
  width: max-content;
  line-height: 1.05;
  letter-spacing: .07em;
  font-weight: 700;
  white-space: nowrap;
  transform-origin: left center;
  animation: opening-title-motion 11s linear both;
}
.opening-title-copy { display: block; animation: opening-title-entry 11s linear both; }
.song-opening * { animation-play-state: var(--opening-play-state); }
@keyframes opening-heading {
  0%, 7.273% { opacity: 0; transform: translateY(calc(var(--opening-unit) * 8)); }
  14.545%, 65% { opacity: 1; transform: translateY(0); }
  70.455%, 100% { opacity: 0; transform: translateY(0); }
}
@keyframes opening-draw {
  0%, 23.636% { stroke-dashoffset: 402; }
  27.273% { stroke-dashoffset: 240; }
  36.364% { stroke-dashoffset: 6; }
  39.091%, 100% { stroke-dashoffset: 0; }
}
@keyframes opening-number {
  0%, 25% { opacity: 0; }
  33.182%, 66.364% { opacity: 1; }
  72.727%, 100% { opacity: 0; }
}
@keyframes opening-title-entry {
  0%, 30.455% { opacity: 0; }
  39.091%, 100% { opacity: 1; }
}
@keyframes opening-logo {
  0%, 29.091% { opacity: 0; }
  40.909%, 65.909% { opacity: .25; }
  76.364%, 100% { opacity: 0; }
}
@keyframes opening-frame-motion {
  0%, 68.182% { opacity: 1; transform: translateY(-50%) scale(1); }
  72.727% { opacity: 1; transform: translateY(-50%) scale(1.08); }
  77.273% { opacity: 1; transform: translateY(-50%) scale(1.15); }
  81.818%, 86.364% { opacity: 1; transform: translateY(-50%) scale(1.165); }
  95.455%, 100% { opacity: 0; transform: translateY(-50%) scale(1.165); }
}
@keyframes opening-title-motion {
  0%, 68.182% { opacity: 1; left: 17.8%; top: 52.85%; transform: translateY(-50%) scale(.9635, 1); }
  72.727% { opacity: 1; left: 17.87%; top: 52.885%; transform: translateY(-50%) scale(1.05985, 1.1); }
  77.273% { opacity: 1; left: 18.0%; top: 52.945%; transform: translateY(-50%) scale(1.22943, 1.276); }
  81.818%, 86.364% { opacity: 1; left: 18.01%; top: 52.95%; transform: translateY(-50%) scale(1.2380975, 1.285); }
  95.455%, 100% { opacity: 0; left: 18.01%; top: 52.95%; transform: translateY(-50%) scale(1.2380975, 1.285); }
}
@media (prefers-reduced-motion: reduce) {
  .song-opening * { animation: none; }
  .opening-logo-large { opacity: .25; }
  .opening-frame { transform: translateY(-50%); }
  .opening-title { transform: translateY(-50%) scaleX(.9635); }
  .opening-frame path { stroke-dashoffset: 0; }
}
</style>
