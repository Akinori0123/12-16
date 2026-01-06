'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { ApplicationInfo } from '@/types/deadline'
import { Document } from '@/types/database'
import { DeadlineCalculator } from '@/lib/deadlineUtils'

interface ApplicationStatus {
  stage: 'preparation' | 'document_upload' | 'ai_analysis' | 'document_generation' | 'submission' | 'review' | 'completed'
  percentage: number
  currentStep: string
  nextAction: string
}

interface StatusStep {
  id: string
  title: string
  description: string
  status: 'completed' | 'current' | 'pending'
  completedAt?: string
}

function ApplicationStatusPageContent() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [applicationInfo, setApplicationInfo] = useState<ApplicationInfo | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus | null>(null)
  const [statusSteps, setStatusSteps] = useState<StatusStep[]>([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const applicationId = searchParams?.get('applicationId') || 'demo-application-001'

  useEffect(() => {
    const checkUser = async () => {
      // デモユーザーチェック
      const demoUser = localStorage.getItem('demoUser')
      if (demoUser) {
        const userData = JSON.parse(demoUser)
        
        // 管理者の場合は申請関連ページにアクセス禁止
        if (userData.email === 'admin@tm-consultant.com') {
          router.push('/admin/dashboard')
          return
        }
        
        setUser({
          id: userData.id,
          email: userData.email,
          aud: 'authenticated',
          role: 'authenticated',
          email_confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: { company_name: userData.company_name },
          identities: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as User)
        
        loadApplicationData()
        setLoading(false)
        return
      }

      // 通常のSupabase認証チェック
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      
      if (session?.user) {
        loadApplicationData()
      } else {
        router.push('/auth/login')
      }
      
      setLoading(false)
    }

    checkUser()
  }, [router, applicationId])

  const loadApplicationData = () => {
    // 申請情報を読み込み
    const savedData = localStorage.getItem(`applicationInfo_${applicationId}`)
    if (savedData) {
      setApplicationInfo(JSON.parse(savedData))
    }

    // ドキュメント情報を読み込み
    const demoDocuments = JSON.parse(localStorage.getItem('demoDocuments') || '[]')
    const filteredDocs = demoDocuments.filter((doc: Document) => doc.application_id === applicationId)
    setDocuments(filteredDocs)

    // ステータス計算
    calculateApplicationStatus()
  }

  const calculateApplicationStatus = () => {
    const savedData = localStorage.getItem(`applicationInfo_${applicationId}`)
    const applicationInfo = savedData ? JSON.parse(savedData) : null
    const demoDocuments = JSON.parse(localStorage.getItem('demoDocuments') || '[]')
    const filteredDocs = demoDocuments.filter((doc: Document) => doc.application_id === applicationId)

    let stage: ApplicationStatus['stage'] = 'preparation'
    let percentage = 0
    let currentStep = '基本情報入力'
    let nextAction = '会社情報とキャリアアップ計画開始日を入力してください'

    const steps: StatusStep[] = [
      {
        id: 'basic_info',
        title: '基本情報入力',
        description: '会社情報、代表者名、計画期間の設定',
        status: 'pending'
      },
      {
        id: 'document_upload_analysis',
        title: '書類アップロード・AI分析',
        description: '必要書類のアップロードと同時AI分析実行',
        status: 'pending'
      },
      {
        id: 'document_generation',
        title: '申請書類生成',
        description: '労働局提出用書類の自動生成',
        status: 'pending'
      },
      {
        id: 'submission',
        title: '労働局への提出',
        description: '生成された書類の労働局への提出',
        status: 'pending'
      },
      {
        id: 'review',
        title: '審査待ち',
        description: '労働局での審査（通常2-3ヶ月）',
        status: 'pending'
      },
      {
        id: 'completed',
        title: '申請完了',
        description: '助成金の交付決定・支給',
        status: 'pending'
      }
    ]

    // 基本情報チェック
    if (applicationInfo?.companyName && applicationInfo?.representativeName && applicationInfo?.planStartDate) {
      steps[0].status = 'completed'
      steps[0].completedAt = applicationInfo.updated_at
      stage = 'document_upload'
      percentage = 20
      currentStep = '書類アップロード・AI分析'
      nextAction = '就業規則、出勤簿、賃金台帳をアップロードしてください（AI分析も自動実行されます）'
      
      // 書類アップロードとAI分析チェック
      if (filteredDocs.length >= 3) {
        // AI分析チェック（簡易的にローカルストレージから判定）
        const hasAiAnalysis = localStorage.getItem('aiAnalysisCompleted') || filteredDocs.length >= 3
        if (hasAiAnalysis) {
          steps[1].status = 'completed'
          steps[1].completedAt = new Date().toISOString()
          stage = 'document_generation'
          percentage = 50
          currentStep = '申請書類生成'
          nextAction = '申請書類を生成してください'
          
          // 書類生成チェック
          const hasGeneratedDocs = localStorage.getItem('documentsGenerated')
          if (hasGeneratedDocs) {
            steps[2].status = 'completed'
            steps[2].completedAt = new Date().toISOString()
            stage = 'submission'
            percentage = 75
            currentStep = '労働局への提出'
            nextAction = '生成された書類を労働局に提出してください'
            
            // 提出チェック
            const isSubmitted = localStorage.getItem('documentsSubmitted')
            if (isSubmitted) {
              steps[3].status = 'completed'
              steps[3].completedAt = new Date().toISOString()
              stage = 'review'
              percentage = 90
              currentStep = '審査待ち'
              nextAction = '審査結果をお待ちください（通常2-3ヶ月）'
            }
          }
        }
      }
    }

    // 現在のステップを設定
    const currentStepIndex = steps.findIndex(step => step.status === 'pending')
    if (currentStepIndex > 0) {
      steps[currentStepIndex - 1].status = 'completed'
    }
    if (currentStepIndex >= 0) {
      steps[currentStepIndex].status = 'current'
    }

    setApplicationStatus({ stage, percentage, currentStep, nextAction })
    setStatusSteps(steps)
  }

  const handleDownloadDocument = (documentName: string) => {
    // ダウンロード処理のシミュレート
    const link = document.createElement('a')
    link.href = '#'
    link.download = `${documentName}_${new Date().toISOString().split('T')[0]}.pdf`
    link.click()
  }

  const simulateNextStep = () => {
    // デモ用の次ステップシミュレート
    if (!applicationStatus) return

    switch (applicationStatus.stage) {
      case 'document_upload':
        localStorage.setItem('aiAnalysisCompleted', 'true')
        break
      case 'document_generation':
        localStorage.setItem('documentsGenerated', 'true')
        break
      case 'submission':
        localStorage.setItem('documentsSubmitted', 'true')
        break
    }
    
    // ステータスを再計算
    calculateApplicationStatus()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">ログインが必要です</h2>
          <button
            onClick={() => router.push('/auth/login')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            ログインページへ
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
              onClick={() => router.push('/applications')}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className="w-8 h-8 bg-blue-600 rounded-lg mr-3 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">申請状況詳細</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user.email}</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* 申請概要 */}
        {applicationInfo && (
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{applicationInfo.companyName}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">代表者名</div>
                <div className="font-medium">{applicationInfo.representativeName}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">計画期間</div>
                <div className="font-medium">
                  {applicationInfo.planStartDate && DeadlineCalculator.formatDateJapanese(new Date(applicationInfo.planStartDate))}
                  {applicationInfo.planEndDate && ` 〜 ${DeadlineCalculator.formatDateJapanese(new Date(applicationInfo.planEndDate))}`}
                </div>
              </div>
              {applicationInfo.planStartDate && (
                <div className="md:col-span-2">
                  <div className="text-sm text-gray-600">申請期限</div>
                  <div className="font-medium">
                    {(() => {
                      const deadline = DeadlineCalculator.calculateDeadlines(applicationInfo.planStartDate)
                      return `${DeadlineCalculator.formatDateJapanese(deadline.applicationDeadlineStart)} 〜 ${DeadlineCalculator.formatDateJapanese(deadline.applicationDeadlineEnd)}`
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 進捗状況 */}
        {applicationStatus && (
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">申請進捗</h3>
            
            {/* プログレスバー */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">進捗状況</span>
                <span className="text-sm font-medium text-gray-700">{applicationStatus.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${applicationStatus.percentage}%` }}
                ></div>
              </div>
            </div>

            {/* 現在のステップ */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <div>
                  <div className="font-medium text-blue-800">現在のステップ: {applicationStatus.currentStep}</div>
                  <div className="text-blue-700 text-sm">{applicationStatus.nextAction}</div>
                </div>
              </div>
              {applicationStatus.stage !== 'completed' && (
                <button
                  onClick={simulateNextStep}
                  className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  次のステップに進む（デモ）
                </button>
              )}
            </div>
          </div>
        )}

        {/* ステップ詳細 */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">申請ステップ</h3>
          
          <div className="space-y-4">
            {statusSteps.map((step, index) => (
              <div key={step.id} className="flex items-start">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 ${
                  step.status === 'completed' 
                    ? 'bg-green-500 text-white' 
                    : step.status === 'current'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {step.status === 'completed' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className={`font-semibold ${
                    step.status === 'completed' 
                      ? 'text-green-700' 
                      : step.status === 'current'
                      ? 'text-blue-700'
                      : 'text-gray-500'
                  }`}>
                    {step.title}
                  </h4>
                  <p className={`text-sm ${
                    step.status === 'completed' 
                      ? 'text-green-600' 
                      : step.status === 'current'
                      ? 'text-blue-600'
                      : 'text-gray-500'
                  }`}>
                    {step.description}
                  </p>
                  {step.completedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      完了日: {new Date(step.completedAt).toLocaleDateString('ja-JP')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* アップロード済み書類 */}
        {documents.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">アップロード済み書類</h3>
            
            <div className="space-y-3">
              {documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-8 h-8 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-5L9 2H4z" clipRule="evenodd"/>
                    </svg>
                    <div>
                      <div className="font-medium text-gray-900">{doc.file_name}</div>
                      <div className="text-sm text-gray-500">
                        アップロード日: {new Date(doc.created_at || new Date()).toLocaleDateString('ja-JP')}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadDocument(doc.file_name)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    ダウンロード
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 生成された書類 */}
        {localStorage.getItem('documentsGenerated') && (
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">生成された申請書類</h3>
            
            <div className="space-y-3">
              {[
                'キャリアアップ助成金申請書',
                '計画書',
                '就業規則確認書',
                '賃金台帳確認書'
              ].map((docName, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-8 h-8 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-5L9 2H4z" clipRule="evenodd"/>
                    </svg>
                    <div>
                      <div className="font-medium text-gray-900">{docName}</div>
                      <div className="text-sm text-gray-500">
                        生成日: {new Date().toLocaleDateString('ja-JP')}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadDocument(docName)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    ダウンロード
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ApplicationStatusPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-600">読み込み中...</div></div>}>
      <ApplicationStatusPageContent />
    </Suspense>
  )
}