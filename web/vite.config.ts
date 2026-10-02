import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// WebZjs runs its sync on a wasm thread pool, which needs SharedArrayBuffer, which needs cross-origin isolation.
// Only the issue page runs WebZjs. Every other page stays unisolated so wallet popups (Tempo Wallet) can talk back to it.
const isolateIssuePage = {
  name: "isolate-issue-page",
  configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: { setHeader: (k: string, v: string) => void }, next: () => void) => void) => void } }) {
    server.middlewares.use((req, res, next) => {
      if (req.url === "/new" || req.url?.startsWith("/new?")) {
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
      }
      next();
    });
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), isolateIssuePage],
  server: { port: 5173 },
  preview: { port: 4173 },
  worker: { format: "es" },
  optimizeDeps: {
    exclude: ["@zcashcommunitygrants/webzjs-wallet", "zcash-delivery-proof-wasm"],
  },
  build: { target: "es2022" },
});
