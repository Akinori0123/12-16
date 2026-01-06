# Supabase設定ガイド

## 1. 必要なSupabase設定

### A. プロジェクトの作成
1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. "New project"をクリック
3. プロジェクト名、データベースパスワードを設定
4. リージョンを選択して作成

### B. 環境変数の設定
`.env.local`ファイルを作成し、以下を設定：

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**設定値の取得方法:**
1. Supabase Dashboard → Settings → API
2. `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
3. `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

## 2. データベーステーブルの作成

Supabase Dashboard → SQL Editorで以下のSQLファイルを実行：

```bash
# プロジェクトルートにあるスキーマファイルを実行
./lib/database-schema.sql
```

### 作成されるテーブル:
- `companies` - 企業情報
- `user_profiles` - ユーザープロファイル
- `applications` - 助成金申請
- `documents` - アップロードファイル
- `ai_analysis_results` - AI解析結果
- `deadlines` - 期限管理
- `admin_actions` - 管理者アクション
- `system_settings` - システム設定

## 3. 認証設定

### A. Email認証の有効化
1. Authentication → Settings
2. "Enable email confirmations"をONに設定
3. "Enable email change confirmations"をONに設定

### B. パスワードポリシー
- 最小文字数: 6文字以上（推奨: 8文字以上）
- 大文字・小文字・数字を含む（推奨）

## 4. ストレージ設定

### A. ストレージバケットの作成
1. Storage → Create Bucket
2. バケット名: `documents`
3. Public: `false`（プライベート）

### B. ストレージポリシーの設定
```sql
-- ユーザーが自分の申請に関連するファイルのみアクセス可能
CREATE POLICY "Users can access own application files" ON storage.objects
FOR ALL USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## 5. Row Level Security (RLS) 設定

データベーススキーマ実行時に自動設定されますが、以下を確認：

### 確認項目:
1. 全テーブルでRLSが有効になっている
2. ユーザーは自分の企業のデータのみアクセス可能
3. 管理者は全データにアクセス可能

## 6. メール送信設定（オプション）

### A. カスタムメールプロバイダー
1. Authentication → Settings → Email
2. "Enable custom SMTP"を設定
3. SMTPサーバー情報を入力

### B. メールテンプレート
- 確認メール
- パスワードリセット
- 招待メール

## 7. 必要な権限・機能

### Authentication
- ✅ Email/Password認証
- ✅ メール確認
- ✅ パスワードリセット

### Database  
- ✅ Row Level Security (RLS)
- ✅ PostgreSQL関数・トリガー
- ✅ 外部キー制約

### Storage
- ✅ ファイルアップロード
- ✅ プライベートバケット
- ✅ ファイル暗号化

### API
- ✅ RESTful API
- ✅ リアルタイム機能
- ✅ PostgreSQL関数の実行

## 8. 開発・本番環境の分離

### 開発環境
- 別のSupabaseプロジェクトを作成
- 異なる環境変数を設定
- テストデータでの開発

### 本番環境  
- 本番用プロジェクト
- 適切なバックアップ設定
- モニタリング・ログ設定

## 9. セキュリティ考慮事項

- ✅ API Keyは環境変数で管理
- ✅ Service Role Keyはサーバーサイドのみで使用
- ✅ RLSによるデータ分離
- ✅ HTTPS通信の強制
- ✅ 適切な認証・認可設定

## 10. トラブルシューティング

### よくある問題:
1. **認証エラー** → API Key・URLの確認
2. **データベースエラー** → RLS設定の確認
3. **ストレージエラー** → バケット・ポリシー設定の確認
4. **メール送信失敗** → SMTP設定の確認

このガイドに従って設定することで、完全なユーザー認証・データ管理機能が利用できます。