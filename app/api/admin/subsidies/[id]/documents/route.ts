import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // 特定の助成金タイプの必要書類を取得
    const { data, error } = await supabaseAdmin
      .from('subsidy_required_documents')
      .select('*')
      .eq('subsidy_type_id', id)
      .order('sort_order')

    if (error) {
      console.error('Error fetching required documents:', error)
      return NextResponse.json({ error: 'Failed to fetch required documents' }, { status: 500 })
    }

    return NextResponse.json({ documents: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    
    // テキストとしてリクエストボディを取得して日本語文字を適切に処理
    const bodyText = await request.text()
    const body = JSON.parse(bodyText)
    
    const { 
      document_key, 
      document_name, 
      description, 
      checkpoints,
      is_required = true, 
      sort_order = 0, 
      file_types = 'pdf,doc,docx',
      max_file_size = 10485760 
    } = body

    if (!document_key || !document_name) {
      return NextResponse.json({ error: 'Document key and name are required' }, { status: 400 })
    }

    // 新しい必要書類を追加
    const { data, error } = await supabaseAdmin
      .from('subsidy_required_documents')
      .insert({
        subsidy_type_id: id,
        document_key: document_key.trim(),
        document_name: document_name.trim(),
        description: description ? description.trim() : null,
        checkpoints: checkpoints ? checkpoints.trim() : null,
        is_required: Boolean(is_required),
        sort_order: parseInt(sort_order) || 0,
        file_types: file_types.trim(),
        max_file_size: parseInt(max_file_size) || 10485760
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating required document:', error)
      return NextResponse.json({ error: 'Failed to create required document' }, { status: 500 })
    }

    // レスポンスも適切にエンコーディング処理
    return new NextResponse(JSON.stringify({ document: data }), {
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