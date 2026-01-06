'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { ApplicationInfo } from '@/types/deadline'
import { Document } from '@/types/database'

export default function DocumentGenerationPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [applicationInfo, setApplicationInfo] = useState<ApplicationInfo | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedDocuments, setGeneratedDocuments] = useState<string[]>([])
  const router = useRouter()
  
  const applicationId = 'demo-application-001'

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
        
        // 申請情報を読み込み
        loadApplicationData()
        setLoading(false)
        return
      }

      // 通常のSupabase認証チェック
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      
      if (session?.user) {
        loadApplicationData()
      }
      
      setLoading(false)
    }

    checkUser()
  }, [router])

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
  }

  const handleGenerateDocuments = async () => {
    setIsGenerating(true)
    
    // 生成プロセスをシミュレート
    const documentTypes = [
      'キャリアアップ助成金申請書',
      '計画書',
      '就業規則確認書',
      '賃金台帳確認書'
    ]
    
    for (let i = 0; i < documentTypes.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500)) // 各書類1.5秒
      setGeneratedDocuments(prev => [...prev, documentTypes[i]])
    }
    
    setIsGenerating(false)
  }

  const handleDownloadDocument = async (documentName: string) => {
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationInfo,
          documentType: documentName,
        }),
      })

      if (!response.ok) {
        throw new Error('PDF生成に失敗しました')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${documentName}_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF生成エラー:', error)
      alert('PDF生成中にエラーが発生しました。もう一度お試しください。')
    }
  }

  const isReadyToGenerate = () => {
    return applicationInfo?.companyName && 
           applicationInfo?.representativeName && 
           applicationInfo?.planStartDate &&
           documents.length >= 3 // 必須書類3つ
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
              onClick={() => router.push('/application/career-up')}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className="w-8 h-8 bg-blue-600 rounded-lg mr-3 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">申請書類生成</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user.email}</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* 進捗確認 */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">申請準備状況</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-6 h-6 rounded-full mr-3 flex items-center justify-center ${
                  applicationInfo?.companyName ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {applicationInfo?.companyName && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  )}
                </div>
                <span className="text-gray-900">基本情報の入力</span>
              </div>
              <span className={`text-sm ${applicationInfo?.companyName ? 'text-green-600' : 'text-gray-500'}`}>
                {applicationInfo?.companyName ? '完了' : '未完了'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-6 h-6 rounded-full mr-3 flex items-center justify-center ${
                  documents.length >= 3 ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {documents.length >= 3 && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  )}
                </div>
                <span className="text-gray-900">必要書類のアップロード</span>
              </div>
              <span className={`text-sm ${documents.length >= 3 ? 'text-green-600' : 'text-gray-500'}`}>
                {documents.length}/3 完了
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-6 h-6 rounded-full mr-3 flex items-center justify-center ${
                  applicationInfo?.planStartDate ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {applicationInfo?.planStartDate && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  )}
                </div>
                <span className="text-gray-900">期限設定</span>
              </div>
              <span className={`text-sm ${applicationInfo?.planStartDate ? 'text-green-600' : 'text-gray-500'}`}>
                {applicationInfo?.planStartDate ? '完了' : '未設定'}
              </span>
            </div>
          </div>
        </div>

        {/* 申請書類生成 */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">申請書類自動生成</h3>
          
          {!isReadyToGenerate() ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                <div>
                  <div className="font-medium text-yellow-800">書類生成の準備が整っていません</div>
                  <div className="text-yellow-700 text-sm">基本情報の入力、必要書類のアップロード、期限設定を完了してください。</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                入力いただいた情報と、アップロードされた書類を基に、申請に必要な書類を自動生成いたします。
              </p>
              
              {generatedDocuments.length === 0 && !isGenerating && (
                <button
                  onClick={handleGenerateDocuments}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  申請書類を生成する
                </button>
              )}
            </div>
          )}

          {/* 生成中の表示 */}
          {isGenerating && (
            <div className="space-y-4">
              <div className="flex items-center mb-4">
                <div className="animate-spin w-5 h-5 mr-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <span className="text-blue-600 font-medium">申請書類を生成中...</span>
              </div>
              
              {generatedDocuments.map((doc, index) => (
                <div key={index} className="flex items-center text-green-600">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  {doc} 生成完了
                </div>
              ))}
            </div>
          )}

          {/* 生成完了後のダウンロード */}
          {generatedDocuments.length > 0 && !isGenerating && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">生成された書類</h4>
              <div className="space-y-3">
                {generatedDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-8 h-8 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-5L9 2H4z" clipRule="evenodd"/>
                      </svg>
                      <div>
                        <div className="font-medium text-gray-900">{doc}</div>
                        <div className="text-sm text-gray-500">
                          生成日: {new Date().toLocaleDateString('ja-JP')}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadDocument(doc)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      ダウンロード
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <div>
                    <div className="font-medium text-green-800">申請書類の準備が完了しました</div>
                    <div className="text-green-700 text-sm">
                      生成された書類を印刷し、必要な箇所に署名・押印の上、労働局へご提出ください。
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 次のステップ */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">次のステップ</h3>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3 mt-1">
                <span className="text-white font-semibold text-xs">1</span>
              </div>
              <div>
                <div className="font-medium text-gray-900">書類の印刷と署名</div>
                <div className="text-gray-600 text-sm">生成された書類を印刷し、必要箇所に署名・押印してください</div>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3 mt-1">
                <span className="text-white font-semibold text-xs">2</span>
              </div>
              <div>
                <div className="font-medium text-gray-900">労働局への提出</div>
                <div className="text-gray-600 text-sm">管轄の労働局またはハローワークに書類を提出してください</div>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3 mt-1">
                <span className="text-white font-semibold text-xs">3</span>
              </div>
              <div>
                <div className="font-medium text-gray-900">審査結果の待機</div>
                <div className="text-gray-600 text-sm">審査には通常2-3ヶ月程度かかります</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}