import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // 助成金タイプと必要書類を取得
    const { data, error } = await supabaseAdmin
      .from('subsidy_types')
      .select(`
        *,
        subsidy_required_documents(*)
      `)
      .eq('is_active', true)
      .order('code')

    if (error) {
      console.error('Error fetching subsidy types:', error)
      return NextResponse.json({ error: 'Failed to fetch subsidy types' }, { status: 500 })
    }

    // UTF-8エンコーディングを明示的に設定してレスポンス
    return new NextResponse(JSON.stringify({ subsidies: data }), {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, name, description } = body

    if (!code || !name) {
      return NextResponse.json({ error: 'Code and name are required' }, { status: 400 })
    }

    // 新しい助成金タイプを作成
    const { data, error } = await supabaseAdmin
      .from('subsidy_types')
      .insert({
        code,
        name,
        description: description || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating subsidy type:', error)
      return NextResponse.json({ error: 'Failed to create subsidy type' }, { status: 500 })
    }

    return NextResponse.json({ subsidy: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}