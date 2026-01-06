import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // 管理者用の特別認証
    if (token.startsWith('admin-')) {
      const adminEmail = token.replace('admin-', '')
      
      // 環境変数から管理者認証情報を取得
      const validAdminEmail = process.env.ADMIN_MAIL
      
      if (!validAdminEmail || adminEmail !== validAdminEmail) {
        return NextResponse.json({ error: '管理者権限が無効です' }, { status: 403 })
      }
    } else {
      // 通常のSupabase認証
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !user) {
        return NextResponse.json({ error: '認証が無効です' }, { status: 401 })
      }

      // ユーザープロファイル取得
      const userProfile = await DatabaseService.getUserProfile(user.id)
      
      if (!userProfile || userProfile.role !== 'admin') {
        return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
      }
    }

    // ダッシュボードデータを取得
    const stats = await DatabaseService.getDashboardStats()
    const recentActivity = await DatabaseService.getRecentActivity(undefined, 15)
    const upcomingDeadlines = await DatabaseService.getUpcomingDeadlines(30)
    
    // 申請一覧（最新20件）
    const applications = await DatabaseService.getAllSubsidyApplicationsForAdmin()
    const recentApplications = applications.slice(0, 20)

    // 統計データの整理
    const dashboardData = {
      applications: applications, // 全申請データを追加
      stats: {
        totalApplications: stats.total,
        statusBreakdown: {
          draft: stats.draft,
          inProgress: stats.in_progress,
          review: stats.review,
          completed: stats.completed,
          rejected: stats.rejected
        }
      },
      recentApplications,
      recentActivity,
      upcomingDeadlines: upcomingDeadlines.slice(0, 10), // 直近10件
      alerts: {
        urgentDeadlines: upcomingDeadlines.filter(deadline => {
          const deadlineDate = new Date(deadline.deadline_date)
          const now = new Date()
          const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          return diffDays <= 7
        }).length,
        pendingReviews: stats.review,
        failedUploads: 0 // 後で実装
      }
    }

    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error('管理者ダッシュボードエラー:', error)
    return NextResponse.json(
      { error: 'ダッシュボードデータの取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}