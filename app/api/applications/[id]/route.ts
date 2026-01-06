import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { supabase, supabaseAdmin } from '@/lib/supabase'

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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: '認証が無効です' }, { status: 401 })
    }

    // 申請詳細を取得
    const application = await DatabaseService.getSubsidyApplication(params.id)
    
    if (!application) {
      return NextResponse.json({ error: '申請が見つかりません' }, { status: 404 })
    }

    // アクセス権限チェック
    const userProfile = await DatabaseService.getUserProfile(user.id)
    
    if (!userProfile) {
      return NextResponse.json({ error: 'ユーザープロファイルが見つかりません' }, { status: 404 })
    }

    // 管理者またはオーナーのみアクセス可能
    if (userProfile.role !== 'admin' && 
        application.user_id !== user.id && 
        userProfile.company_id !== application.company_id) {
      return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
    }

    return NextResponse.json({ application })

  } catch (error) {
    console.error('申請取得エラー:', error)
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: '認証が無効です' }, { status: 401 })
    }

    const updateData = await request.json()

    // 申請を取得
    const application = await DatabaseService.getSubsidyApplication(params.id)
    
    if (!application) {
      return NextResponse.json({ error: '申請が見つかりません' }, { status: 404 })
    }

    // アクセス権限チェック
    const userProfile = await DatabaseService.getUserProfile(user.id)
    
    if (!userProfile) {
      return NextResponse.json({ error: 'ユーザープロファイルが見つかりません' }, { status: 404 })
    }

    // 管理者またはオーナーのみ更新可能
    if (userProfile.role !== 'admin' && 
        application.user_id !== user.id && 
        userProfile.company_id !== application.company_id) {
      return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
    }

    // 管理者アクションのログ
    if (userProfile.role === 'admin') {
      await DatabaseService.logAdminAction({
        admin_user_id: user.id,
        application_id: params.id,
        action_type: 'update_application',
        description: `申請を更新しました`,
        metadata: { updateData }
      })
    }

    // 申請を更新
    const updatedApplication = await DatabaseService.updateApplication(params.id, updateData)

    return NextResponse.json({ application: updatedApplication })

  } catch (error) {
    console.error('申請更新エラー:', error)
    return NextResponse.json(
      { error: '申請の更新中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: '認証が無効です' }, { status: 401 })
    }

    // 申請を取得
    const application = await DatabaseService.getSubsidyApplication(params.id)
    
    if (!application) {
      return NextResponse.json({ error: '申請が見つかりません' }, { status: 404 })
    }

    // アクセス権限チェック
    const userProfile = await DatabaseService.getUserProfile(user.id)
    
    if (!userProfile) {
      return NextResponse.json({ error: 'ユーザープロファイルが見つかりません' }, { status: 404 })
    }

    // 管理者またはオーナーのみ削除可能
    if (userProfile.role !== 'admin' && 
        application.user_id !== user.id && 
        userProfile.company_id !== application.company_id) {
      return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
    }

    // 管理者アクションのログ
    if (userProfile.role === 'admin') {
      await DatabaseService.logAdminAction({
        admin_user_id: user.id,
        application_id: params.id,
        action_type: 'delete_application',
        description: `申請を削除しました`
      })
    }

    // 申請を削除（カスケード削除でドキュメントや期限も削除される）
    const { error } = await supabaseAdmin
      .from('applications')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Delete operation error:', error)
      throw error
    }
    
    console.log('Application deleted successfully:', params.id)

    return NextResponse.json({ message: '申請が正常に削除されました' })

  } catch (error) {
    console.error('申請削除エラー:', error)
    return NextResponse.json(
      { error: '申請の削除中にエラーが発生しました' },
      { status: 500 }
    )
  }
}