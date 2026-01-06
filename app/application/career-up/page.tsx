'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import FileUpload from '@/components/FileUpload'
import AICheckResult from '@/components/AICheckResult'
import { UploadService } from '@/lib/uploadService'
import { Document } from '@/types/database'
import { ApplicationInfo } from '@/types/deadline'

interface RequiredDocument {
  id: string
  subsidy_type_id: string
  document_key: string
  document_name: string
  description: string | null
  checkpoints: string | null
  is_required: boolean
  sort_order: number
  file_types: string
  max_file_size: number
}

export default function CareerUpApplicationPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<Document[]>([])
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>([])
  const [uploadStates, setUploadStates] = useState<{ [key: string]: { status: 'pending' | 'uploading' | 'completed' | 'error', fileName?: string } }>({})
  const [allUploadsCompleted, setAllUploadsCompleted] = useState(false)
  const [applicationInfo, setApplicationInfo] = useState<ApplicationInfo | null>(null)
  const [subsidyTypeId, setSubsidyTypeId] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // URLパラメータから申請IDを取得
  const applicationId = searchParams.get('id') || ''
  
  // UUID形式かどうかをチェック
  const isUUIDFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(applicationId)
  const isOldFormat = applicationId.includes('-') && !isUUIDFormat

  useEffect(() => {
    // 申請IDが無い場合は助成金選択ページにリダイレクト
    if (!applicationId) {
      router.push('/subsidies')
      return
    }
    
    const checkUser = async () => {
      // Supabase認証チェック
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)
    }

    checkUser()
  }, [router, applicationId])
  
  // アプリケーションIDが設定された後に初期化処理を実行
  useEffect(() => {
    if (applicationId && user) {
      loadApplicationInfo()
      loadRequiredDocuments()
      loadDocuments()
    }
  }, [applicationId, user])

  // アップロード状態が変わったら全体のアップロード完了をチェック
  useEffect(() => {
    checkAllUploadsCompleted()
  }, [uploadStates, requiredDocuments])

  const loadApplicationInfo = async () => {
    try {
      if (!user) return
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.error('No session found')
        return
      }

      // Supabaseから申請データを取得
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('申請データの取得に失敗しました')
      }

      const data = await response.json()
      const app = data.application
      
      if (app) {
        setApplicationInfo({
          id: app.id,
          companyName: app.company_name,
          representativeName: app.representative_name,
          planStartDate: app.plan_start_date,
          planEndDate: app.plan_end_date,
          applicationDeadlineStart: app.application_deadline,
          applicationDeadlineEnd: app.application_deadline,
          isDeadlineOverridden: false,
          created_at: app.created_at,
          updated_at: app.updated_at,
          review_comments: app.review_comments
        })
      }
    } catch (error) {
      console.error('申請データ読み込みエラー:', error)
      // フォールバック: ローカルストレージから読み込み（一時的）
      const savedData = localStorage.getItem(`applicationInfo_${applicationId}`)
      if (savedData) {
        setApplicationInfo(JSON.parse(savedData))
      }
    }
  }

  const loadRequiredDocuments = async () => {
    try {
      if (!subsidyTypeId) {
        // まず助成金タイプIDを取得
        const { data: subsidyType } = await supabase
          .from('subsidy_types')
          .select('id')
          .eq('code', 'career_up')
          .single()
        
        if (subsidyType) {
          setSubsidyTypeId(subsidyType.id)
          await loadRequiredDocumentsById(subsidyType.id)
        }
      } else {
        await loadRequiredDocumentsById(subsidyTypeId)
      }
    } catch (error) {
      console.error('助成金タイプ取得エラー:', error)
    }
  }

  const loadRequiredDocumentsById = async (typeId: string) => {
    try {
      const response = await fetch(`/api/admin/subsidies/${typeId}/documents`)
      if (!response.ok) {
        throw new Error('必要書類の取得に失敗しました')
      }
      const data = await response.json()
      setRequiredDocuments(data.documents || [])
      
      // uploadStatesを動的に初期化
      const initialStates: { [key: string]: { status: 'pending' | 'uploading' | 'completed' | 'error', fileName?: string } } = {}
      data.documents.forEach((doc: RequiredDocument) => {
        initialStates[doc.document_key] = { status: 'pending' }
      })
      setUploadStates(initialStates)
    } catch (error) {
      console.error('必要書類読み込みエラー:', error)
    }
  }


  const loadDocuments = async () => {
    const { documents: docs, error } = await UploadService.getApplicationDocuments(applicationId)
    if (!error) {
      setDocuments(docs)
      
      // アップロード状態を更新（動的に管理）
      setUploadStates(prev => {
        const newStates = { ...prev }
        docs.forEach(doc => {
          newStates[doc.document_type] = {
            status: doc.upload_status === 'completed' ? 'completed' : 'error',
            fileName: doc.file_name
          }
        })
        return newStates
      })
    }
  }

  const handleFileUpload = async (file: File, documentType: string) => {
    if (!user) return

    try {
      // アップロード状態を更新
      setUploadStates(prev => ({
        ...prev,
        [documentType]: { status: 'uploading', fileName: file.name }
      }))

      const result = await UploadService.uploadDocument(
        applicationId,
        documentType,
        file,
        (status) => {
          setUploadStates(prev => ({
            ...prev,
            [documentType]: { status, fileName: file.name }
          }))
        }
      )

      if (result.success && result.document) {
        // ドキュメント一覧を再読み込み
        await loadDocuments()
        
        setUploadStates(prev => ({
          ...prev,
          [documentType]: { status: 'completed', fileName: file.name }
        }))

        // 全ての書類のアップロードが完了したかチェック
        checkAllUploadsCompleted()
      } else {
        setUploadStates(prev => ({
          ...prev,
          [documentType]: { status: 'error', fileName: file.name }
        }))
      }
    } catch (error) {
      setUploadStates(prev => ({
        ...prev,
        [documentType]: { status: 'error', fileName: file.name }
      }))
    }
  }

  // 書類のAIチェック結果を取得する関数
  const getAICheckResult = (documentType: string) => {
    const document = documents.find(doc => doc.document_type === documentType)
    return {
      documentId: document?.id,
      analysis: document?.ai_check_result && document?.ai_check_status === 'completed' 
        ? document.ai_check_result 
        : undefined,
      checkedAt: document?.ai_checked_at || document?.updated_at
    }
  }

  const checkAllUploadsCompleted = () => {
    if (requiredDocuments.length === 0) {
      setAllUploadsCompleted(false)
      return
    }
    
    const requiredTypes = requiredDocuments
      .filter(doc => doc.is_required)
      .map(doc => doc.document_key)
    
    const hasAllUploads = requiredTypes.every(type =>
      uploadStates[type]?.status === 'completed'
    )
    
    setAllUploadsCompleted(hasAllUploads)
  }

  const handleBack = () => {
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    )
  }

  if (!applicationId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">申請IDが見つかりません</h2>
          <p className="text-gray-600 mb-6">助成金選択ページから申請を開始してください。</p>
          <button
            onClick={() => router.push('/subsidies')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            助成金選択ページへ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <button
              onClick={handleBack}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className="w-8 h-8 bg-blue-600 rounded-lg mr-3 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              キャリアアップ助成金 申請
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            {!user && (
              <button
                onClick={() => router.push('/auth/login')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                ログイン
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* 未ログイン時の警告 */}
        {!user && (
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <h3 className="text-lg font-semibold text-yellow-800">ログインが必要です</h3>
            </div>
            <p className="text-yellow-700 mb-3">ファイルアップロードには認証が必要です。</p>
            <button
              onClick={() => router.push('/auth/login')}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              ログイン
            </button>
          </div>
        )}

        {/* 締切アラート（申請情報がある場合のみ） */}
        {applicationInfo && (() => {
          try {
            const deadline = DeadlineCalculator.calculateDeadlines(applicationInfo.planStartDate)
            const urgencyStyle = DeadlineCalculator.getUrgencyStyle(deadline.daysUntilDeadline)
            
            if (deadline.daysUntilDeadline <= 30 && deadline.daysUntilDeadline >= 0) {
              return (
                <div className={`border-l-4 p-4 mb-8 rounded-r-lg ${urgencyStyle.bgColor} ${
                  deadline.daysUntilDeadline <= 7 ? 'border-red-400' :
                  deadline.daysUntilDeadline <= 14 ? 'border-orange-400' : 'border-yellow-400'
                }`}>
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className={`h-5 w-5 ${
                        deadline.daysUntilDeadline <= 7 ? 'text-red-400' :
                        deadline.daysUntilDeadline <= 14 ? 'text-orange-400' : 'text-yellow-400'
                      }`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <div className="flex items-center space-x-3">
                        <h3 className={`text-sm font-medium ${urgencyStyle.textColor}`}>
                          {deadline.daysUntilDeadline <= 7 ? '申請期限が迫っています！' :
                           deadline.daysUntilDeadline <= 14 ? '申請期限が近づいています' : '申請期限にご注意ください'}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${urgencyStyle.badgeColor}`}>
                          {DeadlineCalculator.getDaysUntilDeadlineText(deadline.daysUntilDeadline)}
                        </span>
                      </div>
                      <p className={`mt-1 text-sm ${urgencyStyle.textColor}`}>
                        申請期限: {DeadlineCalculator.formatDateJapanese(deadline.applicationDeadlineEnd)}まで
                        {deadline.daysUntilDeadline <= 7 && 
                          <span className="ml-2 font-medium">期限を過ぎると助成金を受給できなくなります。</span>
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )
            }
            return null
          } catch (error) {
            console.warn('Error calculating deadline:', error)
            return null
          }
        })()}

        {/* 申請概要 */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8">
          <div className="flex items-start mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">キャリアアップ助成金</h2>
              <p className="text-gray-600 mb-4">
                有期雇用労働者等の正規雇用労働者への転換や処遇改善の取組みを実施した事業主に助成する制度です。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">助成額目安</div>
                  <div className="text-lg font-bold text-gray-900">57万円〜</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">申請期限</div>
                  <div className="text-lg font-bold text-gray-900">転換後6ヶ月分賃金支払完了日翌日から2ヶ月以内</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">処理時間</div>
                  <div className="text-lg font-bold text-gray-900">約2-3ヶ月</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 差し戻しコメント表示 */}
        {applicationInfo?.review_comments && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800">申請が差し戻されました</h3>
                <p className="text-red-600 text-sm">管理者からのコメントを確認し、必要な修正を行ってください。</p>
              </div>
            </div>
            <div className="bg-red-100 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <svg className="w-4 h-4 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.954 8.954 0 01-2.965-.505L9 19.5l-.965-2.5A8.954 8.954 0 016 19a8 8 0 01-8-8 8 8 0 0116 0z"/>
                </svg>
                <span className="text-sm font-medium text-red-800">管理者からのコメント</span>
              </div>
              <p className="text-red-700">{applicationInfo.review_comments}</p>
            </div>
          </div>
        )}

        {/* 申請情報表示 */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">申請情報</h3>
          
          {/* 会社情報と計画開始日の表示 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600 mb-1">会社名</div>
              <div className="font-medium text-gray-900">
                {applicationInfo?.companyName || user?.user_metadata?.company_name || 'サンプル株式会社'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">代表者名</div>
              <div className="font-medium text-gray-900">
                {applicationInfo?.representativeName || user?.user_metadata?.representative_name || '山田 太郎'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">正社員転換実施日</div>
              <div className="font-medium text-gray-900">
                {applicationInfo?.planStartDate ? 
                  new Date(applicationInfo.planStartDate).toLocaleDateString('ja-JP') : 
                  '読み込み中...'}
              </div>
            </div>
          </div>
          
          {!applicationInfo?.planStartDate && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                申請情報を読み込んでいます。もし正社員転換実施日が表示されない場合は、助成金選択ページからやり直してください。
              </p>
            </div>
          )}
        </div>

        {/* 必要書類のアップロード */}
        {applicationId && (
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">必要書類のアップロード</h3>
            <p className="text-gray-600 mb-6">キャリアアップ助成金の申請に必要な書類をアップロードしてください。</p>
            
            <div className="space-y-6">
              {requiredDocuments.length > 0 ? (
                requiredDocuments.map((doc, index) => (
                  <div key={doc.id} className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {`${index + 1}. ${doc.document_name}`}
                      {doc.is_required && <span className="text-red-500 ml-1">*</span>}
                    </h4>
                    {doc.description && (
                      <p className="text-sm text-gray-600 mb-4">
                        {doc.description}
                      </p>
                    )}
                    <FileUpload
                      documentType={doc.document_key}
                      onFileSelect={(file) => handleFileUpload(file, doc.document_key)}
                      uploadState={uploadStates[doc.document_key] || { status: 'pending' }}
                      isReadOnly={!user}
                      acceptedFileTypes={doc.file_types}
                      maxFileSize={doc.max_file_size}
                    />
                    {uploadStates[doc.document_key]?.status === 'completed' && (() => {
                      const aiResult = getAICheckResult(doc.document_key)
                      return (
                        <AICheckResult
                          documentId={aiResult.documentId}
                          documentName={doc.document_name}
                          analysis={aiResult.analysis}
                          checkedAt={aiResult.checkedAt}
                          onAnalysisComplete={loadDocuments}
                        />
                      )
                    })()}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  必要書類を読み込んでいます...
                </div>
              )}
            </div>
          </div>
        )}


        {/* 申請ボタン */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {allUploadsCompleted ? '書類アップロード完了' : '申請書類の準備'}
              </h3>
              <p className="text-gray-600">
                {allUploadsCompleted 
                  ? '全ての必要書類のアップロードが完了しました。申請を提出してください。'
                  : '必要書類をアップロードしてから申請を提出してください。'
                }
              </p>
            </div>
            <button
              onClick={async () => {
                if (!applicationInfo) return
                if (!allUploadsCompleted) return

                try {
                  // Supabaseのapplicationsテーブルのステータスを「review」（審査待ち）に更新
                  const { data: { session } } = await supabase.auth.getSession()
                  
                  if (!session) {
                    alert('認証エラーです。ページを再読み込みしてください。')
                    return
                  }

                  const response = await fetch(`/api/applications/${applicationId}`, {
                    method: 'PUT',
                    headers: {
                      'Authorization': `Bearer ${session.access_token}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      status: 'review',
                      review_comments: null // 再提出時にコメントをクリア
                    })
                  })

                  if (!response.ok) {
                    throw new Error('申請ステータスの更新に失敗しました')
                  }

                  alert('申請が提出されました！審査をお待ちください。')
                  router.push('/dashboard')
                } catch (error) {
                  console.error('申請提出エラー:', error)
                  alert('申請提出中にエラーが発生しました。')
                }
              }}
              disabled={!allUploadsCompleted}
              className={`px-8 py-3 rounded-lg transition-colors font-medium text-lg ${
                allUploadsCompleted 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              申請を提出
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
