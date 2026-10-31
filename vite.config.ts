import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => ({
  base: mode === "demo" ? "/Dare-me/" : "/",
  build: { outDir: mode === "demo" ? "dist-demo" : "dist" },
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: { "/api": { target: "http://127.0.0.1:3001", changeOrigin: false } },
  },
}));
