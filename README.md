# neko-mcp

OpenAI Apps SDK と Model Context Protocol (MCP) を組み合わせて、「真面目な会話の横で猫がひょっこり現れる」体験を試作するプロジェクトです。ウィジェット開発用のフロントエンド (`neko-widget-dev/`) と、猫ウィジェットを MCP ツールとして公開する Cloudflare Workers ベースのサーバー (`neko-mcp-server/`) で構成されています。

## プロジェクトビジョン
- AI とユーザーの対話に、猫が鳴き声や仕草だけで割り込み、空気を少し和ませる演出を取り入れる。
- 会話の休憩タイミングで猫画像ギャラリーを表示するなど、軽いインタラクションを試す。

より詳細なアイデアメモは `doc/neko-mcp構想メモ.md` を参照してください。

## リポジトリ構成
- `neko-widget-dev/` – 猫カルーセルなどのウィジェットを開発・ビルドする Vite + React プロジェクト。
- `neko-mcp-server/` – Cloudflare Workers 上で動作する MCP サーバー。ビルド済みウィジェットを `cat-carousel` ツールとして配信。
- `doc/` – プロジェクトの構想メモなど、補足ドキュメント。

## 必要条件
- Node.js 18 以上
- pnpm
- Cloudflare Workers 用の Wrangler（MCP サーバーをローカル起動・デプロイする場合）

## セットアップ
1. ウィジェット開発環境の依存関係をインストールします。
   ```bash
   cd neko-widget-dev
   pnpm install
   ```
2. MCP サーバー側の依存関係もインストールします。
   ```bash
   cd ../neko-mcp-server
   pnpm install
   ```

## ウィジェット開発フロー (`neko-widget-dev/`)
- ビルド: `pnpm run build`  
  `assets/` に `cat-carousel.css`、`cat-carousel.js`、`cat-carousel.snippet.html` が生成され、MCP サーバーがこのスニペットを配信します。
- 開発サーバー: `pnpm run dev`  
  Vite がホットリロード付きで `http://localhost:4444/cat-carousel.html` を提供します。
- 追加資料: `assets/cat-carousel.snippet.html` に、Apps SDK へ組み込むための HTML スニペット例があります。

## MCP サーバーフロー (`neko-mcp-server/`)
- ローカル起動: `pnpm start`（Cloudflare Wrangler の `dev` モードを使用）
- ツール: `cat-carousel` がビルド済みスニペットを返却します。起動前にウィジェットをビルドしてください。
- デプロイ: Cloudflare Workers にデプロイする場合は `pnpm run deploy` を使用します。`README.md` には Cloudflare AI Playground や Claude Desktop から接続する手順がまとまっています。
