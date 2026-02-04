# セットリスト順番支援ツール

音楽ライブのセットリスト（曲順）を検討するための、GitHub Pages 配信用・静的Webアプリです。

- 配信: GitHub Pages（GitHub Actions で main push 時にデプロイ）
- 保存: 端末内のみ（IndexedDB）
- 認証/外部API/解析ツール: なし
- 表示言語: 日本語

## 開発

```bash
cd app
npm install
npm run dev
```

## ビルド

```bash
cd app
npm run build
npm run preview
```

## デプロイ（GitHub Pages）

- `.github/workflows/deploy-pages.yml` が `main` への push をトリガーに `app/` をビルドし、`app/dist` を Pages にデプロイします。
- ルーティングは HashRouter を使用しています（GitHub Pages の静的配信で 404 を避けるため）。

## データ保存について

- 保存先はブラウザの IndexedDB です。
- 外部へのデータ送信は行いません。

## CSV（楽曲ライブラリ）

- 列: `title,artist,comment,url`
- ヘッダあり推奨（ヘッダ無しの場合は 1〜4列目を順に使用）
- 文字コード: UTF-8（BOMあり/なし対応）
- 前後空白は trim
- title が空の行はスキップ
- 余分な列は無視
- 重複判定: `title + artist` の完全一致（一致した場合はスキップ）

## JSON（セットリスト共有 v1）

```json
{
  "schemaVersion": "setlist-assist.v1",
  "exportedAt": "2026-02-03T00:00:00.000Z",
  "setlist": {
    "id": "...",
    "title": "...",
    "items": [
      { "id": "...", "type": "SONG", "title": "...", "artist": "...", "memo": "..." },
      { "id": "...", "type": "NOTE", "label": "MC", "text": "..." },
      { "id": "...", "type": "ENCORE_START", "memo": "..." }
    ],
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

- インポート時は既存セットリストを上書きせず、新規として保存します（ID は再採番）。

## ライセンス

MIT License

## MCP（npx設定）

このリポジトリには MCP サーバ設定ファイル `mcp.json` を同梱しています。

- Playwright MCP: `@playwright/mcp@latest`
- Chrome DevTools MCP: `chrome-devtools-mcp@latest`

起動確認（ヘルプ表示）:

```bash
npx -y chrome-devtools-mcp@latest --help
npx -y -p @playwright/mcp@latest playwright-mcp --help
```
