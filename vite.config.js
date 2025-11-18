import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "",
  publicDir: "public",
  plugins: [
    svelte(),
    VitePWA({
      injectRegister: false,
      registerType: "autoUpdate",
      workbox: false,
      devOptions: {
        enabled: false, // No dev SW
      },
      manifest: {
        short_name: "Svatom",
        name: "Svatom",
        description:
          "Experiment of applying  the CALMM.js architecture to Svelte",
        icons: [
          {
            src: `./favicon.png`,
            sizes: "256x256",
            type: "image/png",
          },
          {
            src: `./favicon.svg`,
            sizes: "207x207",
            type: "image/svg+xml",
          },
        ],
        start_url: "/svatom/",
        scope: "/svatom/",
        display: "standalone",
        theme_color: "#ff3e00",
        background_color: "#fff",
        shortcuts: [],
      },
    }),
  ],
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
  },
});
