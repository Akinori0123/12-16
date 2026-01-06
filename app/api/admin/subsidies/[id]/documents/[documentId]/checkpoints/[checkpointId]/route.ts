import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(request: NextRequest, { params }: { params: { id: string, documentId: string, checkpointId: string } }) {
  try {
    const { checkpointId } = params
    
    const bodyText = await request.text()
    const body = JSON.parse(bodyText)
    
    const { 
      checkpoint_title, 
      checkpoint_description, 
      ai_prompt,
      is_required, 
      check_order, 
      expected_result_type,
      validation_criteria
    } = body

    // 確認点を更新
    const { data, error } = await supabaseAdmin
      .from('document_checkpoints')
      .update({
        checkpoint_title: checkpoint_title ? checkpoint_title.trim() : checkpoint_title,
        checkpoint_description: checkpoint_description ? checkpoint_description.trim() : null,
        ai_prompt: ai_prompt ? ai_prompt.trim() : null,
        is_required: Boolean(is_required),
        check_order: parseInt(check_order) || 0,
        expected_result_type: expected_result_type ? expected_result_type.trim() : expected_result_type,
        validation_criteria: validation_criteria || {},
        updated_at: new Date().toISOString()
      })
      .eq('id', checkpointId)
      .select()
      .single()

    if (error) {
      console.error('Error updating document checkpoint:', error)
      return NextResponse.json({ error: 'Failed to update document checkpoint' }, { status: 500 })
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string, documentId: string, checkpointId: string } }) {
  try {
    const { checkpointId } = params

    // 確認点を削除
    const { error } = await supabaseAdmin
      .from('document_checkpoints')
      .delete()
      .eq('id', checkpointId)

    if (error) {
      console.error('Error deleting document checkpoint:', error)
      return NextResponse.json({ error: 'Failed to delete document checkpoint' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}