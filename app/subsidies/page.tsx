'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { SUBSIDY_TYPES, SubsidyType } from '@/types/subsidy'

export default function SubsidiesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSubsidy, setSelectedSubsidy] = useState<string | null>(null)
  const [planStartDate, setPlanStartDate] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      // Supabase認証チェック
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)
    }

    checkUser()
  }, [router])

  const handleSubsidySelect = (subsidyId: string) => {
    setSelectedSubsidy(subsidyId)
  }

  const handleStartApplication = async () => {
    if (!selectedSubsidy || !planStartDate) return
    
    try {
      // 申請情報をSupabaseに保存
      if (user) {
        // 正社員転換日から期限を計算（キャリアアップ助成金制度準拠）
        const conversionDate = new Date(planStartDate)
        
        // キャリアアップ計画期間: 転換日から5年後（通常設定）
        const planEndDate = new Date(conversionDate)
        planEndDate.setFullYear(planEndDate.getFullYear() + 5)
        
        // 転換後6ヶ月分賃金支払完了想定日（転換日から7ヶ月後）
        const sixMonthsPaymentEnd = new Date(conversionDate)
        sixMonthsPaymentEnd.setMonth(sixMonthsPaymentEnd.getMonth() + 7)
        
        // 支給申請期限: 6ヶ月分賃金支払完了日翌日から2ヶ月間
        const applicationStartDate = new Date(sixMonthsPaymentEnd)
        applicationStartDate.setDate(applicationStartDate.getDate() + 1)
        
        const applicationEndDate = new Date(applicationStartDate)
        applicationEndDate.setMonth(applicationEndDate.getMonth() + 2)
        
        // Supabaseに申請を作成するAPIを呼び出し
        const response = await fetch('/api/applications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({
            subsidy_type: selectedSubsidy,
            status: 'in_progress',
            plan_start_date: planStartDate,
            plan_end_date: planEndDate.toISOString().split('T')[0],
            application_deadline: applicationEndDate.toISOString().split('T')[0],
            company_name: user.user_metadata?.company_name || 'サンプル株式会社',
            representative_name: user.user_metadata?.representative_name || '山田 太郎',
            email: user.email,
            target_employees: 1
          })
        })

        if (!response.ok) {
          throw new Error('申請の作成に失敗しました')
        }

        const data = await response.json()
        const applicationId = data.application.id
        
        console.log('Application created in Supabase:', { applicationId, selectedSubsidy, planStartDate })
        
        // 選択された助成金に応じてルーティング（申請IDを含む）
        switch (selectedSubsidy) {
          case 'career_up':
            router.push(`/application/career-up?id=${applicationId}`)
            break
          case 'work_life_balance':
            router.push(`/application/work-life-balance?id=${applicationId}`)
            break
          case 'human_resource_support':
            router.push(`/application/human-resource-support?id=${applicationId}`)
            break
          default:
            alert('申し訳ございません。この助成金はまだ準備中です。')
        }
      }
    } catch (error) {
      console.error('申請作成エラー:', error)
      alert('申請の作成中にエラーが発生しました。もう一度お試しください。')
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'hard':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '簡単'
      case 'medium':
        return '普通'
      case 'hard':
        return '難しい'
      default:
        return '不明'
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount)
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
              onClick={() => router.push('/dashboard')}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className="w-8 h-8 bg-blue-600 rounded-lg mr-3 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">助成金選択</h1>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            申請したい助成金をお選びください
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            貴社の状況に最適な助成金を選択して、申請プロセスを開始しましょう。
            複数の助成金を同時に申請することも可能です。
          </p>
        </div>

        {/* 助成金カード一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {SUBSIDY_TYPES.map((subsidy) => (
            <div
              key={subsidy.id}
              className={`bg-white p-6 rounded-xl shadow-md border-2 transition-all cursor-pointer ${
                selectedSubsidy === subsidy.id
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-blue-300'
              } ${!subsidy.isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => subsidy.isAvailable && handleSubsidySelect(subsidy.id)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">
                    {subsidy.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {subsidy.description}
                  </p>
                </div>
                {selectedSubsidy === subsidy.id && (
                  <div className="ml-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">助成金額</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatAmount(subsidy.estimatedAmount.min)} ～ {formatAmount(subsidy.estimatedAmount.max)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">処理期間</span>
                  <span className="text-sm font-medium text-gray-900">
                    {subsidy.processingTime}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">難易度</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getDifficultyColor(subsidy.difficulty)}`}>
                    {getDifficultyText(subsidy.difficulty)}
                  </span>
                </div>

                {!subsidy.isAvailable && (
                  <div className="mt-3 p-2 bg-red-50 rounded-lg">
                    <span className="text-xs text-red-700 font-medium">
                      現在受付を停止しています
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-medium text-gray-700 mb-2">主な要件</h4>
                <ul className="space-y-1">
                  {subsidy.eligibilityRequirements.slice(0, 2).map((req, index) => (
                    <li key={index} className="text-xs text-gray-600 flex items-start">
                      <span className="text-blue-500 mr-1">•</span>
                      {req}
                    </li>
                  ))}
                  {subsidy.eligibilityRequirements.length > 2 && (
                    <li className="text-xs text-gray-500">
                      他 {subsidy.eligibilityRequirements.length - 2} 項目...
                    </li>
                  )}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* 選択された助成金の詳細 */}
        {selectedSubsidy && (
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">選択された助成金の詳細</h3>
            {(() => {
              const subsidy = SUBSIDY_TYPES.find(s => s.id === selectedSubsidy)
              if (!subsidy) return null

              return (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">{subsidy.name}</h4>
                    <p className="text-gray-700">{subsidy.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">助成金額</h5>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatAmount(subsidy.estimatedAmount.min)} ～ {formatAmount(subsidy.estimatedAmount.max)}
                      </p>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">処理期間</h5>
                      <p className="text-lg text-gray-700">{subsidy.processingTime}</p>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">受給要件</h5>
                    <ul className="space-y-2">
                      {subsidy.eligibilityRequirements.map((req, index) => (
                        <li key={index} className="flex items-start text-gray-700">
                          <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* 正社員転換日入力 */}
        {selectedSubsidy && (
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">転換情報の入力</h3>
            
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                正社員転換実施日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={planStartDate}
                onChange={(e) => setPlanStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                max={new Date().toISOString().split('T')[0]}
              />
              <div className="mt-2 space-y-1 text-sm text-gray-500">
                <p className="font-medium text-gray-700">💡 重要事項</p>
                <p>• キャリアアップ計画書は転換日の前日までに労働局へ提出が必要です</p>
                <p>• 支給申請期限は転換後6ヶ月分の賃金支払完了日の翌日から2ヶ月以内です</p>
              </div>
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="text-center">
          <button
            onClick={handleStartApplication}
            disabled={!selectedSubsidy || !planStartDate}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-colors"
          >
            {!selectedSubsidy ? '助成金を選択してください' : 
             !planStartDate ? '正社員転換実施日を入力してください' : '申請を開始'}
          </button>

          <div className="mt-4 text-sm text-gray-500">
            複数の助成金を申請したい場合は、後でダッシュボードから追加できます
          </div>
        </div>
      </div>
    </div>
  )
}