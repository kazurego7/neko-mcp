# Cat Gallery MCP Server

OpenAI Apps SDK / MCP 用の簡易サーバーです。`show_cat_gallery` ツールを公開し、The Cat API から猫画像を取得します。現状はテキストと構造化データを返すところまでで、Apps SDK のウィジェット連携は今後拡張予定です。

## セットアップ

```bash
cd prototype/mcp-server
npm install
```

Cat API の無料キーを取得済みの場合は `.env` もしくはシェルで環境変数を設定します。

```bash
export CAT_API_KEY=your_key_here
```

キーを設定しない場合でも動作しますが、レート制限が厳しくなります。

## 起動

```bash
# フロントウィジェット資産を書き出していない場合は先に実行
npm --prefix ../prototype run build:widget

npm run dev
```

デフォルトでは `http://localhost:8000` で SSE ストリームを公開します。

- SSE: `GET  /mcp`
- メッセージ POST: `POST /mcp/messages?sessionId=...`
- ヘルスチェック: `GET  /health`
- ウィジェット HTML: `GET /widget/cat-gallery.html`
- ウィジェット資産: `GET /assets/...`

### ChatGPT から利用する場合（ngrok 経由）

ChatGPT の Developers モードでローカル MCP サーバーを登録する際は、`ngrok` などでトンネルを開くと手軽です。

1. **ngrok のインストール**（未導入の場合）
   ```bash
   brew install ngrok   # macOS
   # or
   curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
   echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
   sudo apt update && sudo apt install ngrok
   ```
2. **MCP サーバー起動**
   ```bash
   npm run dev
   ```
3. **別ターミナルでトンネルを開始**
   ```bash
   ngrok http 8000
   ```
   表示された `https://xxxxx.ngrok-free.app` を控えておきます。
4. **ChatGPT Developers モードでコネクタ追加**
   - `GET` エンドポイントを `https://xxxxx.ngrok-free.app/mcp`
   - `POST` エンドポイントを `https://xxxxx.ngrok-free.app/mcp/messages`
   として設定し、`sessionId` は Apps SDK 側で付与される値を利用します。

公開環境に接続する場合は、認証やレート制限を別途検討してください。

## ツール

- `show_cat_gallery`
  - 引数: `limit` (1〜12, 省略時 8)
  - レスポンス: 猫ギャラリーのテキスト要約と `photos` 配列 (`id`, `url`, `alt`, `breedName` など)

Apps SDK 向けの outputTemplate として `ui://widget/cat-gallery.html` を返します。`prototype` 側で `npm run build:widget` を実行すると生成される React カルーセル資産が読み込まれ、`structuredContent.photos` を props として受け取ります。

## 今後の拡張

- Apps SDK の outputTemplate を追加し、`prototype/src` のカルーセル ウィジェットを組み込む。
- 取得した猫データのキャッシュやフィルタリング、ユーザー指定のムードに応じたソートなど。
- ログ基盤を接続し、猫の呼び出し頻度やユーザー反応を分析する。
