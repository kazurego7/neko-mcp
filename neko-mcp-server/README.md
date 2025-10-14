# neko-mcp-server

Cloudflare Workers 上で動作する Model Context Protocol (MCP) サーバーです。`neko-widget-dev/` がビルドした猫カルーセルを `cat-carousel` ツールとして返し、The Cat API の画像で「猫の乱入」を演出する `cat-interrupt` ツールも提供します。

## 概要
- Workers Runtime と `agents/mcp` を組み合わせたリモート MCP サーバー。
- Durable Object `MyMCP` が SSE エンドポイント（`/sse`）と HTTP エンドポイント（`/mcp`）を配信。
- neko-mcp プロジェクトの Apps SDK 体験に猫の UI を差し込むバックエンド役。

## 必要環境
- Node.js 18 以上
- pnpm
- Cloudflare アカウントと Wrangler CLI（`pnpm dlx wrangler --version` で確認）
- 任意: The Cat API の API キー（高頻度アクセス時）。`wrangler secret put THE_CAT_API_KEY` で登録できます。

## セットアップ
依存関係をインストールします。

```bash
pnpm install
```

> `cat-carousel` ツールで使用する HTML は `../neko-widget-dev/` のビルド結果です。ウィジェットを更新したら `pnpm run build` を実行し、このサーバーを再起動してください。

## ローカル開発
- `pnpm start`（= `wrangler dev`）でローカル Worker を起動します。デフォルトでは `http://localhost:8787` が利用可能です。
- MCP クライアントからは `http://localhost:8787/sse` を指定します。`mcp-remote` を使えば Claude Desktop や Apps SDK から接続できます。
- `pnpm run type-check` や `pnpm run lint:fix` で型チェック／整形を実行できます。

## 提供中のツールとリソース
- `cat-carousel`  
  - 返却内容: `assets/cat-carousel.snippet.html` をインライン化した HTML。  
  - 役割: Apps SDK の `ui://widget/cat-carousel.html` として埋め込み表示。  
  - 更新手順: `neko-widget-dev` 側でビルド → このサーバーを再起動。
- `cat-interrupt`  
  - 返却内容: ランダムな猫画像 URL と、次の回答で猫が割り込む演出を促すテキスト。  
  - カスタマイズ: The Cat API のレスポンス利用。API キーを設定する場合は `fetch` のヘッダーに追加してください。

## デプロイ
1. `pnpm dlx wrangler login` で Cloudflare にログインします。
2. `pnpm run deploy` を実行すると、`https://<your-account>.workers.dev/sse` のようなエンドポイントが発行されます。独自ドメインを使う場合は Cloudflare 側でルートを設定してください。

## MCP クライアントからの接続例
- **Cloudflare AI Playground**  
  `https://playground.ai.cloudflare.com/` にアクセスし、`Server URL` に `/sse` エンドポイントを入力します。
- **Claude Desktop**  
  `Settings > Developer > Edit Config` を開き、以下のように `mcp-remote` 経由で登録します。

```json
{
  "mcpServers": {
    "neko": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8787/sse"]
    }
  }
}
```

## カスタマイズのヒント
- 追加ツールは `src/index.ts` の `MyMCP.init()` 内で `this.server.tool(...)` を呼び出して登録します。
- 新しいウィジェットを追加する場合は `catWidgets` 配列にエントリを増やし、`../neko-widget-dev/` で対応するスニペット生成フローを用意すると管理しやすくなります。
- Biome でのコード整形 (`pnpm run format`) や TypeScript の型検証 (`pnpm run type-check`) を CI フックに組み込むと安定した開発運用が可能です。
