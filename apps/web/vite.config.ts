import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@calendar/shared": resolve(rootDir, "../../packages/shared/src/index.ts")
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
