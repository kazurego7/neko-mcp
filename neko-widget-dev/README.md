# Neko Widget Dev

`neko-widget-dev` は、neko-mcp プロジェクトにおける猫ウィジェット資産を開発・ビルドする Vite + React ワークスペースです。The Cat API の画像をカルーセル表示し、MCP サーバーが返す `cat-carousel` ウィジェット HTML を生成します。

## 概要
- Apps SDK で読み込めるカルーセルの HTML / CSS / JS をまとめてバンドル。
- ビルド成果物は `../neko-mcp-server/` が提供する MCP ツールから配信。
- 猫の乱入表現など追加 UI の実験を素早く行うための開発環境。

## 必要環境
- Node.js 18 以上
- pnpm（バージョンは `packageManager` フィールド参照）
- 任意: The Cat API の API キー（高頻度アクセスを行う場合）

## 初期セットアップ
依存関係をインストールします。

```bash
pnpm install
```

> 補足: ルート `README.md` の手順に従い、`../neko-mcp-server/` でも `pnpm install` を実行してください。

## 主なディレクトリ
- `src/cat-carousel/` – 猫画像の取得とカルーセル描画を行う React コンポーネント群。
- `assets/` – バンドル済みの CSS / JS、Apps SDK 向けスニペット。コミット対象です。
- `build-all.mts` – `pnpm run build` が呼び出すビルドスクリプト。`cat-carousel.snippet.html` を自動生成します。

## よく使うコマンド
- `pnpm run build` – カルーセルをバンドルし、`assets/cat-carousel.*` と `cat-carousel.snippet.html` を生成。
- `pnpm run dev` – `http://localhost:4444/cat-carousel.html` でホットリロード開発。
- `pnpm run serve` – 生成済み `assets/` を CORS 付き静的サーバーとして配信。
- `pnpm run tsc` / `pnpm run tsc:app` / `pnpm run tsc:node` – 各ビルドターゲットの型チェック。

## ビルド成果物と MCP の連携
- `pnpm run build` を実行すると、`assets/cat-carousel.snippet.html` が更新されます。
- MCP サーバーは、このスニペットを `src/catCarouselSnippet.ts` にインライン埋め込み済みの HTML として読み込み、`cat-carousel` ツールから返却します。
- UI を更新したら再ビルドし、`../neko-mcp-server/pnpm start` などでサーバーを再起動して反映を確認してください。

## The Cat API の利用
- 既定では非認証アクセスを使用し、軽負荷なデモ利用を想定しています。
- 高頻度アクセスや本番運用を想定する場合は https://thecatapi.com/ で API キーを取得し、`fetch` 時に `x-api-key` ヘッダーを追加する実装を検討してください。

## 次のステップ
- `cat-interrupt` など追加 MCP ツールに対応する UI を `src/` に拡張する。
- ビルド → MCP サーバー再起動 → Apps SDK での表示確認までのフローを整備する。
