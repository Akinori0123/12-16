-- SubsidySmart データベーススキーマ
-- 実行方法: Supabaseのダッシュボードでこのクエリを実行してください

-- 企業テーブル
CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    representative_name VARCHAR(100),
    address TEXT,
    phone_number VARCHAR(20),
    email VARCHAR(100),
    business_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザーテーブル（Supabaseのauth.usersテーブルと連携）
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    role VARCHAR(20) CHECK (role IN ('client', 'admin')) NOT NULL DEFAULT 'client',
    full_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 助成金申請テーブル
CREATE TABLE IF NOT EXISTS applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    subsidy_type VARCHAR(50) NOT NULL DEFAULT 'career_up',
    status VARCHAR(20) CHECK (status IN ('draft', 'in_progress', 'review', 'completed', 'rejected')) NOT NULL DEFAULT 'draft',
    plan_start_date DATE,
    plan_end_date DATE,
    application_deadline DATE,
    target_employees INTEGER DEFAULT 1,
    company_name VARCHAR(255),
    representative_name VARCHAR(100),
    address TEXT,
    phone_number VARCHAR(20),
    email VARCHAR(100),
    business_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- アップロードされた書類テーブル
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),
    upload_status VARCHAR(20) CHECK (upload_status IN ('uploading', 'completed', 'failed')) NOT NULL DEFAULT 'uploading',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI解析結果テーブル
CREATE TABLE IF NOT EXISTS ai_analysis_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    analysis_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'analyzing', 'completed', 'failed')) NOT NULL DEFAULT 'pending',
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    compliance_status VARCHAR(20) CHECK (compliance_status IN ('compliant', 'non_compliant', 'partial', 'unknown')) DEFAULT 'unknown',
    feedback_summary TEXT,
    detailed_analysis JSONB,
    suggestions TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 期限管理テーブル
CREATE TABLE IF NOT EXISTS deadlines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
    deadline_type VARCHAR(50) NOT NULL,
    deadline_date DATE NOT NULL,
    is_overridden BOOLEAN DEFAULT FALSE,
    original_date DATE,
    override_reason TEXT,
    alert_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 管理者アクションログテーブル
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- システム設定テーブル
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_applications_company_id ON applications(company_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_subsidy_type ON applications(subsidy_type);
CREATE INDEX IF NOT EXISTS idx_documents_application_id ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_results_document_id ON ai_analysis_results(document_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_application_id ON deadlines(application_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_date ON deadlines(deadline_date);
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- RLS (Row Level Security) ポリシーの設定
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- 企業は自分のデータのみアクセス可能
CREATE POLICY "Companies can view own data" ON companies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.company_id = companies.id
        )
        OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- ユーザープロファイルのポリシー
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR ALL USING (
        auth.uid() = id 
        OR 
        EXISTS (
            SELECT 1 FROM user_profiles admin_profile 
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role = 'admin'
        )
    );

-- 申請のポリシー
CREATE POLICY "Users can access own company applications" ON applications
    FOR ALL USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND (user_profiles.company_id = applications.company_id OR user_profiles.role = 'admin')
        )
    );

-- ドキュメントのポリシー
CREATE POLICY "Users can access own application documents" ON documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = documents.application_id 
            AND (
                applications.user_id = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE user_profiles.id = auth.uid() 
                    AND (user_profiles.company_id = applications.company_id OR user_profiles.role = 'admin')
                )
            )
        )
    );

-- AI解析結果のポリシー
CREATE POLICY "Users can access own document analysis" ON ai_analysis_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM documents 
            JOIN applications ON applications.id = documents.application_id
            WHERE documents.id = ai_analysis_results.document_id 
            AND (
                applications.user_id = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE user_profiles.id = auth.uid() 
                    AND (user_profiles.company_id = applications.company_id OR user_profiles.role = 'admin')
                )
            )
        )
    );

-- 期限のポリシー
CREATE POLICY "Users can access own application deadlines" ON deadlines
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = deadlines.application_id 
            AND (
                applications.user_id = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE user_profiles.id = auth.uid() 
                    AND (user_profiles.company_id = applications.company_id OR user_profiles.role = 'admin')
                )
            )
        )
    );

-- 管理者アクションログのポリシー（管理者のみ）
CREATE POLICY "Only admins can access admin actions" ON admin_actions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- 自動更新のためのトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーの作成
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_analysis_results_updated_at BEFORE UPDATE ON ai_analysis_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deadlines_updated_at BEFORE UPDATE ON deadlines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- サンプルデータの投入
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
    ('default_plan_duration_months', '6', 'デフォルトの計画期間（月）'),
    ('application_window_months', '2', '申請期間の長さ（月）'),
    ('reminder_days_before_deadline', '14', '期限前リマインダー日数'),
    ('max_file_size_mb', '10', '最大ファイルサイズ（MB）'),
    ('supported_file_types', 'pdf,doc,docx,xls,xlsx', 'サポートするファイル形式')
ON CONFLICT (setting_key) DO NOTHING;