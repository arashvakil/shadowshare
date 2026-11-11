import { defineConfig } from "vite";

export default defineConfig({
  root: "webapp",
  base: "/app/",
  build: {
    outDir: "../dist/webapp",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // Dev: forward API calls to the Hono server (npm run dev on :3101)
    proxy: {
      "/api": "http://localhost:3101",
    },
  },
});
