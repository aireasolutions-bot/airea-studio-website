import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * In production, rewrite absolute `/assets/...` media URLs to the Cloudflare R2
 * public base so images/videos are served from R2's CDN. Built JS/CSS live under
 * `/build/` (see assetsDir) so they are NOT rewritten and stay on Vercel.
 * If VITE_ASSETS_BASE_URL is empty, assets are served locally from /public/assets.
 */
function r2Assets(base?: string): Plugin | false {
  const root = (base ?? "").replace(/\/+$/, "");
  if (!root) return false;
  const rewrite = (s: string) => s.split("/assets/").join(`${root}/assets/`);
  return {
    name: "r2-assets",
    apply: "build",
    enforce: "post",
    generateBundle(_opts, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === "chunk") {
          file.code = rewrite(file.code);
        } else if (
          file.type === "asset" &&
          file.fileName.endsWith(".css") &&
          typeof file.source === "string"
        ) {
          file.source = rewrite(file.source);
        }
      }
    },
    transformIndexHtml(html) {
      return rewrite(html);
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const base =
    process.env.VITE_ASSETS_BASE_URL ||
    loadEnv(mode, process.cwd(), "VITE_").VITE_ASSETS_BASE_URL ||
    "";

  return {
    plugins: [react(), r2Assets(base)].filter(Boolean) as Plugin[],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    build: {
      // keep media under /assets (rewritten to R2) and code under /build (stays on Vercel)
      assetsDir: "build",
    },
    server: {
      host: true,
      port: 5173,
      // Mirror the production /brandfonts proxy (see vercel.json) so custom
      // brand fonts also load in local dev without CORS.
      proxy: base
        ? { "/brandfonts": { target: `${base.replace(/\/+$/, "")}/assets/fonts`, changeOrigin: true, rewrite: (p) => p.replace(/^\/brandfonts/, "") } }
        : undefined,
    },
  };
});
