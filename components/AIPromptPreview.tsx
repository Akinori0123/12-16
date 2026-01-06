'use client'

import { useState, useEffect } from 'react'
import { PromptManagementService } from '@/lib/promptManagementService'
import { AIPromptTemplate, CustomPromptSettings } from '@/types/prompt'

interface AIPromptPreviewProps {
  subsidyType: string
  documentType: string
  fileName?: string
  className?: string
}

export default function AIPromptPreview({ 
  subsidyType, 
  documentType, 
  fileName = 'サンプル文書.pdf',
  className = ''
}: AIPromptPreviewProps) {
  const [prompt, setPrompt] = useState<string>('')
  const [template, setTemplate] = useState<AIPromptTemplate | null>(null)
  const [settings, setSettings] = useState<CustomPromptSettings | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    loadPromptData()
  }, [subsidyType, documentType])

  const loadPromptData = () => {
    try {
      const currentTemplate = PromptManagementService.getPromptTemplate(subsidyType, documentType)
      const currentSettings = PromptManagementService.getPromptSettings()
      
      if (currentTemplate) {
        const generatedPrompt = PromptManagementService.buildPrompt(
          subsidyType,
          documentType,
          fileName,
          currentSettings
        )
        
        setPrompt(generatedPrompt)
        setTemplate(currentTemplate)
        setSettings(currentSettings)
      } else {
        setPrompt('該当するプロンプトテンプレートが見つかりません')
        setTemplate(null)
        setSettings(null)
      }
    } catch (error) {
      console.error('プロンプト読み込みエラー:', error)
      setPrompt('プロンプトの読み込み中にエラーが発生しました')
    }
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

  const getStrictnessLevelName = (level: string) => {
    const names = {
      lenient: '寛容',
      standard: '標準',
      strict: '厳格',
      very_strict: '非常に厳格'
    }
    return names[level as keyof typeof names] || level
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">AIプロンプトプレビュー</h3>
              <p className="text-sm text-gray-600">
                {getSubsidyTypeName(subsidyType)} - {getDocumentTypeName(documentType)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {template && (
              <span className={`px-2 py-1 text-xs rounded-full ${
                template.isActive 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {template.isActive ? '有効' : '無効'}
              </span>
            )}
            <svg 
              className={`w-5 h-5 text-gray-400 transform transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4">
          {/* 設定情報 */}
          {template && settings && (
            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="font-medium text-blue-900 mb-1">テンプレート</div>
                <div className="text-blue-700">{template.name}</div>
                <div className="text-blue-600 text-xs">v{template.version}</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="font-medium text-green-900 mb-1">厳格さレベル</div>
                <div className="text-green-700">{getStrictnessLevelName(settings.strictnessLevel)}</div>
                <div className="text-green-600 text-xs">閾値: {settings.complianceThreshold}%</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="font-medium text-purple-900 mb-1">重点領域</div>
                <div className="text-purple-700">{settings.focusAreas.length}項目</div>
                <div className="text-purple-600 text-xs">詳細: {settings.enableDetailedAnalysis ? 'ON' : 'OFF'}</div>
              </div>
            </div>
          )}

          {/* プロンプト内容 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">生成されたプロンプト</h4>
              <div className="flex items-center space-x-2">
                <button
                  onClick={loadPromptData}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  更新
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(prompt)
                    // トーストメッセージなどを表示する場合はここに追加
                  }}
                  className="text-sm text-gray-600 hover:text-gray-700"
                >
                  コピー
                </button>
              </div>
            </div>
            <div className="bg-gray-100 border rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                {prompt}
              </pre>
            </div>
          </div>

          {/* 評価基準の表示 */}
          {template && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-medium text-gray-900 mb-2">評価基準</h5>
                <ul className="space-y-1">
                  {template.evaluationCriteria.map((criteria, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span className="text-gray-700">{criteria}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-gray-900 mb-2">必須確認項目</h5>
                <ul className="space-y-1">
                  {template.requiredElements.map((element, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span className="text-gray-700">{element}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}