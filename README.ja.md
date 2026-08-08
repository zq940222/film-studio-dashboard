[English](README.md) | [中文](README.zh-CN.md) | **日本語**

# film-studio-dashboard 映像制作ワークベンチのダッシュボード

[film-studio](https://github.com/zq940222/Claude-Code-Film-Studio) 映像制作ワークベンチの**読み取り専用の可観測ダッシュボード**です。ローカル web アプリで、起動して作業ディレクトリを選ぶと、その中のすべてのプロジェクトをグラフィカルに観測できます——各段階の進捗と承認ゲートのチェックポイント、ショットの四状態グリッドと完成尺の再生、設定画ギャラリーとスタイルロック、脚本／レビュー文書のプレビュー、公開素材とクレジットボード。

## 境界（ドア枠に刻む）

- **読み取り専用＋軽い操作**：軽い操作は「推奨コマンドのコピー」と「クレジットの更新」（読み取り専用の `dreamina user_credit` クエリ）のみ。
- **生成をトリガーしない・承認ゲートを確認しない・ワークスペースのファイルを一切書き戻さない**——4 つの承認ゲートの確認は常に Claude Code の対話の中で行われます。
- サーバーは `127.0.0.1` のみにバインドし、メディアエンドポイントにはパストラバーサル対策があります。
- プラグインとの唯一の契約はワークスペースのファイル形式（`project.json` / `shotlist.json` / ディレクトリ規約）です。プラグインリポジトリの ADR-0001 を参照。

## インストールと使い方（コマンドライン、Windows を含む全プラットフォーム）

前提：Node ≥ 18 がインストール済みであること。リリースはビルド済みなので、インストールは高速です。

```bash
# インストール（GitHub Release のビルド済みパッケージ、npm アカウント不要）
npm i -g https://github.com/zq940222/film-studio-dashboard/releases/latest/download/film-studio-dashboard.tgz
```

インストール後、**日々の起動はこの 3 文字だけ**です：

```bash
fsd
```

引数は不要です——前回使った作業ディレクトリ（`~/.film-studio-dashboard/config.json` に記録）を開き、ブラウザも自動で立ち上がります。ディレクトリを切り替えるときなどだけ引数を渡します：

```bash
fsd "D:/your-workspace"   # 作業ディレクトリを切り替え（省略可。起動後に画面でも選べます）
fsd update                # 最新リリースに更新（同じ URL を取り直す）
fsd version               # バージョンを表示
fsd help                  # ヘルプを表示
```

> `fsd` は `film-studio-dashboard` の短いエイリアスで、グローバルインストール時に一緒に入ります。上記のどのコマンドでも両者は完全に等価です。

<http://127.0.0.1:5799> を開きます。環境変数 `PORT` でポートを変更でき、`--no-open` を付けるとブラウザを自動で開きません。

## ソースから実行 / 開発

```bash
git clone https://github.com/zq940222/film-studio-dashboard.git
cd film-studio-dashboard
npm install
npm run build        # web/dist と server/dist をビルド
npm start -- "D:/your-workspace"

npm run dev          # 開発モード（ビルド不要、その場でコンパイル）：server(5799, tsx watch) + web(5173, vite) を並行実行。フロントは /api と /media をプロキシ
```

## 技術スタック

- フロントエンド：Vite + React + TypeScript、手書き CSS（デザインシステムは `design-system/`、ui-ux-pro-max が生成）。
- バックエンド：Express + TypeScript、純粋な読み取り専用ファイルスキャン + mtime/TTL キャッシュ。フロントは 3 秒ごとにポーリング。
- 共有型：`shared/types.ts`（ワークスペースのファイル形式契約を TypeScript 化したもの）。
