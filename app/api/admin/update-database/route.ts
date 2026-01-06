import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('Checking current documents table structure...')
    
    // documentsテーブルから1件取得してカラム構造を確認
    const { data: sampleDoc, error: tableError } = await supabase
      .from('documents')
      .select('*')
      .limit(1)
    
    if (tableError) {
      console.error('Table info error:', tableError)
      return NextResponse.json({ error: 'Failed to get table info', details: tableError }, { status: 500 })
    }
    
    const existingColumns = sampleDoc && sampleDoc.length > 0 ? Object.keys(sampleDoc[0]) : []
    console.log('Current table columns:', existingColumns)
    
    // カラムが存在するかチェック
    const hasAIColumns = existingColumns.includes('ai_check_result')
    
    if (hasAIColumns) {
      return NextResponse.json({ 
        success: true, 
        message: 'AI check columns already exist',
        columns: existingColumns 
      })
    }
    
    console.log('AI check columns missing, need manual database update')
    return NextResponse.json({ 
      error: 'AI check columns missing from documents table',
      message: 'Please run the add-ai-check-columns.sql file manually in Supabase dashboard',
      existingColumns 
    }, { status: 400 })
    
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}