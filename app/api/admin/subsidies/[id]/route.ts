import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // 特定の助成金タイプと必要書類を取得
    const { data, error } = await supabaseAdmin
      .from('subsidy_types')
      .select(`
        *,
        subsidy_required_documents(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching subsidy type:', error)
      return NextResponse.json({ error: 'Failed to fetch subsidy type' }, { status: 500 })
    }

    return NextResponse.json({ subsidy: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const { name, description, is_active } = body

    // 助成金タイプを更新
    const { data, error } = await supabaseAdmin
      .from('subsidy_types')
      .update({
        name,
        description: description || null,
        is_active: is_active ?? true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating subsidy type:', error)
      return NextResponse.json({ error: 'Failed to update subsidy type' }, { status: 500 })
    }

    return NextResponse.json({ subsidy: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // 助成金タイプを削除（カスケード削除で必要書類も削除される）
    const { error } = await supabaseAdmin
      .from('subsidy_types')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting subsidy type:', error)
      return NextResponse.json({ error: 'Failed to delete subsidy type' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}