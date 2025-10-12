import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

function resolveBase(rawValue?: string) {
  const raw = rawValue?.trim();
  if (!raw) {
    return "/";
  }

  const withoutTrailingSlash = raw.replace(/\/+$/, "");
  return `${withoutTrailingSlash}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    base: resolveBase(env.WIDGET_ASSET_BASE),
    build: {
      outDir: "../mcp-server/public",
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        input: {
          "cat-gallery": resolve(__dirname, "widget/cat-gallery.html")
        }
      }
    }
  };
});
