import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // The app uses client-side routing, so any unknown path has to serve the
  // shell and let the router resolve it. Without this a refresh on /triage 404s.
  appType: "spa",
  // Expose the Neon read-only URL to the browser; Neon's serverless driver
  // (WASM pooler) authenticates with it and no other server credentials.
  envPrefix: ["VITE_", "DATABASE_URL", "NEON_STORAGE_ENDPOINT"],
  server: {
    port: 5174,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/tests/setup.ts",
  },
});
