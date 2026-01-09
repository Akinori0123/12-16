'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { ApplicationInfo } from '@/types/deadline'
import { DeadlineCalculator } from '@/lib/deadlineUtils'

interface ClientApplication extends ApplicationInfo {
  status: 'draft' | 'in_progress' | 'review' | 'completed' | 'submitted' | 'approved' | 'rejected'
  documentCount: number
  lastUpdated: string
  clientEmail: string
  assignedConsultant: string
  notes?: string
  applicationDeadline?: string
}

export default function AdminDashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<ClientApplication[]>([])
  const [filter, setFilter] = useState<'all' | 'urgent' | 'in_progress' | 'completed' | 'pending_review'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingDeadline, setEditingDeadline] = useState<string | null>(null)
  const [newDeadline, setNewDeadline] = useState('')
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      // ページロード時にアプリケーション一覧をリセット
      setApplications([])
      
      // セッションストレージから管理者認証情報をチェック
      const adminUser = sessionStorage.getItem('adminUser')
      if (adminUser) {
        const userData = JSON.parse(adminUser)
        setUser({
          id: userData.id,
          email: userData.email,
          aud: 'authenticated',
          role: 'authenticated',
          email_confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: { company_name: userData.company_name },
          identities: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as User)
        
        // 常に最新データを取得
        await loadApplications()
        setLoading(false)
        return
      }

      // 管理者でない場合は管理者ログインページにリダイレクト
      router.push('/admin/login')
      setLoading(false)
    }

    checkUser()
  }, [router])

  const loadApplications = async () => {
    try {
      // データロード開始時にステートをリセット
      console.log('Loading applications - resetting state first')
      setApplications([])
      
      // セッションストレージから管理者認証情報をチェック
      const adminUser = sessionStorage.getItem('adminUser')
      if (!adminUser) {
        console.error('No admin user found')
        setApplications([])
        return
      }

      // 管理者APIエンドポイントから全申請データを取得（キャッシュを無効化）
      const response = await fetch('/api/admin/dashboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer admin-${JSON.parse(adminUser).email}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-store' // Next.jsのキャッシュも無効化
      })

      if (!response.ok) {
        throw new Error('管理者データの取得に失敗しました')
      }

      const data = await response.json()
      const applicationList = data.applications || []
      
      console.log('Raw API response:', { 
        applicationsCount: applicationList.length, 
        applications: applicationList.map((app: any) => ({ id: app.id, company_name: app.company_name }))
      })
      
      const formattedApplications: ClientApplication[] = applicationList.map((app: any) => {
        // planEndDateが未設定の場合は計算する
        let planEndDate = app.plan_end_date
        if (!planEndDate && app.plan_start_date) {
          const deadline = DeadlineCalculator.calculateDeadlines(app.plan_start_date)
          planEndDate = deadline.planEndDate.toISOString().split('T')[0]
        }
        
        return {
          id: app.id,
          companyName: app.company_name,
          representativeName: app.representative_name,
          planStartDate: app.plan_start_date,
          planEndDate: planEndDate,
          applicationDeadlineStart: app.application_deadline,
          applicationDeadlineEnd: app.application_deadline,
          isDeadlineOverridden: !!app.application_deadline,
          status: app.status,
          created_at: app.created_at,
          updated_at: app.updated_at,
          clientEmail: app.email || (app.user_profile?.id ? `user${app.user_profile.id.slice(0, 8)}@example.com` : 'unknown@example.com'),
          assignedConsultant: '管理者',
          documentCount: app.documents_count || 0,
          lastUpdated: app.updated_at || app.created_at || new Date().toISOString(),
          notes: '',
          applicationDeadline: app.application_deadline // 特定の日付
        }
      })
      
      console.log('Formatted applications before setting state:', {
        count: formattedApplications.length,
        applications: formattedApplications.map(app => ({ id: app.id, companyName: app.companyName }))
      })
      
      setApplications(formattedApplications)
    } catch (error) {
      console.error('管理者申請データ読み込みエラー:', error)
      // エラー時は必ず空の状態に設定（デモデータやキャッシュは使用しない）
      console.log('Setting applications to empty array due to error')
      setApplications([])
    }
  }

  const handleUpdateDeadline = async (applicationId: string, deadline: string) => {
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/deadline`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json; charset=utf-8',
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({ application_deadline: deadline })
      })

      if (!response.ok) {
        throw new Error('申請期限の更新に失敗しました')
      }

      // 申請一覧を再読み込み
      await loadApplications()
      setEditingDeadline(null)
      setNewDeadline('')
      alert('申請期限を更新しました。')
    } catch (error) {
      console.error('申請期限更新エラー:', error)
      alert('申請期限の更新に失敗しました。')
    }
  }


  const getFilteredApplications = () => {
    let filtered = applications

    // 検索フィルター
    if (searchTerm) {
      filtered = filtered.filter(app => 
        app.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.representativeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.clientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.assignedConsultant.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // ステータスフィルター
    switch (filter) {
      case 'in_progress':
        return filtered.filter(app => app.status === 'in_progress' || app.status === 'draft')
      case 'completed':
        return filtered.filter(app => app.status === 'completed' || app.status === 'approved' || app.status === 'rejected')
      case 'pending_review':
        return filtered.filter(app => app.status === 'review' || app.status === 'submitted')
      default:
        return filtered
    }
  }

  const getStatusBadge = (status: ClientApplication['status']) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-700',
      in_progress: 'bg-blue-100 text-blue-700',
      review: 'bg-purple-100 text-purple-700',
      submitted: 'bg-purple-100 text-purple-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      completed: 'bg-green-100 text-green-700'
    }
    
    const labels = {
      draft: '下書き',
      in_progress: '書類提出中',
      review: '審査待ち',
      submitted: '審査待ち',
      approved: '承認済み',
      rejected: '却下',
      completed: '完了'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status]}`}>
        {labels[status]}
      </span>
    )
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
            <div className="w-8 h-8 bg-blue-600 rounded-lg mr-3 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">管理者ダッシュボード</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">管理者</span>
            <button
              onClick={() => {
                sessionStorage.removeItem('adminUser')
                router.push('/admin/login')
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* 統計サマリー */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {applications.filter(app => app.status === 'in_progress' || app.status === 'draft').length}
                </div>
                <div className="text-sm text-gray-600">書類提出中</div>
                <div className="text-xs text-gray-500 mt-1">書類アップロード中</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {applications.filter(app => app.status === 'review' || app.status === 'submitted').length}
                </div>
                <div className="text-sm text-gray-600">審査待ち</div>
                <div className="text-xs text-gray-500 mt-1">管理者審査待ち</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {applications.filter(app => app.status === 'completed' || app.status === 'approved').length}
                </div>
                <div className="text-sm text-gray-600">完了済み</div>
                <div className="text-xs text-gray-500 mt-1">申請処理完了</div>
              </div>
            </div>
          </div>
        </div>


        {/* 助成金書類管理ボタン */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">助成金書類管理</h2>
                <p className="text-gray-600 text-sm">各助成金の必要書類を編集・管理</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/admin/documents')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              書類管理を開く
            </button>
          </div>
        </div>

        {/* 検索とフィルター */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="会社名、担当者名、メールアドレス、コンサルタント名で検索..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'すべて' },
                { key: 'in_progress', label: '書類提出中' },
                { key: 'pending_review', label: '審査待ち' },
                { key: 'completed', label: '完了済み' }
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setFilter(item.key as typeof filter)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === item.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 申請一覧 */}
        <div className="space-y-4">
          {getFilteredApplications().length === 0 ? (
            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">条件に一致する申請がありません</h3>
              <p className="text-gray-600">検索条件やフィルターを変更してください</p>
            </div>
          ) : (
            getFilteredApplications().map((app) => {
              const deadline = DeadlineCalculator.calculateDeadlines(app.planStartDate)
              
              return (
                <div key={app.id} className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">{app.companyName}</h3>
                        {getStatusBadge(app.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-gray-600">
                            <div>代表者: {app.representativeName}</div>
                            <div>メール: {app.clientEmail}</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">
                            <div>書類提出期限: {app.applicationDeadline ? new Date(app.applicationDeadline).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : '未設定'}</div>
                          </div>
                        </div>
                      </div>

                      {app.notes && (
                        <div className="bg-gray-50 p-3 rounded-lg mb-4">
                          <div className="text-sm font-medium text-gray-700 mb-1">メモ</div>
                          <div className="text-sm text-gray-600">{app.notes}</div>
                        </div>
                      )}

                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          期限まで: {DeadlineCalculator.getDaysUntilDeadlineText(deadline.daysUntilDeadline)}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                          </svg>
                          最終更新: {new Date(app.lastUpdated).toLocaleDateString('ja-JP')}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      {/* 審査待ち申請には「審査実施」ボタン */}
                      {(app.status === 'review' || app.status === 'submitted') && (
                        <button
                          onClick={() => router.push(`/admin/review/${app.id}`)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          審査実施
                        </button>
                      )}
                      
                      {/* 書類提出中申請には申請期限編集ボタン */}
                      {(app.status === 'in_progress' || app.status === 'draft') && (
                        <div className="space-y-2">
                          {editingDeadline === app.id ? (
                            <div className="space-y-2">
                              <input
                                type="date"
                                value={newDeadline}
                                onChange={(e) => setNewDeadline(e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => handleUpdateDeadline(app.id, newDeadline)}
                                  className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                                >
                                  保存
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingDeadline(null)
                                    setNewDeadline('')
                                  }}
                                  className="bg-gray-400 text-white px-2 py-1 rounded text-xs hover:bg-gray-500 transition-colors"
                                >
                                  キャンセル
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingDeadline(app.id)
                                setNewDeadline(app.applicationDeadline || '')
                              }}
                              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm"
                            >
                              期限編集
                            </button>
                          )}
                        </div>
                      )}
                      
                      {/* 完了済み申請には「詳細確認」ボタン */}
                      {(app.status === 'completed' || app.status === 'approved' || app.status === 'rejected') && (
                        <button
                          onClick={() => router.push(`/admin/review/${app.id}`)}
                          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                        >
                          詳細確認
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}