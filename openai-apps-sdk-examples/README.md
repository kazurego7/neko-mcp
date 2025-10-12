# Pizzaz Carousel Example

This repository is a pared-down version of the original Apps SDK examples. It keeps only the **pizzaz carousel** widget and the matching **Node MCP server** so you can start from a minimal, working baseline.

## Repository structure

- `src/pizzaz-carousel/` – React widget entry point and supporting assets.
- `assets/` – Generated bundles after running the build script.
- `pizzaz_server_node/` – MCP server that exposes the carousel widget.
- `build-all.mts` – Utility script that bundles the widget and writes inline HTML snippets.

## Prerequisites

- Node.js 18+
- pnpm (or switch the commands to npm/yarn)

## Install dependencies

Install the workspace dependencies from the repository root:

```bash
pnpm install
```

## Build the widget assets

Generate the carousel bundles and inline HTML snippet:

```bash
pnpm run build
```

The script writes `pizzaz-carousel.css`, `pizzaz-carousel.js`, and `pizzaz-carousel.snippet.html` to the `assets/` directory.  
The MCP server reads the snippet directly, so a static file server is optional.

## Develop locally

To iterate on the carousel widget with hot reload:

```bash
pnpm run dev
```

Vite serves the widget entry at `http://localhost:4444/pizzaz-carousel.html`.

## Run the MCP server

From the server directory:

```bash
cd pizzaz_server_node
pnpm start
```

The server exposes a single tool (`pizza-carousel`) that returns the inline HTML snippet produced by the build. Run the build step before starting the server so the assets are available.

## Next steps

- Customize the carousel data in `src/pizzaz-carousel/markers.json`.
- Adjust the MCP server behaviour in `pizzaz_server_node/src/server.ts`.
- Introduce additional widgets by adding new entries under `src/` and expanding the build script if needed.
