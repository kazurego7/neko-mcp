# Apps SDK 最小サンプル

OpenAI Apps SDK でカスタム UI ウィジェットを作るための最小構成です。  
React + Vite を使ったシンプルなセットアップで、ここから MCP や猫ウィジェットの実装を加えていけます。

## 必要環境
- Node.js 18 以上
- npm (推奨)  
  ※ pnpm や yarn でも動作しますが、このサンプルでは npm を利用しています。

## セットアップ
```bash
cd prototype/apps-sdk-sample
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

## 今後の拡張のヒント
- `src/App.tsx` に猫の UI コンポーネントを追加し、Apps SDK のウィジェット出力に対応させる。
- `_meta.openai/outputTemplate` を返す MCP サーバーを別ディレクトリで用意し、このビルド成果物を参照させる。
- テスト対象が増えてきたら、`vitest` などを追加して UI の振る舞いを検証する。
