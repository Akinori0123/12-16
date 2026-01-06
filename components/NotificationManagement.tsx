'use client'

import { useState } from 'react'

interface NotificationManagementProps {
  onNotificationSent?: () => void
}

export default function NotificationManagement({ onNotificationSent }: NotificationManagementProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [lastCheckResult, setLastCheckResult] = useState<string>('')
  const [manualApplicationId, setManualApplicationId] = useState('')
  const [manualMessage, setManualMessage] = useState('')

  const handleCheckReminders = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/notifications/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setLastCheckResult('期限チェックが完了しました。必要に応じてリマインダーを送信しました。')
        if (onNotificationSent) {
          onNotificationSent()
        }
      } else {
        setLastCheckResult(`エラーが発生しました: ${result.error}`)
      }
    } catch (error) {
      setLastCheckResult(`通信エラーが発生しました: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualReminder = async () => {
    if (!manualApplicationId.trim()) {
      alert('申請IDを入力してください')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/notifications/reminders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          applicationId: manualApplicationId,
          message: manualMessage
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setLastCheckResult('手動リマインダーの送信が完了しました。')
        setManualApplicationId('')
        setManualMessage('')
        if (onNotificationSent) {
          onNotificationSent()
        }
      } else {
        setLastCheckResult(`手動リマインダー送信エラー: ${result.error}`)
      }
    } catch (error) {
      setLastCheckResult(`通信エラーが発生しました: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mr-4">
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5zM10.5 12L12 10.5 10.5 9 9 10.5l1.5 1.5zM19.5 7.5L18 6l1.5-1.5L21 6l-1.5 1.5zM4.5 4.5L6 6 4.5 7.5 3 6l1.5-1.5z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">通知管理</h2>
          <p className="text-gray-600 text-sm">期限リマインダーの管理と送信</p>
        </div>
      </div>

      {/* 自動リマインダーチェック */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">自動リマインダーチェック</h3>
        <p className="text-gray-600 text-sm mb-4">
          すべての申請の期限をチェックし、必要に応じてリマインダーを送信します。
          7日前、3日前、1日前に自動送信されます。
        </p>
        <button
          onClick={handleCheckReminders}
          disabled={isLoading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '処理中...' : '期限チェック実行'}
        </button>
      </div>

      {/* 手動リマインダー送信 */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">手動リマインダー送信</h3>
        <p className="text-gray-600 text-sm mb-4">
          特定の申請に対して手動でリマインダーを送信できます。
        </p>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="applicationId" className="block text-sm font-medium text-gray-700 mb-2">
              申請ID
            </label>
            <input
              id="applicationId"
              type="text"
              value={manualApplicationId}
              onChange={(e) => setManualApplicationId(e.target.value)}
              placeholder="demo-application-001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label htmlFor="customMessage" className="block text-sm font-medium text-gray-700 mb-2">
              カスタムメッセージ（任意）
            </label>
            <textarea
              id="customMessage"
              value={manualMessage}
              onChange={(e) => setManualMessage(e.target.value)}
              placeholder="追加メッセージがあれば入力してください"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
          
          <button
            onClick={handleManualReminder}
            disabled={isLoading || !manualApplicationId.trim()}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '送信中...' : '手動リマインダー送信'}
          </button>
        </div>
      </div>

      {/* 実行結果 */}
      {lastCheckResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
            </svg>
            <div>
              <h4 className="font-medium text-blue-800 mb-1">実行結果</h4>
              <p className="text-blue-700 text-sm">{lastCheckResult}</p>
            </div>
          </div>
        </div>
      )}

      {/* 通知設定情報 */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h4 className="text-md font-medium text-gray-900 mb-3">通知設定情報</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">送信タイミング:</span>
              <div className="text-gray-600 ml-2">
                • 期限7日前<br/>
                • 期限3日前<br/>
                • 期限1日前
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">環境:</span>
              <div className="text-gray-600 ml-2">
                {process.env.NODE_ENV === 'development' ? 'デモモード（コンソール出力）' : '本番モード（実際のメール送信）'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}