'use client'

import { useState, useEffect } from 'react'
import { ApplicationInfo, DeadlineCalculation, DeadlineEditState } from '@/types/deadline'
import { DeadlineCalculator } from '@/lib/deadlineUtils'

interface DeadlineManagementProps {
  applicationId: string
  onApplicationInfoUpdate?: (info: ApplicationInfo) => void
  isReadOnly?: boolean
  userInfo?: {
    companyName: string
    representativeName: string
  }
}

export default function DeadlineManagement({ 
  applicationId, 
  onApplicationInfoUpdate,
  isReadOnly = false,
  userInfo
}: DeadlineManagementProps) {
  const [applicationInfo, setApplicationInfo] = useState<ApplicationInfo>({
    id: applicationId,
    companyName: '',
    representativeName: '',
    planStartDate: '',
    planEndDate: '',
    applicationDeadlineStart: '',
    applicationDeadlineEnd: '',
    isDeadlineOverridden: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })

  const [deadlineCalc, setDeadlineCalc] = useState<DeadlineCalculation | null>(null)
  const [editState, setEditState] = useState<DeadlineEditState>({
    isEditing: false,
    tempStartDate: '',
    tempEndDate: ''
  })
  const [validationError, setValidationError] = useState<string>('')

  // ローカルストレージからデータを読み込み
  useEffect(() => {
    const savedData = localStorage.getItem(`applicationInfo_${applicationId}`)
    if (savedData) {
      const parsed = JSON.parse(savedData)
      setApplicationInfo(parsed)
      if (parsed.planStartDate) {
        const calc = DeadlineCalculator.calculateDeadlines(parsed.planStartDate)
        setDeadlineCalc(calc)
      }
    }
  }, [applicationId])

  // データをローカルストレージに保存
  const saveToLocalStorage = (info: ApplicationInfo) => {
    localStorage.setItem(`applicationInfo_${applicationId}`, JSON.stringify(info))
    onApplicationInfoUpdate?.(info)
  }

  // 基本情報の更新
  const updateBasicInfo = (field: keyof ApplicationInfo, value: string) => {
    const updated = {
      ...applicationInfo,
      [field]: value,
      updated_at: new Date().toISOString()
    }
    setApplicationInfo(updated)
    saveToLocalStorage(updated)
  }

  // 計画開始日の変更処理
  const handlePlanStartDateChange = (dateString: string) => {
    setValidationError('')
    
    if (!dateString) {
      updateBasicInfo('planStartDate', '')
      setDeadlineCalc(null)
      return
    }

    const validation = DeadlineCalculator.validateConversionDate(dateString)
    if (!validation.isValid) {
      setValidationError(validation.errorMessage || '')
      return
    }

    // 期限を自動計算
    const calc = DeadlineCalculator.calculateDeadlines(dateString)
    setDeadlineCalc(calc)

    // アプリケーション情報を更新
    const updated = {
      ...applicationInfo,
      planStartDate: dateString,
      planEndDate: DeadlineCalculator.formatDateISO(calc.planEndDate),
      applicationDeadlineStart: DeadlineCalculator.formatDateISO(calc.applicationDeadlineStart),
      applicationDeadlineEnd: DeadlineCalculator.formatDateISO(calc.applicationDeadlineEnd),
      isDeadlineOverridden: false,
      updated_at: new Date().toISOString()
    }
    setApplicationInfo(updated)
    saveToLocalStorage(updated)
  }

  // 期限の手動編集開始
  const startDeadlineEdit = () => {
    setEditState({
      isEditing: true,
      tempStartDate: applicationInfo.applicationDeadlineStart,
      tempEndDate: applicationInfo.applicationDeadlineEnd
    })
  }

  // 期限の手動編集キャンセル
  const cancelDeadlineEdit = () => {
    setEditState({
      isEditing: false,
      tempStartDate: '',
      tempEndDate: ''
    })
  }

  // 期限の手動編集保存
  const saveDeadlineEdit = () => {
    const { tempStartDate, tempEndDate } = editState
    
    if (!DeadlineCalculator.isValidDate(tempStartDate) || !DeadlineCalculator.isValidDate(tempEndDate)) {
      setValidationError('有効な日付を入力してください')
      return
    }

    const startDate = new Date(tempStartDate)
    const endDate = new Date(tempEndDate)
    
    if (startDate >= endDate) {
      setValidationError('終了日は開始日より後の日付を選択してください')
      return
    }

    // 更新された期限で再計算
    const updated = {
      ...applicationInfo,
      applicationDeadlineStart: tempStartDate,
      applicationDeadlineEnd: tempEndDate,
      isDeadlineOverridden: true,
      updated_at: new Date().toISOString()
    }
    setApplicationInfo(updated)
    saveToLocalStorage(updated)

    // 表示用の計算も更新
    const today = new Date()
    const endDateObj = new Date(tempEndDate)
    const daysUntilDeadline = Math.ceil(
      (endDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    setDeadlineCalc(prev => prev ? {
      ...prev,
      applicationDeadlineStart: new Date(tempStartDate),
      applicationDeadlineEnd: endDateObj,
      daysUntilDeadline,
      isUrgent: daysUntilDeadline <= 14 && daysUntilDeadline >= 0
    } : null)

    setEditState({
      isEditing: false,
      tempStartDate: '',
      tempEndDate: ''
    })
    setValidationError('')
  }

  const urgencyStyle = deadlineCalc ? DeadlineCalculator.getUrgencyStyle(deadlineCalc.daysUntilDeadline) : null

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">申請基本情報・期限管理</h3>
      
      {/* 基本情報入力フォーム */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            会社名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={applicationInfo.companyName}
            onChange={(e) => updateBasicInfo('companyName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例：株式会社サンプル"
            disabled={isReadOnly}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            代表者名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={applicationInfo.representativeName}
            onChange={(e) => updateBasicInfo('representativeName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例：山田 太郎"
            disabled={isReadOnly}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            キャリアアップ計画開始日 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={applicationInfo.planStartDate}
            onChange={(e) => handlePlanStartDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isReadOnly}
          />
          {validationError && (
            <p className="mt-1 text-sm text-red-600">{validationError}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            この日付から取組期間と申請期限が自動計算されます
          </p>
        </div>
      </div>

      {/* 期限情報表示 */}
      {deadlineCalc && (
        <div className={`border rounded-lg p-4 ${urgencyStyle?.bgColor}`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">計算された期限</h4>
            {deadlineCalc.isUrgent && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${urgencyStyle?.badgeColor}`}>
                期限が迫っています！
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm font-medium text-gray-700">取組期間</div>
              <div className="text-gray-900">
                {DeadlineCalculator.formatDateJapanese(deadlineCalc.planStartDate)} 〜{' '}
                {DeadlineCalculator.formatDateJapanese(deadlineCalc.planEndDate)}
              </div>
              <div className="text-xs text-gray-500">（6ヶ月間）</div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700 flex items-center">
                申請期限
                {!isReadOnly && (
                  <button
                    onClick={editState.isEditing ? cancelDeadlineEdit : startDeadlineEdit}
                    className="ml-2 text-blue-600 hover:text-blue-700 text-xs font-medium"
                  >
                    {editState.isEditing ? 'キャンセル' : '編集'}
                  </button>
                )}
                {applicationInfo.isDeadlineOverridden && (
                  <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                    手動設定
                  </span>
                )}
              </div>
              
              {editState.isEditing ? (
                <div className="space-y-2">
                  <input
                    type="date"
                    value={editState.tempStartDate}
                    onChange={(e) => setEditState(prev => ({ ...prev, tempStartDate: e.target.value }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="date"
                    value={editState.tempEndDate}
                    onChange={(e) => setEditState(prev => ({ ...prev, tempEndDate: e.target.value }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={saveDeadlineEdit}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      保存
                    </button>
                    <button
                      onClick={cancelDeadlineEdit}
                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={urgencyStyle?.textColor}>
                    {DeadlineCalculator.formatDateJapanese(deadlineCalc.applicationDeadlineStart)} 〜{' '}
                    {DeadlineCalculator.formatDateJapanese(deadlineCalc.applicationDeadlineEnd)}
                  </div>
                  <div className="text-xs text-gray-500">（2ヶ月間）</div>
                </>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">申請期限まで</span>
              <span className={`font-semibold ${urgencyStyle?.textColor}`}>
                {DeadlineCalculator.getDaysUntilDeadlineText(deadlineCalc.daysUntilDeadline)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 期限未設定の場合のヒント */}
      {!deadlineCalc && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
            </svg>
            <div>
              <div className="font-medium text-blue-800">期限管理</div>
              <div className="text-blue-700 text-sm">
                キャリアアップ計画開始日を入力すると、取組期間と申請期限が自動計算されます
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 保存ボタン */}
      {applicationInfo.companyName && applicationInfo.representativeName && applicationInfo.planStartDate && !isReadOnly && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              申請基本情報と期限管理の入力が完了しました
            </div>
            <button
              onClick={() => {
                // 進行中の申請として保存
                const savedApplications = localStorage.getItem('inProgressApplications') || '[]'
                const applications = JSON.parse(savedApplications)
                
                // 既存の申請があるかチェック（同じIDの申請が既にあるか）
                const existingIndex = applications.findIndex((app: any) => app.id === applicationId)
                
                const applicationData = {
                  ...applicationInfo,
                  id: applicationId,
                  status: 'in_progress',
                  created_at: existingIndex >= 0 ? applications[existingIndex].created_at : new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
                
                if (existingIndex >= 0) {
                  // 既存の申請を更新
                  applications[existingIndex] = applicationData
                  alert('申請情報が更新されました。')
                } else {
                  // 新規申請として追加
                  applications.push(applicationData)
                }
                
                localStorage.setItem('inProgressApplications', JSON.stringify(applications))
                
                // カスタムイベントを発火してダッシュボードの更新を通知
                window.dispatchEvent(new Event('localApplicationUpdate'))
                
                // 書類アップロードページへ遷移
                window.location.href = `/application/career-up/upload?id=${applicationId}`
              }}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
            >
              保存して次へ →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}