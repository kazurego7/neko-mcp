# Neko MCP Apps

`neko-mcp-apps` は、猫の情報を表示するウィジェットと対応する Node MCP サーバーをまとめた小さなワークスペースです。Apps SDK の最小構成を猫テーマで試せるよう、CatAPI から取得したデータをカルーセルで表示します。

## Repository structure

- `src/cat-carousel/` – React ウィジェット本体。CatAPI からデータを取得してカルーセルを描画します。
- `assets/` – `pnpm run build` を実行すると生成されるバンドルと HTML スニペット。
- `neko-mcp-server-node/` – MCP サーバー。ウィジェットのスニペットをツールとして公開します。
- `build-all.mts` – ウィジェットをバンドルしてインライン HTML を出力するユーティリティスクリプト。

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

`assets/` ディレクトリに `cat-carousel.css`、`cat-carousel.js`、`cat-carousel.snippet.html` が生成されます。  
MCP サーバーはこのスニペットを直接読み込むため、静的サーバーは必須ではありません。

## Develop locally

To iterate on the carousel widget with hot reload:

```bash
pnpm run dev
```

Vite は `http://localhost:4444/cat-carousel.html` を配信します。

## Run the MCP server

From the server directory:

```bash
cd neko-mcp-server-node
pnpm start
```

サーバーは単一のツール (`cat-carousel`) を公開し、ビルド済みスニペットを返します。起動前に必ずビルドを済ませてください。

## Next steps

- `src/cat-carousel/index.jsx` を編集して UI や取得件数を調整する。
- `neko-mcp-server-node/src/server.ts` を改造してツールやメタデータを拡張する。
- 新しいウィジェットを追加したい場合は `src/` 以下にエントリを増やし、`build-all.mts` の `TARGET_ENTRIES` を更新する。
