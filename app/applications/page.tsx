'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { ApplicationInfo } from '@/types/deadline'
import { DeadlineCalculator } from '@/lib/deadlineUtils'

interface ApplicationWithStatus extends ApplicationInfo {
  status: 'draft' | 'in_progress' | 'completed' | 'submitted' | 'approved' | 'rejected'
  documentCount: number
  lastUpdated: string
  subsidyType: 'career_up' | 'work_life_balance' | 'human_resource_support'
  subsidyName: string
}

export default function ApplicationListPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<ApplicationWithStatus[]>([])
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'pending_review' | 'completed'>('all')
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      // デモユーザーチェック
      const demoUser = localStorage.getItem('demoUser')
      if (demoUser) {
        const userData = JSON.parse(demoUser)
        
        // 管理者の場合は一般申請ページにアクセス禁止
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
          user_metadata: { company_name: userData.company_name },
          identities: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as User)
        
        loadApplications()
        setLoading(false)
        return
      }

      // 通常のSupabase認証チェック
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      
      if (session?.user) {
        loadApplications()
      } else {
        router.push('/auth/login')
      }
      
      setLoading(false)
    }

    checkUser()
  }, [router])

  const loadApplications = () => {
    // 進行中の申請をローカルストレージから読み込み
    const inProgressApplications = localStorage.getItem('inProgressApplications')
    
    if (inProgressApplications) {
      const applications = JSON.parse(inProgressApplications)
      const formattedApplications: ApplicationWithStatus[] = applications.map((app: any) => ({
        ...app,
        subsidyType: 'career_up',
        subsidyName: 'キャリアアップ助成金',
        documentCount: 0, // 実際のプロジェクトでは書類数を取得
        lastUpdated: app.updated_at || app.created_at || new Date().toISOString()
      }))
      setApplications(formattedApplications)
    } else {
      setApplications([])
    }
  }

  const getFilteredApplications = () => {
    return applications.filter(app => {
      if (filter === 'all') return true
      if (filter === 'in_progress') return app.status === 'in_progress' || app.status === 'draft'
      if (filter === 'pending_review') return app.status === 'submitted'
      if (filter === 'completed') return app.status === 'completed' || app.status === 'approved' || app.status === 'rejected'
      return true
    })
  }

  const getStatusBadge = (status: ApplicationWithStatus['status']) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      submitted: 'bg-purple-100 text-purple-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    }
    
    const labels = {
      draft: '下書き',
      in_progress: '書類提出中',
      completed: '完了',
      submitted: '審査待ち',
      approved: '承認済み',
      rejected: '差し戻し'
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">申請一覧</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={() => router.push('/subsidies')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              新規申請
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* フィルター */}
        <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-6">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              すべて ({applications.length})
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'in_progress' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              書類提出中 ({applications.filter(app => app.status === 'in_progress' || app.status === 'draft').length})
            </button>
            <button
              onClick={() => setFilter('pending_review')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'pending_review' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
            >
              審査待ち ({applications.filter(app => app.status === 'submitted').length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'completed' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              完了済み ({applications.filter(app => app.status === 'completed' || app.status === 'approved' || app.status === 'rejected').length})
            </button>
          </div>
        </div>

        {/* 申請リスト */}
        <div className="space-y-4">
          {getFilteredApplications().length === 0 ? (
            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">申請がありません</h3>
              <p className="text-gray-600 mb-4">新しい助成金申請を開始してください</p>
              <button
                onClick={() => router.push('/application/career-up')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                新規申請を開始
              </button>
            </div>
          ) : (
            getFilteredApplications().map((app) => {
              const deadline = DeadlineCalculator.calculateDeadlines(app.planStartDate)
              
              return (
                <div key={app.id} className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{app.companyName}</h3>
                        {getStatusBadge(app.status)}
                      </div>
                      
                      <div className="mb-3">
                        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {app.subsidyName}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-4">
                        <div>代表者: {app.representativeName}</div>
                        <div>申請期限: {DeadlineCalculator.formatDateJapanese(deadline.applicationDeadlineStart)} 〜 {DeadlineCalculator.formatDateJapanese(deadline.applicationDeadlineEnd)}</div>
                      </div>

                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                          </svg>
                          書類: {app.documentCount}/3
                        </div>
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

                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => {
                          const routePath = app.subsidyType === 'career_up' ? '/application/career-up' :
                                         app.subsidyType === 'work_life_balance' ? '/application/work-life-balance' :
                                         app.subsidyType === 'human_resource_support' ? '/application/human-resource-support' :
                                         '/application/career-up'
                          router.push(routePath)
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        詳細・編集
                      </button>
                      {app.status === 'in_progress' && (
                        <button
                          onClick={() => {
                            const routePath = app.subsidyType === 'career_up' ? '/application/career-up/generate' :
                                           app.subsidyType === 'work_life_balance' ? '/application/work-life-balance/generate' :
                                           app.subsidyType === 'human_resource_support' ? '/application/human-resource-support/generate' :
                                           '/application/career-up/generate'
                            router.push(routePath)
                          }}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          書類生成
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