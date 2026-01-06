import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { supabase } from '@/lib/supabase'

interface Context {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: Context) {
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

    // 申請詳細を取得
    const application = await DatabaseService.getSubsidyApplication(params.id)
    
    if (!application) {
      return NextResponse.json({ error: '申請が見つかりません' }, { status: 404 })
    }

    // UTF-8エンコーディングを明示的に設定してレスポンス
    return new NextResponse(JSON.stringify({ application }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    })

  } catch (error) {
    console.error('管理者申請取得エラー:', error)
    return NextResponse.json(
      { error: '申請の取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: Context) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    let adminUserId = 'admin'
    
    // 管理者用の特別認証
    if (token.startsWith('admin-')) {
      const adminEmail = token.replace('admin-', '')
      
      // 環境変数から管理者認証情報を取得
      const validAdminEmail = process.env.ADMIN_MAIL
      
      if (!validAdminEmail || adminEmail !== validAdminEmail) {
        return NextResponse.json({ error: '管理者権限が無効です' }, { status: 403 })
      }
      
      adminUserId = adminEmail
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
      
      adminUserId = user.id
    }

    // テキストとしてリクエストボディを取得して日本語文字を適切に処理
    const bodyText = await request.text()
    const updateData = JSON.parse(bodyText)

    // 申請を取得
    const application = await DatabaseService.getSubsidyApplication(params.id)
    
    if (!application) {
      return NextResponse.json({ error: '申請が見つかりません' }, { status: 404 })
    }

    // 管理者アクションのログ（エラーを避けるためにスキップまたは適切なUUIDを使用）
    try {
      // 管理者用の特別処理の場合、ログは記録しない
      if (!token.startsWith('admin-')) {
        await DatabaseService.logAdminAction({
          admin_user_id: adminUserId,
          application_id: params.id,
          action_type: 'update_application',
          description: `申請を更新しました（ステータス: ${updateData.status || '変更なし'}）`,
          metadata: { updateData }
        })
      }
    } catch (logError) {
      console.warn('管理者アクションのログ記録に失敗:', logError)
      // ログエラーは無視して処理を続行
    }

    // 申請を更新
    const updatedApplication = await DatabaseService.updateApplication(params.id, updateData)

    // UTF-8エンコーディングを明示的に設定してレスポンス
    return new NextResponse(JSON.stringify({ application: updatedApplication }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    })

  } catch (error) {
    console.error('管理者申請更新エラー:', error)
    return NextResponse.json(
      { error: '申請の更新中にエラーが発生しました' },
      { status: 500 }
    )
  }
}