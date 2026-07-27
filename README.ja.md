[English](README.md) | [中文](README.zh-CN.md) | **日本語**

# film-studio-dashboard 映像制作ワークベンチのダッシュボード

[film-studio](https://github.com/zq940222/Claude-Code-Film-Studio) 映像制作ワークベンチの**読み取り専用の可観測ダッシュボード**です。ローカル web アプリで、起動して作業ディレクトリを選ぶと、その中のすべてのプロジェクトをグラフィカルに観測できます——各段階の進捗と承認ゲートのチェックポイント、ショットの四状態グリッドと完成尺の再生、設定画ギャラリーとスタイルロック、脚本／レビュー文書のプレビュー、公開素材とクレジットボード。

## 境界（ドア枠に刻む）

- **読み取り専用＋軽い操作**：軽い操作は「推奨コマンドのコピー」と「クレジットの更新」（読み取り専用の `dreamina user_credit` クエリ）のみ。
- **生成をトリガーしない・承認ゲートを確認しない・ワークスペースのファイルを一切書き戻さない**——4 つの承認ゲートの確認は常に Claude Code の対話の中で行われます。
- サーバーは `127.0.0.1` のみにバインドし、メディアエンドポイントにはパストラバーサル対策があります。
- プラグインとの唯一の契約はワークスペースのファイル形式（`project.json` / `shotlist.json` / ディレクトリ規約）です。プラグインリポジトリの ADR-0001 を参照。

## インストールと使い方（コマンドライン、Windows を含む全プラットフォーム）

前提：Node ≥ 18 がインストール済みであること。インストール時にローカルでビルドするため、初回は少し時間がかかります。

```bash
# インストール（GitHub から直接、npm アカウント不要）
npm i -g github:zq940222/film-studio-dashboard

# 起動（作業ディレクトリは省略可。起動後に画面で選べます）
film-studio-dashboard "D:/your-workspace"
# 短いエイリアスも使えます：fsd "D:/your-workspace"

# 最新版に更新（GitHub から取り直してビルド）
film-studio-dashboard update
```

<http://127.0.0.1:5799> を開きます。最後に使った作業ディレクトリは `~/.film-studio-dashboard/config.json` に記録され、次回はワンクリックで開けます。環境変数 `PORT` でポートを変更できます。

その他のサブコマンド：`film-studio-dashboard version` / `help`。

## ソースから実行 / 開発

```bash
git clone https://github.com/zq940222/film-studio-dashboard.git
cd film-studio-dashboard
npm install          # web/dist と server/dist を自動ビルド（prepare フック）
npm start -- "D:/your-workspace"

npm run dev          # 開発モード：server(5799, tsx watch) + web(5173, vite) を並行実行。フロントは /api と /media をプロキシ
```

## 技術スタック

- フロントエンド：Vite + React + TypeScript、手書き CSS（デザインシステムは `design-system/`、ui-ux-pro-max が生成）。
- バックエンド：Express + TypeScript、純粋な読み取り専用ファイルスキャン + mtime/TTL キャッシュ。フロントは 3 秒ごとにポーリング。
- 共有型：`shared/types.ts`（ワークスペースのファイル形式契約を TypeScript 化したもの）。
