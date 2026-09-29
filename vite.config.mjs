import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";
import fs from "node:fs";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load app-level env vars to node-level env vars.
  const env = loadEnv(mode, process.cwd(), '');
  const enablePwa = mode === "chromeos" || env.VITE_ENABLE_PWA === "true";
  const base = env.VITE_BASE_URL ?? "/";
  const mediaBase = (env.VITE_URL_FILES || "https://api.louvorja.com.br/file").replace(/\/$/, "");
  const libraryDir = path.resolve("tmp/chromeos-library");
  const library = mode === "chromeos" ? JSON.parse(fs.readFileSync(path.join(libraryDir, "manifest.json"), "utf8")) : null;

  return {
    base: env.VITE_BASE_URL ?? "/",
    plugins: [
      library && {
        name: "bundled-web-library",
        generateBundle() {
          for (const bucket of library.buckets) {
            this.emitFile({ type: "asset", fileName: `library/${library.version}/${bucket}.json`, source: fs.readFileSync(path.join(libraryDir, `${bucket}.json`)) });
          }
        },
      },
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag === "webview",
          },
        },
      }),
      // https://github.com/vuetifyjs/vuetify-loader/tree/next/packages/vite-plugin
      vuetify({
        autoImport: true,
      }),
      VitePWA({
        disable: !enablePwa,
        registerType: "prompt",
        devOptions: {
          enabled: false,
        },
        workbox: {
          globPatterns: ["**/*.{html,js,mjs,css,svg,png,jpg,jpeg,webp,woff,woff2,ttf,ico}", "library/**/*.json"],
          maximumFileSizeToCacheInBytes: 32 * 1024 * 1024,
          navigateFallback: `${base}index.html`,
          runtimeCaching: [{
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.includes("/user-files/"),
            handler: "CacheOnly",
            options: { cacheName: "iasdpresenter-user-files-v1", rangeRequests: true },
          }, {
            // Full responses downloaded by WebMedia are reused for seeking.
            urlPattern: new RegExp(`^${mediaBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/`),
            handler: "CacheFirst",
            options: {
              cacheName: "iasdpresenter-media-v1",
              cacheableResponse: { statuses: [200] },
              rangeRequests: true,
            },
          }],
        },
        manifest: {
          name: "IASDPresenter",
          short_name: "IASDPresenter",
          id: base,
          scope: base,
          lang: "pt-BR",
          description: "Software de músicas para Louvor e Adoração",
          start_url: env.VITE_BASE_URL ?? "/",
          display: "standalone",
          background_color: "#000000",
          theme_color: "#000000",
          icons: [
            { src: `${base}ico/pwa-192.png`, sizes: "192x192", type: "image/png" },
            { src: `${base}ico/pwa-512.png`, sizes: "512x512", type: "image/png" },
            {
              src: (env.VITE_BASE_URL ?? "/") + "ico/favicon-16x16.png",
              sizes: "16x16",
              type: "image/png",
            },
            {
              src: (env.VITE_BASE_URL ?? "/") + "ico/favicon-32x32.png",
              sizes: "32x32",
              type: "image/png",
            },
            {
              src: (env.VITE_BASE_URL ?? "/") + "ico/favicon-144x144.png",
              sizes: "144x144",
              type: "image/png",
            },
            {
              src: (env.VITE_BASE_URL ?? "/") + "ico/favicon-152x152.png",
              sizes: "152x152",
              type: "image/png",
            },
            {
              src: (env.VITE_BASE_URL ?? "/") + "ico/favicon-180x180.png",
              sizes: "180x180",
              type: "image/png",
            },
          ],
        },
      }),
    ].filter(Boolean),
    define: {
      __PWA_ENABLED__: JSON.stringify(enablePwa),
      __BUNDLED_LIBRARY_VERSION__: JSON.stringify(library?.version || ""),
      "process.env": {},
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "true",
    },
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ["legacy-js-api"],
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            vue: ["vue", "vue-router", "vuex", "vue-i18n"],
            vuetify: ["vuetify"],
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});
