import { defineConfig } from "vite";
import { readFileSync } from "node:fs";

import { classifyProductionChunk } from "./src/game/presentation/performance.ts";

const packageVersion = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageVersion.version),
    __BUILD_SHA__: JSON.stringify(process.env.VITE_BUILD_SHA ?? ""),
  },
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
