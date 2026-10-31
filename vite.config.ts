import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";

// Precache the actual hashed build, so the first completed installation is usable offline.
function offlineShell(): Plugin {
  return {
    name: "dareme-offline-shell",
    generateBundle(_options, bundle) {
      const publicAssets = [
        "manifest.webmanifest",
        "favicon.svg",
        ...["icons", "images", "fonts"].flatMap((directory) =>
          readdirSync(new URL(`./public/${directory}/`, import.meta.url))
            .filter((file) => /\.(png|svg|jpg|webp|ttf)$/.test(file))
            .map((file) => `${directory}/${file}`),
        ),
      ];
      const assets = ["./", ...Object.keys(bundle), ...publicAssets].sort();
      const version = createHash("sha256");
      version.update(JSON.stringify(assets));
      version.update(readFileSync(new URL("./index.html", import.meta.url)));
      version.update(readFileSync(new URL("./public/sw.js", import.meta.url)));
      for (const file of publicAssets)
        version.update(
          readFileSync(new URL(`./public/${file}`, import.meta.url)),
        );
      const build = version.digest("hex").slice(0, 12);
      const template = readFileSync(
        new URL("./public/sw.js", import.meta.url),
        "utf8",
      );
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: template
          .replace('"__DAREME_BUILD__"', JSON.stringify(build))
          .replace("/*__DAREME_ASSETS__*/ []", JSON.stringify(assets)),
      });
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ build }),
      });
    },
  };
}
export default defineConfig(({ mode }) => ({
  base: mode === "demo" ? "/Dare-me/" : "/",
  build: { outDir: mode === "demo" ? "dist-demo" : "dist" },
  plugins: [react(), offlineShell()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: { "/api": { target: "http://127.0.0.1:3001", changeOrigin: false } },
  },
}));
