import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  base: "/SkiWatch/",
  plugins: [
    react(),
    // PWA: makes SkiWatch installable + caches the static shell so the
    // app boots offline. Critical for "skier on the chairlift with bad
    // cellular" — the cached last-seen webcam thumbnails + weather
    // snapshot are still visible when the network drops.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt"],
      manifest: {
        name: "SkiWatch",
        short_name: "SkiWatch",
        description: "Live webcams + glance weather for KR/JP/CH/CA ski resorts.",
        theme_color: "#0f172a",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/SkiWatch/",
        scope: "/SkiWatch/",
        icons: [
          // The repo only ships a favicon today; using it as the PWA
          // icon is suboptimal (low res) but unblocks "Add to Home
          // Screen" until proper 192/512 icons land.
          { src: "favicon.ico", sizes: "64x64", type: "image/x-icon" },
        ],
      },
      workbox: {
        // Precache the static shell. Lazy-loaded chunks are picked up
        // automatically by globPatterns.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        // Avoid caching weather API and webcam streams — those need to
        // be fresh, and HLS .ts segments would blow the cache budget.
        runtimeCaching: [
          {
            // Cache open-ski-data registry reads (resort list, slug
            // metadata). These change at most once per release.
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/powder-nomad\/open-ski-data\/.*/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "open-ski-data",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Ridgecast weather endpoints — let the SW serve the
            // last-good snapshot if the network is flaky, but try a
            // fresh fetch in the background so the next page render
            // is current.
            urlPattern: /^https:\/\/api\.pk3d\.dev\/ridgecast\/v1\/.*/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "ridgecast",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 10 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // HLS playlists (.m3u8) — small but re-fetched constantly.
            // Caching the manifest with NetworkFirst means: on a flaky
            // mobile connection, the player still has a manifest to
            // start from, then refreshes in the background. .ts
            // segments are intentionally NOT cached (too big for the
            // SW budget and they expire fast anyway).
            urlPattern: /\.m3u8(\?.*)?$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "hls-manifests",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    // Per-route chunks come for free from React.lazy in App.tsx. These
    // manual chunks isolate the heavyweight libraries that only one
    // route needs, so users who never visit /webcams or /slopes never
    // download the video / table runtimes.
    rollupOptions: {
      output: {
        manualChunks: {
          // HLS video stack (Webcam page)
          video: ["hls.js", "video.js"],
          // Drag-and-drop multiview grid (Webcam page)
          dnd: [
            "@dnd-kit/core",
            "@dnd-kit/modifiers",
            "@dnd-kit/sortable",
            "@dnd-kit/utilities",
          ],
          // Tabular data (Slopes page)
          tables: ["@tanstack/react-table"],
        },
      },
    },
  },
});
