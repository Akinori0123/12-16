import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(request: NextRequest, { params }: { params: { id: string, documentId: string } }) {
  try {
    const { documentId } = params
    
    // テキストとしてリクエストボディを取得して日本語文字を適切に処理
    const bodyText = await request.text()
    const body = JSON.parse(bodyText)
    
    const { 
      document_name, 
      description, 
      checkpoints,
      is_required, 
      sort_order, 
      file_types,
      max_file_size
    } = body

    // 必要書類を更新
    const { data, error } = await supabaseAdmin
      .from('subsidy_required_documents')
      .update({
        document_name: document_name ? document_name.trim() : document_name,
        description: description ? description.trim() : null,
        checkpoints: checkpoints ? checkpoints.trim() : null,
        is_required: Boolean(is_required),
        sort_order: parseInt(sort_order) || 0,
        file_types: file_types ? file_types.trim() : file_types,
        max_file_size: parseInt(max_file_size) || 10485760,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single()

    if (error) {
      console.error('Error updating required document:', error)
      return NextResponse.json({ error: 'Failed to update required document' }, { status: 500 })
    }

    // UTF-8エンコーディングを明示的に設定してレスポンス
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string, documentId: string } }) {
  try {
    const { documentId } = params

    // 必要書類を削除
    const { error } = await supabaseAdmin
      .from('subsidy_required_documents')
      .delete()
      .eq('id', documentId)

    if (error) {
      console.error('Error deleting required document:', error)
      return NextResponse.json({ error: 'Failed to delete required document' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}