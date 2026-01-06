'use client'

import { useState } from 'react'
import { AnalysisResult } from '@/lib/geminiService'

interface AIAnalysisCardProps {
  documentId: string
  fileName: string
  fileBuffer?: ArrayBuffer
  documentType?: string
  subsidyType?: string
  onAnalysisStart?: () => void
  onAnalysisComplete?: (result: AnalysisResult) => void
  initialAnalysis?: AnalysisResult | null
}

export default function AIAnalysisCard({ 
  documentId, 
  fileName, 
  fileBuffer,
  documentType = 'employment_rules',
  subsidyType = 'career_up',
  onAnalysisStart,
  onAnalysisComplete,
  initialAnalysis = null
}: AIAnalysisCardProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(initialAnalysis)
  const [error, setError] = useState<string>('')

  const handleAnalyze = async () => {
    if (!fileBuffer) {
      setError('ファイルデータが利用できません')
      return
    }

    setIsAnalyzing(true)
    setError('')
    onAnalysisStart?.()

    try {
      // デモユーザーの場合は簡易分析
      const isDemoUser = localStorage.getItem('demoUser')
      
      if (isDemoUser) {
        // 1-3秒の分析時間をシミュレート
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000))

        const mockResult: AnalysisResult = {
          success: true,
          isCompliant: Math.random() > 0.3, // 70%の確率で適合
          feedback: '就業規則の主要項目を確認しました。キャリアアップ助成金の申請要件について詳細な分析結果をご確認ください。',
          missingItems: [
            '賃金改定に関する具体的な規定の追加',
            '正社員転換時の昇給率の明記'
          ],
          suggestions: [
            '転換時に基本給を5%以上増額する旨を明記することをお勧めします',
            '勤続年数に応じた昇給制度の詳細化をご検討ください',
            '転換後の労働条件を明確に定義することが重要です'
          ],
          confidence: 85
        }

        setAnalysisResult(mockResult)
        onAnalysisComplete?.(mockResult)
        return
      }

      // 実際のAI分析API呼び出し
      const formData = new FormData()
      const file = new File([fileBuffer], fileName, { type: 'application/pdf' })
      formData.append('file', file)
      formData.append('documentId', documentId)
      formData.append('documentType', documentType)
      formData.append('subsidyType', subsidyType)

      const response = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: {
          'x-demo-user': isDemoUser ? 'true' : 'false'
        },
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'AI分析に失敗しました')
      }

      if (result.success && result.analysis) {
        setAnalysisResult(result.analysis)
        onAnalysisComplete?.(result.analysis)
      } else {
        throw new Error('AI分析結果を取得できませんでした')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'AI分析中にエラーが発生しました'
      setError(errorMessage)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getComplianceIcon = () => {
    if (!analysisResult) return null
    
    if (analysisResult.isCompliant) {
      return (
        <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
        </svg>
      )
    } else {
      return (
        <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
        </svg>
      )
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600'
    if (confidence >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (!analysisResult && !isAnalyzing && !error) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
            <div>
              <h4 className="font-medium text-blue-800">AI書類チェック</h4>
              <p className="text-sm text-blue-600">助成金要件に適合しているかAIが自動で確認します</p>
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            disabled={!fileBuffer}
          >
            チェック開始
          </button>
        </div>
      </div>
    )
  }

  if (isAnalyzing) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
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

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          <div className="flex-1">
            <h4 className="font-medium text-red-800">AI分析エラー</h4>
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={handleAnalyze}
              className="mt-2 text-sm text-red-700 hover:text-red-800 font-medium"
              disabled={!fileBuffer}
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (analysisResult) {
    const confidenceColor = getConfidenceColor(analysisResult.confidence)
    
    return (
      <div className={`border rounded-lg p-4 mt-4 ${
        analysisResult.isCompliant 
          ? 'bg-green-50 border-green-200' 
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            {getComplianceIcon()}
            <div className="ml-2">
              <h4 className={`font-semibold ${
                analysisResult.isCompliant ? 'text-green-800' : 'text-yellow-800'
              }`}>
                AI書類チェック結果
              </h4>
              <div className="flex items-center space-x-4 text-sm">
                <span className={`${
                  analysisResult.isCompliant ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {analysisResult.isCompliant ? '要件適合' : '要件不足'}
                </span>
                <span className={`${confidenceColor}`}>
                  信頼度: {analysisResult.confidence}%
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            disabled={!fileBuffer}
          >
            再チェック
          </button>
        </div>

        <div className="space-y-4">
          {/* フィードバック */}
          <div>
            <h5 className="font-medium text-gray-900 mb-2">総合評価</h5>
            <p className="text-sm text-gray-700 bg-white p-3 rounded border">
              {analysisResult.feedback}
            </p>
          </div>

          {/* 不足項目 */}
          {analysisResult.missingItems.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-900 mb-2">不足している項目</h5>
              <ul className="text-sm space-y-1">
                {analysisResult.missingItems.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 改善提案 */}
          {analysisResult.suggestions.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-900 mb-2">改善提案</h5>
              <ul className="text-sm space-y-1">
                {analysisResult.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">💡</span>
                    <span className="text-gray-700">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}