# Neko Carousel MCP サーバー（Node）

このサーバーは公式 Model Context Protocol (MCP) TypeScript SDK を利用して `cat-carousel` ツールをまとめています。`neko-widget-dev/build-all.mts` スクリプトで生成されたインライン HTML スニペットを読み込み、Apps SDK がアシスタント応答の横にカルーセルを描画できるようにします。

## 前提条件

- Node.js 18 以上
- pnpm（ほかのパッケージマネージャーを使う場合は読み替えてください）

## 依存関係のインストール

```bash
pnpm install
```

このディレクトリで実行すると、サーバーに必要な依存関係のみが入ります。

## サーバーの起動

```bash
pnpm start
```

サーバーは `http://localhost:8000` で待ち受け、`/mcp` に SSE エンドポイントを公開します。起動前に `neko-widget-dev` ディレクトリで `pnpm run build` を実行し、`neko-widget-dev/assets/cat-carousel.snippet.html` を生成しておいてください。

## ツールの動作

- **cat-carousel**  
  - 入力は不要で、プレーンテキストを返し、`_meta.openai/outputTemplate` で `ui://widget/cat-carousel.html` を指します。
  - ビルドステップで生成されたカルーセル HTML を応答に埋め込みます。

追加のウィジェットバンドルを生成したら `src/server.ts` を編集し、ツールやデータ連携を拡張してください。
