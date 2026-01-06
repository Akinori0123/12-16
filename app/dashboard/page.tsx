'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { DeadlineCalculator } from '@/lib/deadlineUtils'

interface ApplicationWithStatus {
  id: string
  companyName: string
  representativeName: string
  planStartDate: string
  planEndDate: string
  status: 'draft' | 'in_progress' | 'review' | 'completed' | 'submitted' | 'approved' | 'rejected'
  subsidyType: string
  subsidyName: string
  created_at: string
  updated_at: string
  review_comments?: string
  applicationDeadline?: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [companyApplications, setCompanyApplications] = useState({
    inProgress: 2,
    completed: 1,
    urgent: 1,
    total: 3
  })
  const [applications, setApplications] = useState<ApplicationWithStatus[]>([])
  const router = useRouter()

  const loadCompanyApplications = async (user: User) => {
    try {
      console.log('Loading applications for user:', user.id)
      // Supabaseからユーザーのセッションとトークンを取得
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.error('No session found')
        return
      }

      // Supabaseから申請データを取得（キャッシュを無効化）
      const response = await fetch('/api/applications?' + new Date().getTime(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })

      if (!response.ok) {
        console.error('Failed to fetch applications:', response.status, response.statusText)
        throw new Error('申請データの取得に失敗しました')
      }

      const data = await response.json()
      const applicationList = data.applications || []
      console.log('Fetched applications:', applicationList.length, 'items')
      
      const formattedApplications: ApplicationWithStatus[] = applicationList.map((app: any) => ({
        id: app.id,
        companyName: app.company_name,
        representativeName: app.representative_name,
        planStartDate: app.plan_start_date,
        planEndDate: app.plan_end_date,
        status: app.status,
        subsidyType: app.subsidy_type,
        subsidyName: app.subsidy_type === 'career_up' ? 'キャリアアップ助成金' : 'その他の助成金',
        created_at: app.created_at,
        updated_at: app.updated_at,
        review_comments: app.review_comments,
        applicationDeadline: app.application_deadline
      }))
      
      setApplications(formattedApplications)
      console.log('Applications state updated with', formattedApplications.length, 'applications')
      
      const inProgressCount = formattedApplications.filter((app) => app.status === 'in_progress' && !app.review_comments).length
      const rejectedCount = formattedApplications.filter((app) => app.status === 'in_progress' && app.review_comments).length
      const pendingReviewCount = formattedApplications.filter((app) => app.status === 'review' || app.status === 'submitted').length
      const completedCount = formattedApplications.filter((app) => app.status === 'completed').length
      
      setCompanyApplications({
        inProgress: inProgressCount,
        completed: completedCount,
        urgent: pendingReviewCount + rejectedCount,
        total: formattedApplications.length
      })
      console.log('Dashboard stats updated:', {
        inProgress: inProgressCount,
        completed: completedCount,
        urgent: pendingReviewCount,
        total: formattedApplications.length
      })
    } catch (error) {
      console.error('申請データ読み込みエラー:', error)
      // エラー時は空の状態に設定
      setApplications([])
      setCompanyApplications({
        inProgress: 0,
        completed: 0,
        urgent: 0,
        total: 0
      })
    }
  }

  // 締切が近い申請を取得する関数
  const getUrgentApplications = () => {
    return applications.filter(app => {
      if (app.status === 'completed' || app.status === 'approved') return false
      
      if (!app.applicationDeadline) return false
      
      try {
        const deadline = new Date(app.applicationDeadline)
        const now = new Date()
        const timeDiff = deadline.getTime() - now.getTime()
        const daysUntilDeadline = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
        
        return daysUntilDeadline <= 14 && daysUntilDeadline >= 0
      } catch (error) {
        console.warn('Error calculating deadline for application:', app.id, error)
        return false
      }
    })
  }

  useEffect(() => {
    const checkUser = async () => {
      // Supabase認証チェック
      const { data: { session } } = await supabase.auth.getSession()
      const sessionUser = session?.user || null
      setUser(sessionUser)
      
      if (sessionUser) {
        await loadCompanyApplications(sessionUser)
      }
      
      setLoading(false)
    }

    checkUser()
    
  }, [router])
  
  // 申請データの更新を監視する別のuseEffect
  useEffect(() => {
    if (!user) return
    
    // 初期読み込み
    loadCompanyApplications(user)
    
    // タブフォーカス時にデータを再読み込み
    const handleFocus = () => {
      loadCompanyApplications(user)
    }
    
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [user])

  const handleLogout = async () => {
    // Supabase認証をクリア
    await supabase.auth.signOut()
    
    setUser(null)
    router.push('/auth/login')
  }

  const handleDeleteApplication = async (applicationId: string, applicationName: string) => {
    if (confirm(`「${applicationName}」の申請を削除しますか？この操作は取り消せません。`)) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          alert('認証エラーです。ページを再読み込みしてください。')
          return
        }

        const response = await fetch(`/api/applications/${applicationId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error('申請の削除に失敗しました')
        }

        // 削除成功後、データを再読み込み
        console.log('Reloading applications after deletion...')
        await loadCompanyApplications(user!)
        console.log('Applications reloaded successfully')
        alert('申請が削除されました。')
      } catch (error) {
        console.error('申請削除エラー:', error)
        alert('申請の削除中にエラーが発生しました。')
      }
    }
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
          <p className="text-gray-600 mb-6">ダッシュボードを利用するにはログインが必要です。</p>
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
            <div className="w-8 h-8 bg-blue-600 rounded-lg mr-3 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              SubsidySmart
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/settings')}
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm"
            >
              設定
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">助成金申請ダッシュボード</h1>
          <p className="text-gray-600">申請したい助成金を選択して手続きを開始してください</p>
          
          <div className="mt-4 flex space-x-4">
            <button
              onClick={() => router.push('/subsidies')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
新規で助成金を申請する
            </button>
          </div>
        </div>

        {/* 締切アラート */}
        {(() => {
          const urgentApps = getUrgentApplications()
          if (urgentApps.length === 0) return null
          
          return (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    申請期限が近づいています！
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <div className="space-y-2">
                      {urgentApps.map(app => {
                        const deadline = new Date(app.applicationDeadline!)
                        const now = new Date()
                        const timeDiff = deadline.getTime() - now.getTime()
                        const daysUntilDeadline = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
                        const urgencyStyle = DeadlineCalculator.getUrgencyStyle(daysUntilDeadline)
                        
                        return (
                          <div key={app.id} className="flex items-center justify-between bg-red-100 p-3 rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">{app.companyName} - {app.subsidyName}</div>
                              <div className="text-xs">
                                書類提出期限: {app.applicationDeadline ? new Date(app.applicationDeadline).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : '未設定'}
                              </div>
                            </div>
                            <div className="ml-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${urgencyStyle.badgeColor}`}>
                                {DeadlineCalculator.getDaysUntilDeadlineText(daysUntilDeadline)}
                              </span>
                            </div>
                            <div className="ml-4">
                              <button
                                onClick={() => router.push(`/application/career-up?id=${app.id}`)}
                                className="text-red-800 hover:text-red-900 font-medium text-sm underline"
                              >
                                今すぐ対応
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-red-600">
                      期限を過ぎると助成金を受給できなくなります。お急ぎください。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              申請一覧とその進行状況
            </h2>
          </div>
          <div className="space-y-4">
            {/* 統計サマリー */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">{companyApplications.inProgress}</div>
                <div className="text-sm text-blue-700">書類提出中</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-600">{companyApplications.urgent}</div>
                <div className="text-sm text-purple-700">要対応</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">{companyApplications.completed}</div>
                <div className="text-sm text-green-700">完了済み</div>
              </div>
            </div>
            
            {/* 申請一覧 */}
            {applications.length > 0 ? (
                <div className="space-y-3">
                  {/* 差し戻し申請がある場合 */}
                  {applications.filter(app => app.status === 'in_progress' && app.review_comments).length > 0 && (
                    <>
                      <h4 className="text-md font-semibold text-red-900 mb-3">差し戻し申請</h4>
                      {applications.filter(app => app.status === 'in_progress' && app.review_comments).map((app) => {
                        return (
                          <div key={app.id} className="border border-red-200 bg-red-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2 cursor-pointer flex-1"
                                   onClick={() => router.push(`/application/career-up?id=${app.id}`)}>
                                <h5 className="font-medium text-gray-900">{app.companyName}</h5>
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                  {app.subsidyName}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                                  差し戻し
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteApplication(app.id, app.companyName)
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                  title="申請を削除"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H9a1 1 0 00-1 1v3M4 7h16"/>
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 cursor-pointer mb-3"
                                 onClick={() => router.push(`/application/career-up?id=${app.id}`)}>
                              <div>代表者: {app.representativeName}</div>
                              <div className="flex items-center justify-between mt-1">
                                <div>
                                  書類提出期限: {app.applicationDeadline ? new Date(app.applicationDeadline).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : '未設定'}
                                </div>
                                {(() => {
                                  if (!app.applicationDeadline) return null
                                  
                                  const deadline = new Date(app.applicationDeadline)
                                  const now = new Date()
                                  const timeDiff = deadline.getTime() - now.getTime()
                                  const daysUntilDeadline = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
                                  const urgencyStyle = DeadlineCalculator.getUrgencyStyle(daysUntilDeadline)
                                  
                                  if (daysUntilDeadline <= 14 && daysUntilDeadline >= 0) {
                                    return (
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${urgencyStyle.badgeColor}`}>
                                        {DeadlineCalculator.getDaysUntilDeadlineText(daysUntilDeadline)}
                                      </span>
                                    )
                                  }
                                  return null
                                })()}
                              </div>
                            </div>
                            {app.review_comments && (
                              <div className="bg-red-100 border border-red-200 rounded-lg p-3">
                                <div className="flex items-center mb-2">
                                  <svg className="w-4 h-4 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                                  </svg>
                                  <span className="text-sm font-medium text-red-800">管理者からのコメント</span>
                                </div>
                                <p className="text-sm text-red-700">{app.review_comments}</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </>
                  )}

                  <h4 className="text-md font-semibold text-gray-900 mb-3">書類提出中の申請</h4>
                  {applications.filter(app => app.status === 'in_progress' && !app.review_comments).map((app) => {
                    return (
                      <div key={app.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2 cursor-pointer flex-1"
                               onClick={() => router.push(`/application/career-up?id=${app.id}`)}>
                            <h5 className="font-medium text-gray-900">{app.companyName}</h5>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {app.subsidyName}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              書類提出中
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteApplication(app.id, app.companyName)
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                              title="申請を削除"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H9a1 1 0 00-1 1v3M4 7h16"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 cursor-pointer"
                             onClick={() => router.push(`/application/career-up?id=${app.id}`)}>
                          <div>代表者: {app.representativeName}</div>
                          <div className="flex items-center justify-between mt-1">
                            <div>
                              書類提出期限: {app.applicationDeadline ? new Date(app.applicationDeadline).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : '未設定'}
                            </div>
                            {(() => {
                              if (!app.applicationDeadline) return null
                              
                              const deadline = new Date(app.applicationDeadline)
                              const now = new Date()
                              const timeDiff = deadline.getTime() - now.getTime()
                              const daysUntilDeadline = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
                              const urgencyStyle = DeadlineCalculator.getUrgencyStyle(daysUntilDeadline)
                              
                              if (daysUntilDeadline <= 14 && daysUntilDeadline >= 0) {
                                return (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${urgencyStyle.badgeColor}`}>
                                    {DeadlineCalculator.getDaysUntilDeadlineText(daysUntilDeadline)}
                                  </span>
                                )
                              }
                              return null
                            })()}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* 審査待ちの申請がある場合 */}
                  {applications.filter(app => app.status === 'submitted' || app.status === 'review').length > 0 && (
                    <>
                      <h4 className="text-md font-semibold text-gray-900 mb-3 mt-6">審査待ちの申請</h4>
                      {applications.filter(app => app.status === 'submitted' || app.status === 'review').slice(0, 3).map((app) => (
                        <div key={app.id} className="border border-gray-200 rounded-lg p-4 bg-purple-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <h5 className="font-medium text-gray-900">{app.companyName}</h5>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                {app.subsidyName}
                              </span>
                            </div>
                            <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-full">
                              審査待ち
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <div>代表者: {app.representativeName}</div>
                            <div>提出日: {new Date(app.updated_at).toLocaleDateString('ja-JP')}</div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  
                  {/* 完了済みの申請がある場合 */}
                  {applications.filter(app => app.status === 'completed' || app.status === 'approved' || app.status === 'rejected').length > 0 && (
                    <>
                      <h4 className="text-md font-semibold text-gray-900 mb-3 mt-6">完了済みの申請</h4>
                      {applications.filter(app => app.status === 'completed' || app.status === 'approved' || app.status === 'rejected').slice(0, 3).map((app) => (
                        <div key={app.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <h5 className="font-medium text-gray-900">{app.companyName}</h5>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                {app.subsidyName}
                              </span>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              app.status === 'approved' ? 'bg-green-100 text-green-600' :
                              app.status === 'rejected' ? 'bg-red-100 text-red-600' :
                              'bg-green-100 text-green-600'
                            }`}>
                              {app.status === 'approved' ? '承認済み' :
                               app.status === 'rejected' ? '差し戻し' : '完了'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <div>代表者: {app.representativeName}</div>
                            <div>最終更新: {new Date(app.updated_at).toLocaleDateString('ja-JP')}</div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ) : (
              <div className="text-center py-8 border border-gray-200 rounded-lg">
                <p className="text-gray-500 mb-4">まだ申請がありません</p>
                <button
                  onClick={() => router.push('/subsidies')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  新規申請を開始
                </button>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  )
}