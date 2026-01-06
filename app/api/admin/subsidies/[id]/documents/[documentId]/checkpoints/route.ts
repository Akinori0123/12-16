import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest, { params }: { params: { id: string, documentId: string } }) {
  try {
    const { documentId } = params

    // 特定書類の確認点を取得
    const { data, error } = await supabaseAdmin
      .from('document_checkpoints')
      .select('*')
      .eq('required_document_id', documentId)
      .order('check_order')

    if (error) {
      console.error('Error fetching document checkpoints:', error)
      return NextResponse.json({ error: 'Failed to fetch document checkpoints' }, { status: 500 })
    }

    return new NextResponse(JSON.stringify({ checkpoints: data }), {
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

export async function POST(request: NextRequest, { params }: { params: { id: string, documentId: string } }) {
  try {
    const { documentId } = params
    
    const bodyText = await request.text()
    const body = JSON.parse(bodyText)
    
    const { 
      checkpoint_key, 
      checkpoint_title, 
      checkpoint_description, 
      ai_prompt,
      is_required = true, 
      check_order = 0, 
      expected_result_type = 'boolean',
      validation_criteria = {}
    } = body

    if (!checkpoint_key || !checkpoint_title) {
      return NextResponse.json({ error: 'Checkpoint key and title are required' }, { status: 400 })
    }

    // 新しい確認点を追加
    const { data, error } = await supabaseAdmin
      .from('document_checkpoints')
      .insert({
        required_document_id: documentId,
        checkpoint_key: checkpoint_key.trim(),
        checkpoint_title: checkpoint_title.trim(),
        checkpoint_description: checkpoint_description ? checkpoint_description.trim() : null,
        ai_prompt: ai_prompt ? ai_prompt.trim() : null,
        is_required: Boolean(is_required),
        check_order: parseInt(check_order) || 0,
        expected_result_type: expected_result_type.trim(),
        validation_criteria: validation_criteria
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating document checkpoint:', error)
      return NextResponse.json({ error: 'Failed to create document checkpoint' }, { status: 500 })
    }

    return new NextResponse(JSON.stringify({ checkpoint: data }), {
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