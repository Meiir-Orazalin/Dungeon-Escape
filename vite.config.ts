import { defineConfig } from "vite";

import { classifyProductionChunk } from "./src/game/presentation/performance.ts";

export default defineConfig({
  base: "/",
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1_500,
    rollupOptions: {
      output: {
        manualChunks: classifyProductionChunk,
      },
    },
  },
});
