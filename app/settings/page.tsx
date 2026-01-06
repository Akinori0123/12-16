'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface CompanySettings {
  companyName: string
  representativeName: string
  businessAddress: string
  phoneNumber: string
  email: string
  businessType: string
  foundedDate: string
  employeeCount: string
  capitalAmount: string
  contactPerson: string
  contactEmail: string
  contactPhone: string
  notifications: {
    deadlineReminders: boolean
    statusUpdates: boolean
    documentRequests: boolean
    emailReports: boolean
  }
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<CompanySettings>({
    companyName: '',
    representativeName: '',
    businessAddress: '',
    phoneNumber: '',
    email: '',
    businessType: '',
    foundedDate: '',
    employeeCount: '',
    capitalAmount: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    notifications: {
      deadlineReminders: true,
      statusUpdates: true,
      documentRequests: true,
      emailReports: false
    }
  })
  const [activeTab, setActiveTab] = useState<'company' | 'contact' | 'notifications'>('company')
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      // デモユーザーチェック
      const demoUser = localStorage.getItem('demoUser')
      if (demoUser) {
        const userData = JSON.parse(demoUser)
        
        // 管理者の場合は一般設定ページにアクセス禁止
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
          user_metadata: { 
            company_name: userData.company_name,
            representative_name: userData.representative_name
          },
          identities: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as User)
        
        setLoading(false)
        return
      }

      // 通常のSupabase認証チェック
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      
      if (session?.user) {
        setLoading(false)
      } else {
        router.push('/auth/login')
        setLoading(false)
      }
    }

    checkUser()
  }, [router])

  // ユーザー情報が設定されたらloadSettingsを呼び出す
  useEffect(() => {
    if (user && !loading) {
      loadSettings()
    }
  }, [user, loading])

  const loadSettings = () => {
    // ローカルストレージから設定を読み込み
    const savedSettings = localStorage.getItem('companySettings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    } else {
      // デフォルト値をユーザー登録情報から設定
      const demoUser = localStorage.getItem('demoUser')
      if (demoUser) {
        // デモユーザーの場合
        const userData = JSON.parse(demoUser)
        setSettings(prev => ({
          ...prev,
          companyName: userData.company_name || 'デモ株式会社',
          representativeName: userData.representative_name || '山田 太郎',
          email: userData.email,
          contactEmail: userData.email,
          contactPerson: userData.representative_name || '山田 太郎'
        }))
      } else if (user) {
        // 通常のSupabaseユーザーの場合
        setSettings(prev => ({
          ...prev,
          companyName: user.user_metadata?.company_name || '',
          representativeName: user.user_metadata?.representative_name || '',
          businessAddress: user.user_metadata?.address || '',
          phoneNumber: user.user_metadata?.phone_number || '',
          email: user.email || '',
          contactEmail: user.email || '',
          contactPerson: user.user_metadata?.representative_name || '',
          contactPhone: user.user_metadata?.phone_number || ''
        }))
      }
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    
    try {
      // ローカルストレージに保存
      localStorage.setItem('companySettings', JSON.stringify(settings))
      
      // デモユーザー情報も更新
      const demoUser = localStorage.getItem('demoUser')
      if (demoUser) {
        const userData = JSON.parse(demoUser)
        userData.company_name = settings.companyName
        localStorage.setItem('demoUser', JSON.stringify(userData))
      }
      
      // 成功メッセージ表示のシミュレート
      setTimeout(() => {
        setSaving(false)
        alert('設定が保存されました')
      }, 1000)
      
    } catch (error) {
      console.error('Settings save error:', error)
      setSaving(false)
      alert('設定の保存に失敗しました')
    }
  }

  const updateSettings = (field: keyof CompanySettings | string, value: any) => {
    setSettings(prev => {
      if (field.includes('.')) {
        // notifications.deadlineReminders のようなネストしたフィールド
        const [parent, child] = field.split('.')
        return {
          ...prev,
          [parent]: {
            ...(prev[parent as keyof CompanySettings] as object),
            [child]: value
          }
        }
      } else {
        return {
          ...prev,
          [field]: value
        }
      }
    })
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">設定</h1>
          </div>
          <div className="flex items-center space-x-4">
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md border border-gray-200">
          {/* タブナビゲーション */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'company', label: '会社情報', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
                { key: 'contact', label: '連絡先情報', icon: 'M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                { key: 'notifications', label: '通知設定', icon: 'M15 17h5l-5 5v-5zM4 19v-5h5l-5 5z' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`flex items-center py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon}/>
                  </svg>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* タブコンテンツ */}
          <div className="p-6">
            {activeTab === 'company' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">会社基本情報</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      会社名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={settings.companyName}
                      onChange={(e) => updateSettings('companyName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="株式会社サンプル"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      代表者名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={settings.representativeName}
                      onChange={(e) => updateSettings('representativeName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="山田 太郎"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      本社住所
                    </label>
                    <input
                      type="text"
                      value={settings.businessAddress}
                      onChange={(e) => updateSettings('businessAddress', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="東京都渋谷区..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      電話番号
                    </label>
                    <input
                      type="tel"
                      value={settings.phoneNumber}
                      onChange={(e) => updateSettings('phoneNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="03-0000-0000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      メールアドレス
                    </label>
                    <input
                      type="email"
                      value={settings.email}
                      onChange={(e) => updateSettings('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="info@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      業種
                    </label>
                    <select
                      value={settings.businessType}
                      onChange={(e) => updateSettings('businessType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">選択してください</option>
                      <option value="manufacturing">製造業</option>
                      <option value="construction">建設業</option>
                      <option value="retail">小売業</option>
                      <option value="it">情報技術産業</option>
                      <option value="service">サービス業</option>
                      <option value="other">その他</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      設立年月日
                    </label>
                    <input
                      type="date"
                      value={settings.foundedDate}
                      onChange={(e) => updateSettings('foundedDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      従業員数
                    </label>
                    <select
                      value={settings.employeeCount}
                      onChange={(e) => updateSettings('employeeCount', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">選択してください</option>
                      <option value="1-10">1-10人</option>
                      <option value="11-50">11-50人</option>
                      <option value="51-100">51-100人</option>
                      <option value="101-300">101-300人</option>
                      <option value="301+">301人以上</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      資本金
                    </label>
                    <input
                      type="text"
                      value={settings.capitalAmount}
                      onChange={(e) => updateSettings('capitalAmount', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1000万円"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">連絡先情報</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      担当者名
                    </label>
                    <input
                      type="text"
                      value={settings.contactPerson}
                      onChange={(e) => updateSettings('contactPerson', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="人事担当者名"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      担当者メールアドレス
                    </label>
                    <input
                      type="email"
                      value={settings.contactEmail}
                      onChange={(e) => updateSettings('contactEmail', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="hr@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      担当者電話番号
                    </label>
                    <input
                      type="tel"
                      value={settings.contactPhone}
                      onChange={(e) => updateSettings('contactPhone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="03-0000-0000"
                    />
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                    </svg>
                    <div>
                      <div className="font-medium text-blue-800">連絡先情報について</div>
                      <div className="text-blue-700 text-sm">
                        この情報は申請書類への自動入力や、緊急時の連絡先として使用されます。
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">通知設定</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">期限リマインダー</div>
                      <div className="text-sm text-gray-600">申請期限が近づいたときに通知を受け取る</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.deadlineReminders}
                        onChange={(e) => updateSettings('notifications.deadlineReminders', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">ステータス更新通知</div>
                      <div className="text-sm text-gray-600">申請ステータスが変更されたときに通知を受け取る</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.statusUpdates}
                        onChange={(e) => updateSettings('notifications.statusUpdates', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">書類リクエスト通知</div>
                      <div className="text-sm text-gray-600">追加書類が必要な場合に通知を受け取る</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.documentRequests}
                        onChange={(e) => updateSettings('notifications.documentRequests', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">週次レポート</div>
                      <div className="text-sm text-gray-600">週次の進捗レポートをメールで受け取る</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.emailReports}
                        onChange={(e) => updateSettings('notifications.emailReports', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                    <div>
                      <div className="font-medium text-yellow-800">通知について</div>
                      <div className="text-yellow-700 text-sm">
                        通知はメールアドレスまたはシステム内通知で送信されます。重要な期限に関する通知は無効にしないことをお勧めします。
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 保存ボタン */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  saving
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {saving ? '保存中...' : '設定を保存'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}