# Supabase Storage RLS 設定ガイド

## エラーの解決方法

`ERROR: 42501: must be owner of table objects` エラーは、SQL Editorから直接Storage RLSポリシーを設定できないために発生します。
以下の手順でSupabase UIから設定してください。

## 手順1: Storage バケットの設定

### 1. Supabaseダッシュボードにログイン
1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. プロジェクトを選択

### 2. Storage バケットを作成/確認
1. 左メニューから「**Storage**」をクリック
2. バケット一覧で「**documents**」バケットを確認
3. 存在しない場合は「**Create bucket**」をクリック
   - Bucket name: `documents`
   - Public bucket: **チェックしない**（プライベートに設定）

## 手順2: Storage RLS ポリシーの設定

### 1. Storage Policiesページに移動
1. Storage > **Policies** タブをクリック
2. 「**documents**」バケットのポリシーセクションを確認

### 2. 各ポリシーを個別に作成

#### アップロード用ポリシー (INSERT)
1. 「**New Policy**」をクリック
2. Template: 「**Custom**」を選択
3. 設定値:
   ```
   Policy Name: documents_upload_policy
   Allowed operation: INSERT
   Target roles: authenticated
   
   USING expression (optional):
   bucket_id = 'documents' AND auth.uid() IS NOT NULL
   
   WITH CHECK expression (optional):
   bucket_id = 'documents' AND auth.uid() IS NOT NULL
   ```

#### ダウンロード用ポリシー (SELECT)
1. 「**New Policy**」をクリック
2. Template: 「**Custom**」を選択
3. 設定値:
   ```
   Policy Name: documents_select_policy
   Allowed operation: SELECT
   Target roles: authenticated
   
   USING expression (optional):
   bucket_id = 'documents' AND auth.uid() IS NOT NULL
   ```

#### 更新用ポリシー (UPDATE)
1. 「**New Policy**」をクリック
2. Template: 「**Custom**」を選択
3. 設定値:
   ```
   Policy Name: documents_update_policy
   Allowed operation: UPDATE
   Target roles: authenticated
   
   USING expression (optional):
   bucket_id = 'documents' AND auth.uid() IS NOT NULL
   
   WITH CHECK expression (optional):
   bucket_id = 'documents' AND auth.uid() IS NOT NULL
   ```

#### 削除用ポリシー (DELETE)
1. 「**New Policy**」をクリック
2. Template: 「**Custom**」を選択
3. 設定値:
   ```
   Policy Name: documents_delete_policy
   Allowed operation: DELETE
   Target roles: authenticated
   
   USING expression (optional):
   bucket_id = 'documents' AND auth.uid() IS NOT NULL
   ```

## 手順3: 簡単な代替方法（推奨）

もし上記の設定が複雑であれば、以下の簡単なポリシーを設定してください：

### 1. 「Allow authenticated uploads」ポリシー
1. Storage > Policies > 「**New Policy**」
2. Template: 「**Allow authenticated uploads**」を選択
3. Bucket: `documents` を選択
4. 「**Create Policy**」をクリック

### 2. 「Allow authenticated reads」ポリシー
1. 「**New Policy**」をクリック
2. Template: 「**Allow authenticated reads**」を選択
3. Bucket: `documents` を選択
4. 「**Create Policy**」をクリック

## 手順4: 設定確認

### 1. ポリシーが作成されていることを確認
Storage > Policies で以下のポリシーが表示されることを確認：
- documents バケット用のアップロードポリシー
- documents バケット用の読み取りポリシー

### 2. アプリケーションでテスト
1. アプリケーションにログイン
2. キャリアアップ助成金申請ページでPDFファイルをアップロード
3. エラーが発生しないことを確認

## トラブルシューティング

### エラーが続く場合
1. **ブラウザの開発者ツール**でエラー詳細を確認
2. **Supabase Logs** (Dashboard > Logs) でエラーログを確認
3. **一時的にRLSを無効化**（開発時のみ）:
   - Storage > Settings > RLS を一時的に無効化

### 確認ポイント
- ✅ documents バケットが存在する
- ✅ バケットがプライベート設定になっている
- ✅ 認証済みユーザー用のアップロード・読み取りポリシーが存在する
- ✅ ユーザーが正常にログインできている

## 注意事項
- 本番環境では必ずRLSを有効にしてください
- ポリシーはセキュリティ上重要なので、適切に設定してください
- 開発時のみRLS無効化を使用し、本番では必ず有効化してください