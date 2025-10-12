import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
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
});
