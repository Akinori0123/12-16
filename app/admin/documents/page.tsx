'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface SubsidyDocument {
  id: string
  document_key: string
  document_name: string
  description: string | null
  checkpoints: string | null
  is_required: boolean
  sort_order: number
  file_types: string
  max_file_size: number
  created_at: string
  updated_at: string
}


interface SubsidyType {
  id: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  subsidy_required_documents: SubsidyDocument[]
}

interface AIAnalysis {
  overall_score: number
  summary: string
  issues: {
    type: string
    severity: string
    title: string
    description: string
    recommendation: string
  }[]
  improvements: {
    document_key: string
    suggestion: string
    new_checkpoints?: string
  }[]
  raw_response?: string
}

export default function AdminDocumentsPage() {
  const [subsidies, setSubsidies] = useState<SubsidyType[]>([])
  const [selectedSubsidy, setSelectedSubsidy] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingDocument, setEditingDocument] = useState<SubsidyDocument | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [aiChecking, setAiChecking] = useState(false)
  const [showAiResults, setShowAiResults] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAdminAuth = () => {
      const adminUser = sessionStorage.getItem('adminUser')
      if (!adminUser) {
        router.push('/admin/login')
        return
      }
      loadSubsidies()
    }

    checkAdminAuth()
  }, [router])

  const loadSubsidies = async (preserveSelectedSubsidy = false) => {
    try {
      const response = await fetch('/api/admin/subsidies', {
        headers: {
          'Accept': 'application/json; charset=utf-8',
          'Content-Type': 'application/json; charset=utf-8'
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch subsidies')
      }
      
      // レスポンスをテキストとして取得してからJSONパース
      const responseText = await response.text()
      const data = JSON.parse(responseText)
      
      setSubsidies(data.subsidies || [])
      
      // preserveSelectedSubsidyがfalseの場合のみ最初の助成金を選択
      if (!preserveSelectedSubsidy && data.subsidies && data.subsidies.length > 0) {
        setSelectedSubsidy(data.subsidies[0].id)
      }
      // preserveSelectedSubsidyがtrueの場合は、現在の選択を維持
      // ただし、選択されている助成金が存在しない場合は最初のものを選択
      else if (preserveSelectedSubsidy && data.subsidies && data.subsidies.length > 0) {
        const currentExists = data.subsidies.find(s => s.id === selectedSubsidy)
        if (!currentExists) {
          setSelectedSubsidy(data.subsidies[0].id)
        }
      }
    } catch (error) {
      console.error('書類データ読み込みエラー:', error)
      alert('書類データの読み込み中にエラーが発生しました。ページを再読み込みしてください。')
    } finally {
      setLoading(false)
    }
  }

  const getSelectedSubsidyData = () => {
    return subsidies.find(s => s.id === selectedSubsidy) || null
  }

  const handleAddDocument = async (formData: Partial<SubsidyDocument>) => {
    if (!selectedSubsidy) return

    try {
      const response = await fetch(`/api/admin/subsidies/${selectedSubsidy}/documents`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json; charset=utf-8',
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Add document error response:', errorText)
        throw new Error('Failed to add document')
      }

      // レスポンスをテキストとして取得してからJSONパース
      const responseText = await response.text()
      const data = JSON.parse(responseText)

      // データを再読み込み（選択状態を保持）
      await loadSubsidies(true)
      setShowAddForm(false)
      
      console.log('書類が正常に追加されました:', data.document)
    } catch (error) {
      console.error('書類追加エラー:', error)
      alert('書類の追加に失敗しました。入力内容を確認してください。')
    }
  }

  const handleUpdateDocument = async (documentId: string, formData: Partial<SubsidyDocument>) => {
    if (!selectedSubsidy) return

    try {
      const response = await fetch(`/api/admin/subsidies/${selectedSubsidy}/documents/${documentId}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json; charset=utf-8',
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Update document error response:', errorText)
        throw new Error('Failed to update document')
      }

      // レスポンスをテキストとして取得してからJSONパース
      const responseText = await response.text()
      const data = JSON.parse(responseText)

      // データを再読み込み（選択状態を保持）
      await loadSubsidies(true)
      setEditingDocument(null)
      
      console.log('書類が正常に更新されました:', data.document)
    } catch (error) {
      console.error('書類更新エラー:', error)
      alert('書類の更新に失敗しました。入力内容を確認してください。')
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!selectedSubsidy || !confirm('この書類を削除してもよろしいですか？')) return

    try {
      const response = await fetch(`/api/admin/subsidies/${selectedSubsidy}/documents/${documentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete document')
      }

      // データを再読み込み（選択状態を保持）
      await loadSubsidies(true)
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('書類の削除に失敗しました')
    }
  }


  const handleAiCheck = async () => {
    if (!selectedSubsidy) return

    setAiChecking(true)
    try {
      const response = await fetch(`/api/admin/subsidies/${selectedSubsidy}/ai-check`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json; charset=utf-8',
          'Content-Type': 'application/json; charset=utf-8'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('AI check error response:', errorText)
        throw new Error('Failed to run AI check')
      }

      const responseText = await response.text()
      const data = JSON.parse(responseText)

      if (data.success) {
        setAiAnalysis(data.analysis)
        setShowAiResults(true)
        console.log('AI分析が完了しました:', data.analysis)
      } else {
        throw new Error(data.error || 'AI分析に失敗しました')
      }
    } catch (error) {
      console.error('AI分析エラー:', error)
      alert('AI分析中にエラーが発生しました。GEMINI_API_KEYが正しく設定されているか確認してください。')
    } finally {
      setAiChecking(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high':
        return '高'
      case 'medium':
        return '中'
      case 'low':
        return '低'
      default:
        return '不明'
    }
  }


  const formatFileSize = (bytes: number) => {
    const mb = bytes / 1024 / 1024
    return `${mb.toFixed(1)}MB`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    )
  }

  const selectedSubsidyData = getSelectedSubsidyData()

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">助成金書類管理</h1>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 助成金選択サイドバー */}
          <div className="lg:w-1/3">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">助成金一覧</h2>
              <div className="space-y-2">
                {subsidies.map((subsidy) => (
                  <button
                    key={subsidy.id}
                    onClick={() => setSelectedSubsidy(subsidy.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedSubsidy === subsidy.id
                        ? 'bg-blue-100 text-blue-900 border border-blue-300'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <div className="font-medium">{subsidy.name}</div>
                    <div className="text-sm text-gray-500">
                      {subsidy.subsidy_required_documents.length}件の必要書類
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 書類管理メインエリア */}
          <div className="lg:w-2/3 space-y-6">
            {selectedSubsidyData && (
              <>
                {/* 基本情報とコントロール */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{selectedSubsidyData.name}</h2>
                      <p className="text-gray-600">{selectedSubsidyData.description}</p>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleAiCheck}
                        disabled={aiChecking}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {aiChecking ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>AI分析中...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                            <span>AIチェック</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        書類を追加
                      </button>
                    </div>
                  </div>

                </div>

                {/* 書類一覧セクション */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">

                {/* AI分析結果表示 */}
                {showAiResults && aiAnalysis && (
                  <div className="mb-6 bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-purple-900 mb-2">AI分析結果</h3>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <span className="text-sm text-purple-700">総合スコア:</span>
                            <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${
                              aiAnalysis.overall_score >= 80 ? 'bg-green-100 text-green-800' :
                              aiAnalysis.overall_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {aiAnalysis.overall_score}/100
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAiResults(false)}
                        className="text-purple-600 hover:text-purple-800"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>

                    <p className="text-purple-800 mb-4">{aiAnalysis.summary}</p>

                    {aiAnalysis.issues.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-md font-medium text-purple-900 mb-2">検出された問題</h4>
                        <div className="space-y-3">
                          {aiAnalysis.issues.map((issue, index) => (
                            <div key={index} className="bg-white p-3 rounded-lg border border-purple-200">
                              <div className="flex items-center space-x-2 mb-2">
                                <h5 className="font-medium text-gray-900">{issue.title}</h5>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getSeverityColor(issue.severity)}`}>
                                  重要度: {getSeverityText(issue.severity)}
                                </span>
                              </div>
                              <p className="text-gray-700 text-sm mb-2">{issue.description}</p>
                              <div className="bg-blue-50 p-2 rounded text-sm">
                                <strong className="text-blue-900">推奨対応:</strong>
                                <span className="text-blue-800 ml-1">{issue.recommendation}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiAnalysis.improvements.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium text-purple-900 mb-2">改善提案</h4>
                        <div className="space-y-2">
                          {aiAnalysis.improvements.map((improvement, index) => (
                            <div key={index} className="bg-white p-3 rounded-lg border border-purple-200">
                              <div className="font-medium text-gray-900 mb-1">書類キー: {improvement.document_key}</div>
                              <p className="text-gray-700 text-sm mb-2">{improvement.suggestion}</p>
                              {improvement.new_checkpoints && (
                                <div className="bg-green-50 p-2 rounded text-sm">
                                  <strong className="text-green-900">推奨確認点:</strong>
                                  <div className="text-green-800 mt-1 whitespace-pre-line">{improvement.new_checkpoints}</div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 書類一覧 */}
                <div className="space-y-4">
                  {selectedSubsidyData.subsidy_required_documents
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((doc) => (
                    <div key={doc.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      {editingDocument?.id === doc.id ? (
                        <DocumentForm
                          document={doc}
                          onSave={(formData) => handleUpdateDocument(doc.id, formData)}
                          onCancel={() => setEditingDocument(null)}
                        />
                      ) : (
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-medium text-gray-900">{doc.document_name}</h3>
                              {doc.is_required ? (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                                  必須
                                </span>
                              ) : (
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">
                                  任意
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                            {doc.checkpoints && (
                              <div className="bg-blue-50 p-3 rounded-lg mb-2">
                                <h4 className="text-xs font-medium text-blue-900 mb-1">書類確認点</h4>
                                <p className="text-xs text-blue-800 whitespace-pre-line">{doc.checkpoints}</p>
                              </div>
                            )}
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>キー: {doc.document_key}</span>
                              <span>順序: {doc.sort_order}</span>
                              <span>ファイル形式: {doc.file_types}</span>
                              <span>最大サイズ: {formatFileSize(doc.max_file_size)}</span>
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => setEditingDocument(doc)}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {selectedSubsidyData.subsidy_required_documents.length === 0 && (
                    <div className="text-center py-8">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      <p className="text-gray-600">必要書類が設定されていません</p>
                    </div>
                  )}
                </div>

                  {/* 新規書類追加フォーム */}
                  {showAddForm && (
                    <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h3 className="font-medium text-gray-900 mb-4">新しい書類を追加</h3>
                      <DocumentForm
                        onSave={handleAddDocument}
                        onCancel={() => setShowAddForm(false)}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// 書類フォームコンポーネント
function DocumentForm({ 
  document, 
  onSave, 
  onCancel 
}: { 
  document?: SubsidyDocument
  onSave: (data: Partial<SubsidyDocument>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    document_key: document?.document_key || '',
    document_name: document?.document_name || '',
    description: document?.description || '',
    checkpoints: document?.checkpoints || '',
    is_required: document?.is_required ?? true,
    sort_order: document?.sort_order || 0,
    file_types: document?.file_types || 'pdf,doc,docx',
    max_file_size: document?.max_file_size || 10485760
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            書類キー <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.document_key}
            onChange={(e) => setFormData({ ...formData, document_key: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="employment_rules"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            書類名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.document_name}
            onChange={(e) => setFormData({ ...formData, document_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="就業規則（写し）"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="転換前後の雇用区分や転換ルールが明記されている箇所のコピーをアップロードしてください"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">書類確認点</label>
        <textarea
          value={formData.checkpoints}
          onChange={(e) => setFormData({ ...formData, checkpoints: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={`転換ルールの記載確認: 有期雇用から無期雇用（正社員）への転換に関するルールが明記されているか
賃金体系の記載確認: 転換前後の賃金体系・等級制度の違いが明記されているか
施行日の確認: 就業規則の施行日がキャリアアップ計画書の提出日より前になっているか`}
          rows={5}
        />
        <p className="text-xs text-gray-500 mt-1">この書類をチェックする際の確認点を記載してください。改行で複数の確認点を分けることができます。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">順序</label>
          <input
            type="number"
            value={formData.sort_order}
            onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ファイル形式</label>
          <input
            type="text"
            value={formData.file_types}
            onChange={(e) => setFormData({ ...formData, file_types: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="pdf,doc,docx"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">最大サイズ(MB)</label>
          <input
            type="number"
            value={formData.max_file_size / 1024 / 1024}
            onChange={(e) => setFormData({ ...formData, max_file_size: parseInt(e.target.value) * 1024 * 1024 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            max="50"
          />
        </div>
      </div>

      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.is_required}
            onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">必須書類</span>
        </label>
      </div>

      <div className="flex space-x-3">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          保存
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors font-medium"
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}

