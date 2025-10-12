# Apps SDK 最小サンプル

OpenAI Apps SDK でカスタム UI ウィジェットを作るための最小構成です。  
React + Vite を使ったシンプルなセットアップで、ここから MCP や猫ウィジェットの実装を加えていけます。

## 必要環境
- Node.js 18 以上
- npm (推奨)  
  ※ pnpm や yarn でも動作しますが、このサンプルでは npm を利用しています。

## セットアップ
```bash
cd prototype
npm install
```

## 開発サーバー
```bash
npm run dev
```
Vite の開発サーバーが起動します。ログに表示されるローカル URL をブラウザで開くと、サンプル画面を確認できます。

## ビルド
```bash
npm run build
```
`dist/` に本番ビルド成果物が生成されます。Apps SDK へ組み込む際は、この成果物を MCP サーバーなどから配信します。

## CatAPI を利用した猫ギャラリー
`猫ギャラリーを表示` ボタンで [The Cat API](https://thecatapi.com/) から画像を取得し、ChatGPT の Apps SDK で利用できるインラインカルーセル形式の UI を描画します。品種名・性格・出典リンク (Wikipedia) などの付加情報をカードに簡潔にまとめており、カルーセル末尾までスクロールすると追加の猫画像を自動で取得します。

### API キーの設定
リクエスト回数を安定させるため、API キーを取得して環境変数に設定してください。

1. The Cat API で API キーを発行する
2. プロジェクト直下に `.env.local` を作成し、以下を記入
   ```bash
   VITE_CAT_API_KEY=取得したキーをここに書く
   ```
3. `npm run dev` を再起動する

※ API キーを設定しない場合でも動作しますが、厳しいレート制限が掛かります。

### コード構成
- `src/App.tsx`: 画面本体。CatAPI 呼び出しとインラインギャラリーの状態管理を担当。
- `src/api/catApi.ts`: CatAPI からのレスポンスをフェッチして整形するユーティリティ。
- `src/components/CatGalleryCarousel.tsx`: 猫画像を横スクロールで表示するカルーセルコンポーネント。
- `src/index.css`: ボタンやカルーセルのスタイル定義。

## 今後の拡張のヒント
- `_meta.openai/outputTemplate` を返す MCP サーバーを別ディレクトリで用意し、このビルド成果物を参照させる。
- 会話の文脈に応じて取得する画像の数や品種を調整するロジックを MCP 側へ追加する。
- テスト対象が増えてきたら、`vitest` などを追加して UI / API 呼び出しの振る舞いを検証する。
