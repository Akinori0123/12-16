import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    
    // テキストとしてリクエストボディを取得して日本語文字を適切に処理
    const bodyText = await request.text()
    const body = JSON.parse(bodyText)
    
    const { application_deadline } = body

    console.log('申請期限更新要求:', {
      applicationId: id,
      deadline: application_deadline
    })

    // 申請の期限を更新
    const { data, error } = await supabaseAdmin
      .from('applications')
      .update({
        application_deadline: application_deadline,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating application deadline:', error)
      return NextResponse.json({ error: 'Failed to update application deadline' }, { status: 500 })
    }

    console.log('申請期限更新成功:', data)

    // UTF-8エンコーディングを明示的に設定してレスポンス
    return new NextResponse(JSON.stringify({ application: data }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}