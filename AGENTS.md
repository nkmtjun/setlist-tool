# AGENTS.md

このリポジトリで作業する agentic coding agent（LLM/自動化エージェント）向けの実務ルールです。既存の構成・スタイル・運用を尊重し、最小差分で変更してください。

## リポジトリ概要

- 静的Webアプリ（GitHub Pages配信）。アプリ本体は `app/`（Vite）。
- 保存は端末内のみ（IndexedDB）。外部API/認証/解析ツールはなし。
- GitHub Pagesの都合でルーティングは HashRouter。

前提:
- 外部送信を増やす変更（解析・トラッキング、勝手なfetch追加等）は入れない。
- 端末ローカル保存の前提（IndexedDB）を崩さない。

## よく触るパス

- アプリ: `app/`, `app/src/`
- ESLint（flat config）: `app/eslint.config.js`
- TypeScript（project references / strict）: `app/tsconfig.json`, `app/tsconfig.app.json`, `app/tsconfig.node.json`
- CI/Deploy: `.github/workflows/deploy-pages.yml`

## 開発コマンド

基本は `app/` ディレクトリ内で実行します。

```bash
cd app
npm install
npm run dev
npm run build
npm run preview
npm run lint
# optional: 自動修正（最小差分で）
npm run lint -- --fix
# optional: 型チェックのみ（ビルドはしない）
npx tsc -b
```

補足:
- `npm run build` は `tsc -b && vite build`。

## テスト

- 現状: N/A（`app/package.json` に `test` scriptなし。単体テスト/単独ファイル実行の作法も未定義）
- 将来（提案・未導入）: Vitest + React Testing Library を追加し、`npm run test` / `npm run test -- <pattern>` を用意すると運用しやすい

## CI / デプロイ（GitHub Pages）

- トリガー: `main` への push / 手動実行
- Node: 20
- `app/` で `npm ci` → `npm run build` → `app/dist` を Pages にデプロイ

## ルーティング（制約）

- GitHub Pages の静的配信前提のため HashRouter を使用している。
- BrowserRouter への変更は、Pages 側のホスティング/404回避戦略も合わせて変える場合のみ検討する（単独変更は避ける）。

## コードスタイル / 設計ルール（実態優先）

### TypeScript

- `strict: true` 前提。型エラーと未使用（`noUnused*`）を増やさない。
- `verbatimModuleSyntax: true` のため、型のみのimportは `import type` を使う。
- project references（`tsc -b`）前提なので、tsconfig間の責務を崩さない。
- `noUncheckedSideEffectImports: true` のため、副作用目的のimport（CSSやpolyfill等）は明示的・必要最小限にする。
- `app/package.json` は `"type": "module"`（ESM）。Node側コードも `import/export` 前提で扱う。

### ESLint

- ESLintは flat config（`defineConfig`）。基本は recommended セット。
- import順序の強制ルールは未導入（`import/order` 等なし）。無理な並べ替えは避ける。

### import（並びの目安）

- import/order は未強制だが、差分を小さくするため既存ファイルの並びに合わせる。
- よくある並び: 副作用import（CSS等）→ 外部ライブラリ（react 等）→ 内部モジュール（`../domain/**`, `../db/**`, `../io/**`, `../utils/**` など）

### フォーマット

- 多くのファイルは「シングルクォート + セミコロン無し」系だが、例外がある。
- 例外: `app/src/pages/HelpPage.tsx`, `app/src/components/WelcomeDialog.tsx`
- 方針: 触るファイルの既存流儀に合わせ、意味のない全体整形（大量差分）をしない。

### import / 依存方向

- `app/src/domain/**`: 純粋ロジック・型定義（UI/ブラウザAPIに依存しない）
- `app/src/io/**`: import/exportやパース等（失敗時は例外を投げる）
- `app/src/db/**`: IndexedDB（Dexie）周り
- `app/src/pages/**`, `app/src/components/**`: UI（例外を握りつぶさず、ユーザー向けに通知）
- 依存方向は「UI → domain/io/db/utils」を基本にし、逆流（domain→UI参照）を避ける。

実装の目安:
- domainは「計算・変換・型」。ブラウザAPIやUI都合（alert/ルーティング/DOM）を持ち込まない。
- ioは「入出力フォーマット（CSV/JSON等）とパース」。失敗は例外で返し、UIでユーザー向けに扱う。
- dbは「永続化（Dexie/IndexedDB）」。UIから直接localStorage/IndexedDBを雑多に触らない（既存の窓口を優先）。

### エラーハンドリング

- パース/バリデーション層: `throw new Error('...')` で失敗を通知（メッセージは日本語）。
- UI層: `try/catch` で受け、ユーザーに見える形で伝える（現状 `window.alert(...)` が多い）。
- 技術的詳細（stack等）を直接UIに出さない（必要なら開発者向けログを追加）。

メッセージ方針:
- ユーザー向け文言は日本語で、次の行動が分かる表現にする（例: 権限/形式/必須項目の案内）。
- 例外文言はUIにそのまま出る可能性があるため、簡潔・安全（個人情報/内部情報なし）にする。

### 命名

- Reactコンポーネント: PascalCase
- 関数/変数: camelCase
- 定数: `UPPER_SNAKE_CASE`（意味が強いもの）。それ以外は既存に合わせる。
- 永続化キー等（localStorage/DB）: 既存prefixを維持（例: `setlist-tool:...`）。

## ルールファイル（Cursor / Copilot）

- Cursor rules: `.cursor/rules/**/*` / `.cursorrules` は存在しません。
- Copilot instructions: `.github/copilot-instructions.md` は存在しません。

## MCP（optional）

- このリポジトリには MCP サーバ設定ファイル `mcp.json` を同梱しています（開発者向け・任意）。
- 起動確認（ヘルプ表示）:

```bash
npx -y chrome-devtools-mcp@latest --help
npx -y -p @playwright/mcp@latest playwright-mcp --help
```

## 変更時の基本姿勢

### あいまいな指示の確認プロトコル
- 指示があいまいで、解釈によって成果物が実質的に変わると判断した場合、実装開始前にユーザーへ確認を求める（勝手に決め打ちしない）。
- 確認時は「自分が採る具体的な実行計画（何をどのファイルでどう変えるか）」を併記して提示する。
- 確認前に許可される作業は、非破壊のコンテキスト収集（Read/Grep/Glob、関連箇所の把握）まで。コード編集・生成・コミット等は承認後に行う。
- ユーザーが明示的に analysis-first を要求した場合（例: `[analyze-mode]`）、コンテキスト収集は並列に実施し、整理・統合した上で編集に入る。
- テンプレ（簡潔）: `確認: <あいまいな点>` / `こちらの想定: <A/B のどちら等>` / `実行計画(承認後): <変更ファイル/作業内容>` / `質問: <確定に必要な1問>`

- 依存追加・大規模移動・自動整形は避ける（必要なら理由と影響範囲を明記）。
- ユーザー向け文言は日本語で、既存のトーンに合わせる。
- 変更後に `npm run build` と `npm run lint` が通る状態を維持する。

レビューしやすさ:
- 同一コミット内で「機能変更」と「整形/リネーム」を混ぜない（差分が読めなくなるため）。
- 既存の永続化キー（例: `setlist-tool:...`）やスキーマは互換性に注意し、破壊的変更は避ける。

## 参照（根拠）

- コマンド: `README.md`, `app/README.md`, `app/package.json`
- Lint: `app/eslint.config.js`
- TypeScript: `app/tsconfig.json`, `app/tsconfig.app.json`, `app/tsconfig.node.json`
- CI/Deploy: `.github/workflows/deploy-pages.yml`
- スタイル例: `app/src/pages/HelpPage.tsx`, `app/src/components/WelcomeDialog.tsx`
- 例外/通知例: `app/src/io/setlistJson.ts`, `app/src/pages/SharePage.tsx`, `app/src/pages/LibraryPage.tsx`
- MCP: `mcp.json`, `README.md`
