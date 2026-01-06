'use client'

import { useState } from 'react'
import { UploadService } from '@/lib/uploadService'

interface AIAnalysis {
  score: number
  summary: string
  issues: {
    severity: 'high' | 'medium' | 'low'
    title: string
    description: string
    location?: string
  }[]
  suggestions: {
    title: string
    description: string
  }[]
  extracted_text?: string
}

interface AICheckResultProps {
  documentId?: string
  documentName: string
  analysis?: AIAnalysis
  checkedAt?: string
  onAnalysisComplete?: () => void
}

export default function AICheckResult({ 
  documentId, 
  documentName, 
  analysis: initialAnalysis, 
  checkedAt: initialCheckedAt, 
  onAnalysisComplete 
}: AICheckResultProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string>('')
  const [currentAnalysis, setCurrentAnalysis] = useState<AIAnalysis | undefined>(initialAnalysis)
  const [currentCheckedAt, setCurrentCheckedAt] = useState<string | undefined>(initialCheckedAt)

  const handleAICheck = async () => {
    if (!documentId) return

    setIsAnalyzing(true)
    setError('')

    try {
      const result = await UploadService.startAICheck(documentId)
      
      if (result.success) {
        // 成功時は分析結果を直接設定
        setCurrentAnalysis(result.analysis)
        setCurrentCheckedAt(result.checkedAt)
        // 親コンポーネントにも通知
        onAnalysisComplete?.()
      } else {
        setError(result.error || 'AIチェックに失敗しました')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'AIチェック中にエラーが発生しました')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800'
    if (score >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  // AIチェック未実行の場合はボタンを表示
  if (!currentAnalysis && !isAnalyzing && !error) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            <div>
              <h4 className="font-medium text-blue-900">AI書類チェック</h4>
              <p className="text-sm text-blue-600">助成金要件に適合しているかAIが自動で確認します</p>
            </div>
          </div>
          <button
            onClick={handleAICheck}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            disabled={!documentId}
          >
            AIチェック実行
          </button>
        </div>
      </div>
    )
  }

  // チェック中の場合
  if (isAnalyzing) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-3">
        <div className="flex items-center">
          <div className="animate-spin w-5 h-5 mr-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-blue-800">AIが書類をチェックしています...</h4>
            <p className="text-sm text-blue-600">しばらくお待ちください</p>
          </div>
        </div>
      </div>
    )
  }

  // エラーの場合
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <div className="flex-1">
              <h4 className="font-medium text-red-800">AI分析エラー</h4>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
          <button
            onClick={handleAICheck}
            className="text-sm text-red-700 hover:text-red-800 font-medium"
            disabled={!documentId}
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  // 結果表示
  if (!currentAnalysis) return null

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <h4 className="font-medium text-purple-900">AI書類チェック結果</h4>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(currentAnalysis.score)}`}>
            {currentAnalysis.score}/100点
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleAICheck}
            className="text-purple-600 hover:text-purple-700 text-xs font-medium"
            disabled={!documentId}
          >
            再チェック
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-purple-600 hover:text-purple-700 text-sm font-medium"
          >
            {isExpanded ? '閉じる' : '詳細を見る'}
          </button>
        </div>
      </div>

      <p className="text-sm text-purple-800 mb-2">{currentAnalysis.summary}</p>
      {currentCheckedAt && (
        <p className="text-xs text-purple-600">
          チェック日時: {new Date(currentCheckedAt).toLocaleString('ja-JP')}
        </p>
      )}

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* 問題点 */}
          {currentAnalysis.issues && currentAnalysis.issues.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-purple-900 mb-2">検出された問題</h5>
              <div className="space-y-2">
                {currentAnalysis.issues.map((issue, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${getSeverityColor(issue.severity)}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{issue.title}</span>
                      <span className="text-xs px-2 py-1 bg-white bg-opacity-70 rounded">
                        重要度: {getSeverityText(issue.severity)}
                      </span>
                    </div>
                    <p className="text-xs mb-1">{issue.description}</p>
                    {issue.location && (
                      <p className="text-xs opacity-75">場所: {issue.location}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 改善提案 */}
          {currentAnalysis.suggestions && currentAnalysis.suggestions.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-purple-900 mb-2">改善提案</h5>
              <div className="space-y-2">
                {currentAnalysis.suggestions.map((suggestion, index) => (
                  <div key={index} className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <div className="font-medium text-sm text-green-900 mb-1">{suggestion.title}</div>
                    <p className="text-xs text-green-800">{suggestion.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 抽出されたテキスト（一部） */}
          {currentAnalysis.extracted_text && (
            <div>
              <h5 className="text-sm font-medium text-purple-900 mb-2">書類から読み取ったテキスト（一部）</h5>
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                <p className="text-xs text-gray-700 whitespace-pre-wrap">
                  {currentAnalysis.extracted_text.length > 200 
                    ? `${currentAnalysis.extracted_text.substring(0, 200)}...` 
                    : currentAnalysis.extracted_text
                  }
                </p>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <p className="text-xs text-blue-800">
              💡 このAIチェックは補助的な機能です。最終的な判断は専門家による審査で行われます。
            </p>
          </div>
        </div>
      )}
    </div>
  )
}