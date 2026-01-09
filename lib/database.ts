import { supabase, supabaseAdmin } from './supabase'
import { Document } from '@/types/database'

// 申請データの型定義
interface SubsidyApplication {
  id?: string
  company_id: string
  user_id: string
  subsidy_type: string
  status: 'draft' | 'in_progress' | 'review' | 'completed' | 'rejected'
  plan_start_date?: string
  plan_end_date?: string
  application_deadline?: string
  target_employees?: number
  company_name?: string
  representative_name?: string
  address?: string
  phone_number?: string
  email?: string
  business_number?: string
  review_comments?: string
  created_at?: string
  updated_at?: string
}

export class DatabaseService {
  // 企業関連
  static async createCompany(companyData: {
    name: string
    representative_name?: string
    address?: string
    phone_number?: string
    email?: string
    business_number?: string
  }) {
    console.log('Creating company with data:', companyData)
    
    // RLSをバイパスするためにsupabaseAdminを使用
    const { data, error } = await supabaseAdmin
      .from('companies')
      .insert(companyData)
      .select()
      .single()

    if (error) {
      console.error('Company creation error:', error)
      throw error
    }
    
    console.log('Company created successfully:', data)
    return data
  }

  static async getCompany(companyId: string) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (error) throw error
    return data
  }

  // ユーザープロファイル関連
  static async createUserProfile(profileData: {
    id: string
    company_id?: string
    role: 'client' | 'admin'
    full_name?: string
  }) {
    console.log('Creating user profile with data:', profileData)
    
    // RLSをバイパスするためにsupabaseAdminを使用
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single()

    if (error) {
      console.error('User profile creation error:', error)
      throw error
    }
    
    console.log('User profile created successfully:', data)
    return data
  }

  static async upsertUserProfile(profileData: {
    id: string
    company_id?: string
    role: 'client' | 'admin'
    full_name?: string
  }) {
    console.log('Upserting user profile with data:', profileData)
    
    // RLSをバイパスするためにsupabaseAdminを使用
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .upsert(profileData)
      .select()
      .single()

    if (error) {
      console.error('User profile upsert error:', error)
      throw error
    }
    
    console.log('User profile upserted successfully:', data)
    return data
  }

  static async getUserProfile(userId: string) {
    // RLSの問題を避けるためにsupabaseAdminを使用
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select(`
        *,
        company:companies(*)
      `)
      .eq('id', userId)
      .single()

    if (error) {
      console.error('getUserProfile error:', error)
      throw error
    }
    return data
  }

  // 申請関連
  static async createApplication(applicationData: Partial<SubsidyApplication>) {
    console.log('Creating application with data:', applicationData)
    
    // RLSをバイパスするためにsupabaseAdminを使用
    const { data, error } = await supabaseAdmin
      .from('applications')
      .insert(applicationData)
      .select(`
        *,
        company:companies(*),
        user_profile:user_profiles(*)
      `)
      .single()

    if (error) {
      console.error('Application creation error:', error)
      throw error
    }
    
    console.log('Application created successfully:', data?.id)
    return data
  }

  static async createSubsidyApplication(applicationData: Partial<SubsidyApplication>) {
    // RLSをバイパスするためにsupabaseAdminを使用
    const { data, error } = await supabaseAdmin
      .from('applications')
      .insert(applicationData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateApplication(applicationId: string, updateData: Partial<SubsidyApplication>) {
    // RLSの問題を避けるためにsupabaseAdminを使用
    const { data, error } = await supabaseAdmin
      .from('applications')
      .update(updateData)
      .eq('id', applicationId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateSubsidyApplication(applicationId: string, updateData: Partial<SubsidyApplication>) {
    const { data, error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', applicationId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getSubsidyApplication(applicationId: string) {
    try {
      console.log('Getting application with ID:', applicationId)
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('Service Role Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
      
      // まず、すべてのアプリケーションを取得してIDが存在するか確認
      const { data: allApps, error: allAppsError } = await supabaseAdmin
        .from('applications')
        .select('id, company_name, status')
        .limit(50)
      
      console.log('All applications in database:', allApps?.map(app => ({ id: app.id, name: app.company_name, status: app.status })))
      
      if (allAppsError) {
        console.error('Error fetching all applications:', allAppsError)
      }
      
      // 特定のIDをチェック
      const targetExists = allApps?.find(app => app.id === applicationId)
      console.log('Target application exists in database:', targetExists)
      
      // 通常のクエリ
      const { data: applicationData, error: applicationError } = await supabaseAdmin
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .maybeSingle()

      console.log('Application query result:', { applicationData, applicationError })

      if (applicationError) {
        console.error('Application query error:', applicationError)
        throw applicationError
      }

      if (!applicationData) {
        console.log('No application found for ID:', applicationId)
        return null
      }

      // 基本の申請データを取得した後、関連データを個別に取得
      const result = { ...applicationData }

      // 会社情報を取得
      if (result.company_id) {
        const { data: companyData } = await supabaseAdmin
          .from('companies')
          .select('*')
          .eq('id', result.company_id)
          .maybeSingle()
        
        if (companyData) {
          result.company = companyData
        }
      }

      // ユーザープロファイル情報を取得
      if (result.user_id) {
        const { data: userProfileData } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .eq('id', result.user_id)
          .maybeSingle()
        
        if (userProfileData) {
          result.user_profile = userProfileData
        }
      }

      // ドキュメント数を取得
      const { count: documentsCount } = await supabaseAdmin
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('application_id', applicationId)
      
      result.documents_count = documentsCount || 0

      console.log('Final application data:', result)
      return result
      
    } catch (error) {
      console.error('Error in getSubsidyApplication:', error)
      throw error
    }
  }

  static async getApplicationsByUser(userId: string) {
    // RLSの問題を避けるためにsupabaseAdminを使用
    const { data, error } = await supabaseAdmin
      .from('applications')
      .select(`
        *,
        company:companies(*),
        documents(count)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async getSubsidyApplicationsByUser(userId: string) {
    // RLSの問題を避けるためにsupabaseAdminを使用
    const { data, error } = await supabaseAdmin
      .from('applications')
      .select(`
        *,
        company:companies(*),
        documents(count)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async getSubsidyApplicationsByCompany(companyId: string) {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        user_profile:user_profiles(*),
        documents(count),
        deadlines(*)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async getAllApplicationsForAdmin() {
    // RLSの問題を避けるためにsupabaseAdminを使用
    const { data, error } = await supabaseAdmin
      .from('applications')
      .select(`
        *,
        company:companies(*),
        user_profile:user_profiles(*),
        documents(count),
        deadlines(*)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async getAllSubsidyApplicationsForAdmin() {
    try {
      console.log('Getting all applications for admin dashboard...')
      
      // RLSの問題を避けるためにsupabaseAdminを使用
      const { data, error } = await supabaseAdmin
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('Applications query result:', { count: data?.length, error })

      if (error) {
        console.error('Applications query error:', error)
        throw error
      }

      // Supabaseにデータがない場合は必ず空配列を返す（デモデータやローカルストレージは使用しない）
      if (!data || data.length === 0) {
        console.log('No applications found in database - returning empty array')
        return []
      }

      // 各申請に関連データを個別に追加
      const enrichedApplications = await Promise.all(
        data.map(async (app) => {
          const result = { ...app }

          // 会社情報を取得
          if (app.company_id) {
            const { data: companyData } = await supabaseAdmin
              .from('companies')
              .select('*')
              .eq('id', app.company_id)
              .maybeSingle()
            
            if (companyData) {
              result.company = companyData
            }
          }

          // ユーザープロファイル情報を取得
          if (app.user_id) {
            const { data: userProfileData } = await supabaseAdmin
              .from('user_profiles')
              .select('*')
              .eq('id', app.user_id)
              .maybeSingle()
            
            if (userProfileData) {
              result.user_profile = userProfileData
            }
          }

          // ドキュメント数を取得
          const { count: documentsCount } = await supabaseAdmin
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('application_id', app.id)
          
          result.documents_count = documentsCount || 0

          return result
        })
      )

      console.log('Enriched applications from database only:', enrichedApplications.map(app => ({ id: app.id, name: app.company_name, status: app.status })))
      return enrichedApplications

    } catch (error) {
      console.error('Error in getAllSubsidyApplicationsForAdmin:', error)
      // エラーが発生した場合でも、デモデータではなく空配列を返す
      return []
    }
  }

  // ドキュメント関連
  static async createDocument(documentData: Partial<Document>) {
    const { data, error } = await supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateDocument(documentId: string, updateData: Partial<Document>) {
    const { data, error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getDocumentsBySubsidyApplication(applicationId: string) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async deleteDocument(documentId: string) {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (error) throw error
  }

  // AI解析結果関連（現在は無効）
  // 将来的にAI機能を実装する場合に使用
  /*
  static async createAIAnalysis(analysisData: any) {
    const { data, error } = await supabase
      .from('ai_analysis_results')
      .insert(analysisData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateAIAnalysis(analysisId: string, updateData: any) {
    const { data, error } = await supabase
      .from('ai_analysis_results')
      .update(updateData)
      .eq('id', analysisId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getAIAnalysis(documentId: string) {
    const { data, error } = await supabase
      .from('ai_analysis_results')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }
  */

  // 期限管理関連
  static async createDeadline(deadlineData: {
    application_id: string
    deadline_type: string
    deadline_date: string
    is_overridden?: boolean
    original_date?: string
    override_reason?: string
  }) {
    // RLSをバイパスするためにsupabaseAdminを使用
    const { data, error } = await supabaseAdmin
      .from('deadlines')
      .insert(deadlineData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateDeadline(deadlineId: string, updateData: {
    deadline_date?: string
    is_overridden?: boolean
    original_date?: string
    override_reason?: string
    alert_sent?: boolean
  }) {
    const { data, error } = await supabase
      .from('deadlines')
      .update(updateData)
      .eq('id', deadlineId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getUpcomingDeadlines(daysBefore: number = 14) {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + daysBefore)

    const { data, error } = await supabase
      .from('deadlines')
      .select(`
        *,
        application:applications(*,
          company:companies(*)
        )
      `)
      .lte('deadline_date', targetDate.toISOString().split('T')[0])
      .eq('alert_sent', false)
      .order('deadline_date', { ascending: true })

    if (error) throw error
    return data
  }

  // 管理者アクション関連
  static async logAdminAction(actionData: {
    admin_user_id: string
    application_id?: string
    action_type: string
    description?: string
    metadata?: any
  }) {
    const { data, error } = await supabase
      .from('admin_actions')
      .insert(actionData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getAdminActions(applicationId?: string, limit: number = 50) {
    let query = supabase
      .from('admin_actions')
      .select(`
        *,
        admin_user:user_profiles(*),
        application:applications(*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (applicationId) {
      query = query.eq('application_id', applicationId)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  }

  // システム設定関連
  static async getSystemSetting(key: string) {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', key)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data?.setting_value
  }

  static async updateSystemSetting(key: string, value: string) {
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({ setting_key: key, setting_value: value })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // 助成金書類管理関連
  static async getSubsidyTypes() {
    // RLSをバイパスするためにsupabaseAdminを使用
    const { data, error } = await supabaseAdmin
      .from('subsidy_types')
      .select(`
        *,
        subsidy_required_documents(*)
      `)
      .eq('is_active', true)
      .order('code')

    if (error) throw error
    return data
  }

  static async getSubsidyRequiredDocuments(subsidyTypeId: string) {
    const { data, error } = await supabaseAdmin
      .from('subsidy_required_documents')
      .select('*')
      .eq('subsidy_type_id', subsidyTypeId)
      .order('sort_order')

    if (error) throw error
    return data
  }

  static async createSubsidyRequiredDocument(documentData: {
    subsidy_type_id: string
    document_key: string
    document_name: string
    description?: string
    is_required?: boolean
    sort_order?: number
    file_types?: string
    max_file_size?: number
  }) {
    const { data, error } = await supabaseAdmin
      .from('subsidy_required_documents')
      .insert(documentData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateSubsidyRequiredDocument(documentId: string, updateData: {
    document_name?: string
    description?: string
    is_required?: boolean
    sort_order?: number
    file_types?: string
    max_file_size?: number
  }) {
    const { data, error } = await supabaseAdmin
      .from('subsidy_required_documents')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteSubsidyRequiredDocument(documentId: string) {
    const { error } = await supabaseAdmin
      .from('subsidy_required_documents')
      .delete()
      .eq('id', documentId)

    if (error) throw error
  }

  // 書類確認点管理関連
  static async getDocumentCheckpoints(requiredDocumentId: string) {
    const { data, error } = await supabaseAdmin
      .from('document_checkpoints')
      .select('*')
      .eq('required_document_id', requiredDocumentId)
      .order('check_order')

    if (error) throw error
    return data
  }

  static async createDocumentCheckpoint(checkpointData: {
    required_document_id: string
    checkpoint_key: string
    checkpoint_title: string
    checkpoint_description?: string
    ai_prompt?: string
    is_required?: boolean
    check_order?: number
    expected_result_type?: string
    validation_criteria?: any
  }) {
    const { data, error } = await supabaseAdmin
      .from('document_checkpoints')
      .insert(checkpointData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateDocumentCheckpoint(checkpointId: string, updateData: {
    checkpoint_title?: string
    checkpoint_description?: string
    ai_prompt?: string
    is_required?: boolean
    check_order?: number
    expected_result_type?: string
    validation_criteria?: any
  }) {
    const { data, error } = await supabaseAdmin
      .from('document_checkpoints')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', checkpointId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteDocumentCheckpoint(checkpointId: string) {
    const { error } = await supabaseAdmin
      .from('document_checkpoints')
      .delete()
      .eq('id', checkpointId)

    if (error) throw error
  }

  // 書類確認結果関連
  static async getDocumentCheckResults(documentId: string) {
    const { data, error } = await supabaseAdmin
      .from('document_check_results')
      .select(`
        *,
        checkpoint:document_checkpoints(*)
      `)
      .eq('document_id', documentId)

    if (error) throw error
    return data
  }

  static async createDocumentCheckResult(resultData: {
    document_id: string
    checkpoint_id: string
    check_result: any
    ai_confidence_score?: number
    manual_override?: boolean
    checked_by_admin?: string
    check_status?: string
    admin_notes?: string
  }) {
    const { data, error } = await supabaseAdmin
      .from('document_check_results')
      .insert(resultData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateDocumentCheckResult(resultId: string, updateData: {
    check_result?: any
    ai_confidence_score?: number
    manual_override?: boolean
    checked_by_admin?: string
    check_status?: string
    admin_notes?: string
  }) {
    const { data, error } = await supabaseAdmin
      .from('document_check_results')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', resultId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // 統計・集計関連
  static async getDashboardStats(companyId?: string) {
    // RLSの問題を避けるためにsupabaseAdminを使用
    let applicationsQuery = supabaseAdmin
      .from('applications')
      .select('status')

    if (companyId) {
      applicationsQuery = applicationsQuery.eq('company_id', companyId)
    }

    const { data: applications, error: appsError } = await applicationsQuery

    if (appsError) throw appsError

    const stats = {
      total: applications.length,
      draft: applications.filter(app => app.status === 'draft').length,
      in_progress: applications.filter(app => app.status === 'in_progress').length,
      review: applications.filter(app => app.status === 'review').length,
      completed: applications.filter(app => app.status === 'completed').length,
      rejected: applications.filter(app => app.status === 'rejected').length,
    }

    return stats
  }

  static async getRecentActivity(companyId?: string, limit: number = 10) {
    // RLSの問題を避けるためにsupabaseAdminを使用
    let query = supabaseAdmin
      .from('applications')
      .select(`
        *,
        company:companies(*),
        user_profile:user_profiles(*)
      `)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  }
}