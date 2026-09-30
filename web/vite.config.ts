import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// WebZjs runs its sync on a wasm thread pool, which needs SharedArrayBuffer, which needs cross-origin isolation.
const isolation = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, headers: isolation },
  preview: { port: 4173, headers: isolation },
  worker: { format: "es" },
  optimizeDeps: {
    exclude: ["@zcashcommunitygrants/webzjs-wallet"],
  },
  build: { target: "es2022" },
});
