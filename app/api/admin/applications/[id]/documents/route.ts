import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: applicationId } = params
    
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
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    console.log('管理者による書類取得:', { applicationId })

    // 管理者権限でRLSをバイパスして書類を取得
    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })

    console.log('管理者書類取得結果:', { 
      documentsCount: documents?.length || 0,
      error: error?.message,
      applicationId 
    })

    if (error) {
      console.error('管理者書類取得エラー:', error)
      return NextResponse.json({ error: '書類の取得に失敗しました' }, { status: 500 })
    }

    return new NextResponse(JSON.stringify({ 
      documents: documents || [],
      count: documents?.length || 0
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    })

  } catch (error) {
    console.error('管理者書類取得処理エラー:', error)
    return NextResponse.json({ 
      error: '書類の取得中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}