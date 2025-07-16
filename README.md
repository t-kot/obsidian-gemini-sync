# Obsidian Gemini Sync

Obsidian Web Clipperで保存したrawファイルから、Gemini APIを使って要約・本文抽出を行い、整理されたファイルを自動生成するツールです。

## 機能

- `~/Google Drive/マイドライブ/obsidian/private/98-raw` フォルダの監視
- 新しいMarkdownファイルが追加されると自動処理
- Gemini APIを使った要約生成（500文字程度）
- 重要ポイントの箇条書き抽出
- 記事本文の抽出（広告等のノイズ除去）
- ドメイン・日付別のフォルダ構成で整理保存
- 処理後の元ファイル自動削除

## セットアップ

1. 依存関係のインストール:
```bash
npm install
```

2. 環境変数の設定:
```bash
cp .env.example .env
```

`.env`ファイルを編集して設定:
```
GEMINI_API_KEY=your_actual_api_key
RAW_DIR=~/Google Drive/マイドライブ/obsidian/private/98-raw
OUTPUT_DIR=~/Google Drive/マイドライブ/obsidian/private/2-source
```

## 使用方法

### 開発モード（ファイル変更監視付き）
```bash
npm run dev
```

### 本番実行
```bash
npm start
```

## ファイル構成

- **入力**: `RAW_DIR` 環境変数で指定されたフォルダ（デフォルト: `~/Google Drive/マイドライブ/obsidian/private/98-raw`）
- **出力**: `OUTPUT_DIR` 環境変数で指定されたフォルダ配下に `{domain}/{YYYYMMDD}/` 形式で保存
- **プロンプト**: `prompts/content-process.txt` でカスタマイズ可能

## 出力ファイル形式

```markdown
---
[元のYAMLフロントマター]
---

## 要約
（Geminiで生成した500文字程度の要約）

## ポイント
- ポイント1
- ポイント2
- ...

## 本文
（抽出された記事本文）
```

## 必要な環境

- Node.js 18+
- Gemini API キー
- Google Drive のフォルダアクセス権限