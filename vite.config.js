import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
export default defineConfig({
    base: "/SkiWatch/",
    plugins: [react()],
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
