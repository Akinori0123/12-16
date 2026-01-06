# SubsidySmart - AI助成金申請支援システム

## 概要

SubsidySmartは、助成金（キャリアアップ助成金など）の申請業務を自動化・効率化するWebアプリケーションです。申請企業と管理者（TM人事労務コンサルティング）の双方が利用し、書類作成から提出までのプロセスをAIがサポートします。

## 主な機能

### 🏢 申請企業向け機能
- **助成金選択とワークフロー表示**: 申請したい助成金を選択し、タスクリスト形式で進捗管理
- **書類アップロード・情報入力**: 企業情報、従業員情報、就業規則等の必要書類をアップロード
- **AIによる書類チェック**: Gemini APIを活用し、書類が助成金要件を満たしているかを自動判定
- **修正提案**: 不足事項がある場合、AIが具体的な修正案や追加すべき条文を提示
- **申請書類自動生成**: 入力情報を基に公式フォーマットのPDFを自動生成

### 👨‍💼 管理者向け機能
- **進捗管理ダッシュボード**: 顧客ごとの申請ステータスを一覧で確認
- **書類管理**: 助成金の種類ごとに必要書類の設定・管理が可能
- **期限管理**: AIが算出した提出期限の手動修正・オーバーライド
- **申請審査**: 顧客の申請内容を確認し、承認・差し戻しを管理

### 🤖 AI機能
- **書類内容分析**: PDFファイルから文字を読み取り、助成金要件との適合性を判定
- **自動期限計算**: 助成金の種類や企業の状況に基づく提出期限の自動設定
- **修正提案**: 要件に満たない箇所の具体的な改善提案

## 技術スタック

- **フロントエンド**: Next.js 14 (React 18)
- **バックエンド**: Next.js API Routes
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth
- **ファイルストレージ**: Supabase Storage
- **AI**: Google Gemini API
- **スタイリング**: Tailwind CSS
- **言語**: TypeScript

## セットアップ

### 1. 環境変数設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key

# 管理者アカウント（初期設定用）
ADMIN_MAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password
```

#### 環境変数の取得方法

**Supabase設定**:
1. [Supabase](https://supabase.com/)でプロジェクトを作成
2. プロジェクト設定 > API > Project URL を `NEXT_PUBLIC_SUPABASE_URL` に設定
3. Project API keys > `anon` `public` を `NEXT_PUBLIC_SUPABASE_ANON_KEY` に設定
4. Project API keys > `service_role` `secret` を `SUPABASE_SERVICE_ROLE_KEY` に設定

**Gemini API**:
1. [Google AI Studio](https://makersuite.google.com/app/apikey)でAPIキーを作成
2. 取得したAPIキーを `GEMINI_API_KEY` に設定

### 2. データベースセットアップ

1. Supabaseプロジェクトで以下のSQLファイルを実行：
   ```sql
   -- 基本スキーマ
   lib/database-schema.sql
   
   -- AIチェック用カラム追加
   add-ai-check-columns.sql
   ```

2. Supabase Storageでバケット `documents` を作成

### 3. インストールと起動

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build
npm start
```

アプリケーションは http://localhost:3000 で起動します。

## 使用方法

### 申請企業の場合
1. ユーザー登録を行い、会社情報を入力
2. 助成金選択ページで申請したい助成金を選択
3. 正社員転換実施日を設定
4. 申請ページで必要書類をアップロード
5. AIチェック機能で書類の要件適合性を確認
6. 申請を提出

### 管理者の場合
1. 管理者ログインでダッシュボードにアクセス
2. 申請一覧で顧客の申請状況を確認
3. 必要に応じて申請内容を審査・承認
4. 書類管理で助成金の必要書類設定を管理

## ディレクトリ構成

```
├── app/                    # Next.js App Router
│   ├── admin/             # 管理者機能
│   ├── application/       # 申請機能
│   ├── api/              # APIエンドポイント
│   ├── auth/             # 認証機能
│   └── subsidies/        # 助成金選択
├── components/           # 共通コンポーネント
├── lib/                 # ユーティリティとサービス
├── types/               # TypeScript型定義
└── public/              # 静的ファイル
```

## 開発ガイドライン

### コーディング規約
- TypeScriptを使用し、型安全性を保つ
- コンポーネントは関数型で記述
- Tailwind CSSでスタイリング
- APIエンドポイントはRESTful設計

### セキュリティ
- Supabase RLS（Row Level Security）でデータアクセス制御
- 機密情報は環境変数で管理
- ファイルアップロードは適切なバリデーションを実施

## ライセンス

このプロジェクトは私的利用のためのものです。

## サポート

技術的な問題や機能要望については、開発チームまでお問い合わせください。
