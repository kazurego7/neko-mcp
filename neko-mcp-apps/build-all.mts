import { build, type InlineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fg from "fast-glob";
import path from "node:path";
import fs from "node:fs";
import tailwindcss from "@tailwindcss/vite";

const ENTRY_GLOB = "src/**/index.{tsx,jsx}";
const TARGET_ENTRIES = new Set(["cat-carousel"]);
const OUT_DIR = "assets";

const PER_ENTRY_CSS_GLOB = "**/*.{css,pcss,scss,sass}";
const PER_ENTRY_CSS_IGNORE = ["**/*.module.*"];
const GLOBAL_CSS_LIST = [path.resolve("src/index.css")];

function wrapEntryPlugin(virtualId: string, entryFile: string, cssPaths: string[]): Plugin {
  return {
    name: `virtual-entry-wrapper:${entryFile}`,
    resolveId(id) {
      if (id === virtualId) return id;
      return null;
    },
    load(id) {
      if (id !== virtualId) return null;

      const cssImports = cssPaths.map((css) => `import ${JSON.stringify(css)};`).join("\n");

      return `
${cssImports}
export * from ${JSON.stringify(entryFile)};
import ${JSON.stringify(entryFile)};
`;
    },
  };
}

function ensureOutDir() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function buildEntry(entryPath: string) {
  const entryName = path.basename(path.dirname(entryPath));
  if (!TARGET_ENTRIES.has(entryName)) return;

  const entryAbs = path.resolve(entryPath);
  const entryDir = path.dirname(entryAbs);

  const perEntryCss = fg.sync(PER_ENTRY_CSS_GLOB, {
    cwd: entryDir,
    absolute: true,
    dot: false,
    ignore: PER_ENTRY_CSS_IGNORE,
  });

  const existingGlobalCss = GLOBAL_CSS_LIST.filter((p) => fs.existsSync(p));
  const cssToInclude = [...existingGlobalCss, ...perEntryCss].filter((p) => fs.existsSync(p));

  const virtualId = `\0virtual-entry:${entryAbs}`;

  const config: InlineConfig = {
    plugins: [
      wrapEntryPlugin(virtualId, entryAbs, cssToInclude),
      tailwindcss(),
      react(),
      {
        name: "remove-manual-chunks",
        outputOptions(options) {
          if ("manualChunks" in options) {
            delete (options as Record<string, unknown>).manualChunks;
          }
          return options;
        },
      },
    ],
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "react",
      target: "es2022",
    },
    build: {
      target: "es2022",
      outDir: OUT_DIR,
      emptyOutDir: false,
      chunkSizeWarningLimit: 2000,
      minify: "esbuild",
      cssCodeSplit: false,
      rollupOptions: {
        input: virtualId,
        output: {
          format: "es",
          entryFileNames: `${entryName}.js`,
          inlineDynamicImports: true,
          assetFileNames: `${entryName}[extname]`,
        },
        preserveEntrySignatures: "allow-extension",
        treeshake: true,
      },
    },
  };

  console.log(`Building ${entryName}`);
  await build(config);

  const cssPath = path.join(OUT_DIR, `${entryName}.css`);
  const jsPath = path.join(OUT_DIR, `${entryName}.js`);

  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";
  const js = fs.existsSync(jsPath) ? fs.readFileSync(jsPath, "utf8") : "";

  const snippetParts = [
    `<div id="${entryName}-root"></div>`,
    css ? `<style>\n${css}\n</style>` : "",
    js ? `<script type="module">\n${js}\n</script>` : "",
  ].filter(Boolean);

  const snippet = `${snippetParts.join("\n")}\n`;
  fs.writeFileSync(path.join(OUT_DIR, `${entryName}.snippet.html`), snippet, "utf8");

  const documentHtml = [
    "<!doctype html>",
    "<html>",
    "<head>",
    css ? `  <style>\n${css}\n  </style>` : "",
    "</head>",
    "<body>",
    `  <div id="${entryName}-root"></div>`,
    js ? `  <script type="module">\n${js}\n  </script>` : "",
    "</body>",
    "</html>",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");

  fs.writeFileSync(path.join(OUT_DIR, `${entryName}.html`), documentHtml, "utf8");
}

async function main() {
  ensureOutDir();
  const entries = fg.sync(ENTRY_GLOB, { dot: false });
  for (const entry of entries) {
    await buildEntry(entry);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
