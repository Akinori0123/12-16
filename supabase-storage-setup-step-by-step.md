# Supabase Storage RLS設定 - 完全ガイド

Storage RLS policy エラー `new row violates row-level security policy` を解決する手順です。

## 手順1: Supabaseダッシュボードでの設定

### 1. Storage バケットを作成

1. **Supabase Dashboard** にログイン
2. 左メニュー **「Storage」** をクリック
3. 「**Create bucket**」をクリック
4. 設定値:
   - **Bucket name**: `documents`
   - **Public bucket**: **❌ チェックを外す**（プライベートに設定）
   - **File size limit**: デフォルト（50MB）
   - **Allowed MIME types**: デフォルト（空白）
5. 「**Create bucket**」をクリック

### 2. Storage ポリシーを設定

1. **Storage** > **Policies** タブをクリック
2. `documents` バケットのセクションを確認
3. 「**New policy**」をクリック

#### ポリシー1: アップロード権限
```
Policy name: documents_upload_policy
Allowed operation: INSERT
Target roles: authenticated

USING expression: 
(bucket_id = 'documents'::text)

WITH CHECK expression:
(bucket_id = 'documents'::text)
```

#### ポリシー2: 読み取り権限
```
Policy name: documents_select_policy  
Allowed operation: SELECT
Target roles: authenticated

USING expression:
(bucket_id = 'documents'::text)
```

#### ポリシー3: 更新権限
```
Policy name: documents_update_policy
Allowed operation: UPDATE  
Target roles: authenticated

USING expression:
(bucket_id = 'documents'::text)

WITH CHECK expression:
(bucket_id = 'documents'::text)
```

#### ポリシー4: 削除権限
```
Policy name: documents_delete_policy
Allowed operation: DELETE
Target roles: authenticated

USING expression:
(bucket_id = 'documents'::text)
```

## 手順2: 簡単な代替設定（推奨）

もし上記が複雑であれば、以下の**テンプレート**を使用:

### 1. アップロード用ポリシー
1. **Storage** > **Policies** > **「New Policy」**
2. **「Templates」** タブをクリック
3. **「Allow authenticated uploads」** を選択
4. **Bucket**: `documents` を選択
5. **「Create policy」** をクリック

### 2. 読み取り用ポリシー
1. **「New Policy」** をクリック
2. **「Templates」** タブをクリック  
3. **「Allow authenticated reads」** を選択
4. **Bucket**: `documents` を選択
5. **「Create policy」** をクリック

## 手順3: SQL Editorでの確認（オプション）

以下のSQLを実行してポリシーが正しく設定されているかチェック:

```sql
-- Storage ポリシー一覧を確認
SELECT 
    policyname,
    cmd,
    permissive,
    CASE WHEN qual IS NOT NULL THEN 'Has USING clause' ELSE 'No USING clause' END as using_clause,
    CASE WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause' ELSE 'No WITH CHECK clause' END as check_clause
FROM pg_policies 
WHERE schemaname = 'storage' 
    AND tablename = 'objects'
ORDER BY policyname;

-- バケット設定を確認
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'documents';
```

## 手順4: 問題が続く場合の診断

### 現在のユーザー認証状態を確認
```sql
-- 現在認証されているユーザーを確認
SELECT 
    auth.uid() as current_user_id,
    CASE 
        WHEN auth.uid() IS NOT NULL THEN 'Authenticated'
        ELSE 'Not authenticated'
    END as auth_status;
```

### RLS状態を確認
```sql
-- storage.objects テーブルのRLS状態を確認
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'storage' 
    AND tablename = 'objects';
```

## 手順5: トラブルシューティング

### 問題A: ポリシーが表示されない
**解決方法**: ブラウザを更新し、Storageページを再読み込み

### 問題B: "insufficient privilege" エラー  
**解決方法**: プロジェクト管理者権限があることを確認

### 問題C: それでも動作しない場合
**一時的解決方法**（開発時のみ）:
1. **Storage** > **Settings** タブ
2. **「RLS disabled」** に一時的に設定
3. ファイルアップロードをテスト
4. **必ず本番前に RLS を有効化し直す**

## 手順6: 最終確認

1. ✅ `documents` バケットが存在する
2. ✅ バケットがプライベート設定になっている  
3. ✅ 認証済みユーザー向けのINSERT/SELECTポリシーが存在する
4. ✅ アプリケーションでユーザーがログインできている
5. ✅ applicationIdがUUID形式になっている

## 注意事項

- **本番環境では必ずRLSを有効にしてください**
- **ポリシーはセキュリティ上重要なので適切に設定してください**
- **開発時のRLS無効化は一時的なものとし、必ず有効化してください**

---

この手順で解決しない場合は、Supabaseプロジェクトの設定やユーザー認証状態に問題がある可能性があります。