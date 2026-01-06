'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { AIPromptTemplate, CustomPromptSettings, DEFAULT_PROMPT_VARIABLES } from '@/types/prompt'
import { PromptManagementService } from '@/lib/promptManagementService'
import AIPromptPreview from '@/components/AIPromptPreview'

export default function AISettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<AIPromptTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<AIPromptTemplate | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const demoUser = localStorage.getItem('demoUser')
      if (demoUser) {
        const userData = JSON.parse(demoUser)
        if (userData.email === 'admin@tm-consultant.com') {
          setUser({
            id: userData.id,
            email: userData.email,
            aud: 'authenticated',
            role: 'authenticated',
            email_confirmed_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: { company_name: 'TM人事労務コンサルティング' },
            identities: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as User)
          
          loadData()
          setLoading(false)
          return
        } else {
          router.push('/dashboard')
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      const sessionUser = session?.user
      
      if (sessionUser && sessionUser.email?.includes('tm-consultant.com')) {
        setUser(sessionUser)
        loadData()
      } else {
        router.push('/dashboard')
      }
      
      setLoading(false)
    }

    checkUser()
  }, [router])

  const loadData = () => {
    const promptTemplates = PromptManagementService.getPromptTemplates()
    setTemplates(promptTemplates)
  }

  const handleSaveTemplate = (template: AIPromptTemplate) => {
    // テンプレートの更新のみ対応
    PromptManagementService.updatePromptTemplate(template.id, template)
    console.log('テンプレートを更新:', template.id)
    
    loadData()
    setIsEditing(false)
    setSelectedTemplate(null)
  }

  const getSubsidyTypeName = (type: string) => {
    const names = {
      career_up: 'キャリアアップ助成金',
      work_life_balance: '両立支援等助成金',
      human_resource_support: '人材確保等支援助成金'
    }
    return names[type as keyof typeof names] || type
  }

  const getDocumentTypeName = (type: string) => {
    const names = {
      employment_rules: '就業規則',
      attendance_record: '出勤簿',
      wage_ledger: '賃金台帳'
    }
    return names[type as keyof typeof names] || type
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">管理者権限が必要です</h2>
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
              onClick={() => router.push('/admin/dashboard')}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className="w-8 h-8 bg-blue-600 rounded-lg mr-3 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">AI分析設定</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">管理者</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* プロンプトテンプレート管理 */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-8">
          <div className="p-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">AIプロンプトテンプレート</h2>
                <div className="text-sm text-gray-500">
                  {templates.length}個のテンプレート
                </div>
              </div>

              <div className="grid gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                          <div>助成金: {getSubsidyTypeName(template.subsidyType)}</div>
                          <div>書類: {getDocumentTypeName(template.documentType)}</div>
                        </div>
                        <div className="mb-3">
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>システム役割:</strong> {template.systemRole.substring(0, 100)}...
                          </p>
                          <p className="text-sm text-gray-700">
                            <strong>分析指示:</strong> {template.analysisInstructions.substring(0, 150)}...
                          </p>
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <span>更新: {new Date(template.updatedAt).toLocaleDateString('ja-JP')}</span>
                          <span className="mx-2">•</span>
                          <span>v{template.version}</span>
                          <span className="mx-2">•</span>
                          <span className={template.isActive ? 'text-green-600' : 'text-red-600'}>
                            {template.isActive ? '有効' : '無効'}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedTemplate(template)
                            setIsEditing(true)
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => setSelectedTemplate(template)}
                          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                        >
                          詳細表示
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* テンプレート詳細表示モーダル */}
        {!isEditing && selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">プロンプトテンプレート詳細</h3>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">基本情報</h4>
                      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <div><strong>名前:</strong> {selectedTemplate.name}</div>
                        <div><strong>助成金:</strong> {getSubsidyTypeName(selectedTemplate.subsidyType)}</div>
                        <div><strong>書類種別:</strong> {getDocumentTypeName(selectedTemplate.documentType)}</div>
                        <div><strong>ステータス:</strong> 
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            selectedTemplate.isActive 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {selectedTemplate.isActive ? '有効' : '無効'}
                          </span>
                        </div>
                        <div><strong>バージョン:</strong> v{selectedTemplate.version}</div>
                        <div><strong>最終更新:</strong> {new Date(selectedTemplate.updatedAt).toLocaleDateString('ja-JP')}</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">評価基準</h4>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <ul className="space-y-1 text-sm">
                          {selectedTemplate.evaluationCriteria.map((criteria, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-blue-500 mr-2">•</span>
                              <span>{criteria}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">システム役割</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700">{selectedTemplate.systemRole}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">分析指示</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTemplate.analysisInstructions}</pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">必須確認項目</h4>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-2">
                        {selectedTemplate.requiredElements.map((element, index) => (
                          <div key={index} className="flex items-center text-sm">
                            <span className="text-green-500 mr-2">✓</span>
                            <span>{element}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6">
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    閉じる
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    編集する
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* テンプレート編集モーダル */}
        {isEditing && selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">プロンプトテンプレート編集</h3>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setSelectedTemplate(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">テンプレート名</label>
                    <input
                      type="text"
                      value={selectedTemplate.name}
                      onChange={(e) => setSelectedTemplate({
                        ...selectedTemplate,
                        name: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTemplate.isActive}
                        onChange={(e) => setSelectedTemplate({
                          ...selectedTemplate,
                          isActive: e.target.checked
                        })}
                        className="mr-2"
                      />
                      有効
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">システム役割</label>
                    <textarea
                      value={selectedTemplate.systemRole}
                      onChange={(e) => setSelectedTemplate({
                        ...selectedTemplate,
                        systemRole: e.target.value
                      })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="AIの役割を定義してください..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">分析指示</label>
                    <textarea
                      value={selectedTemplate.analysisInstructions}
                      onChange={(e) => setSelectedTemplate({
                        ...selectedTemplate,
                        analysisInstructions: e.target.value
                      })}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="分析の指示を記述してください..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6">
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setSelectedTemplate(null)
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => handleSaveTemplate(selectedTemplate)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}