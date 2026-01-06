-- documentsテーブルにAIチェック結果用のカラムを追加
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS ai_check_result JSONB,
ADD COLUMN IF NOT EXISTS ai_check_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS ai_check_score INTEGER,
ADD COLUMN IF NOT EXISTS ai_checked_at TIMESTAMP;