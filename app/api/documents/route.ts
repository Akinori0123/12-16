import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
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

    const documentData = await request.json()

    // アプリケーションのアクセス権限チェック
    const application = await DatabaseService.getApplication(documentData.application_id)
    
    if (!application) {
      return NextResponse.json({ error: '申請が見つかりません' }, { status: 404 })
    }

    const userProfile = await DatabaseService.getUserProfile(user.id)
    
    if (!userProfile) {
      return NextResponse.json({ error: 'ユーザープロファイルが見つかりません' }, { status: 404 })
    }

    // アクセス権限チェック
    if (userProfile.role !== 'admin' && 
        application.user_id !== user.id && 
        userProfile.company_id !== application.company_id) {
      return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
    }

    // ドキュメントを作成
    const newDocument = await DatabaseService.createDocument({
      ...documentData,
      upload_status: 'completed'
    })

    return NextResponse.json({ document: newDocument })

  } catch (error) {
    console.error('ドキュメント作成エラー:', error)
    return NextResponse.json(
      { error: 'ドキュメントの作成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get('application_id')

    if (!applicationId) {
      return NextResponse.json({ error: 'application_idが必要です' }, { status: 400 })
    }

    // アプリケーションのアクセス権限チェック
    const application = await DatabaseService.getApplication(applicationId)
    
    if (!application) {
      return NextResponse.json({ error: '申請が見つかりません' }, { status: 404 })
    }

    const userProfile = await DatabaseService.getUserProfile(user.id)
    
    if (!userProfile) {
      return NextResponse.json({ error: 'ユーザープロファイルが見つかりません' }, { status: 404 })
    }

    // アクセス権限チェック
    if (userProfile.role !== 'admin' && 
        application.user_id !== user.id && 
        userProfile.company_id !== application.company_id) {
      return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
    }

    // ドキュメントを取得
    const documents = await DatabaseService.getDocumentsByApplication(applicationId)

    return NextResponse.json({ documents })

  } catch (error) {
    console.error('ドキュメント取得エラー:', error)
    return NextResponse.json(
      { error: 'ドキュメントの取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}