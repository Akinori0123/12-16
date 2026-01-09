import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * デバッグ用：環境変数とDB接続状況を確認するAPI
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer admin-')) {
      return NextResponse.json({ error: '管理者認証が必要です' }, { status: 401 })
    }

    console.log('🔍 環境変数とDB接続状況をデバッグ中...')

    // 環境変数の状態
    const envInfo = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT_SET',
      supabaseUrlValue: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + '...',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET',
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT_SET',
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV || 'not_vercel'
    }

    // データベース接続テスト
    let dbConnectionTest = {}
    try {
      const { data: testData, error: testError } = await supabaseAdmin
        .from('applications')
        .select('id, company_name, created_at')
        .limit(10)

      dbConnectionTest = {
        success: !testError,
        error: testError?.message || null,
        dataCount: testData?.length || 0,
        firstRecord: testData?.[0] || null
      }
    } catch (error) {
      dbConnectionTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        dataCount: 0
      }
    }

    // テーブル一覧取得
    let tablesList = []
    try {
      const { data: tables } = await supabaseAdmin
        .rpc('get_table_names') // この関数が存在しない場合はエラーになる
      tablesList = tables || []
    } catch (error) {
      // 代替手段：直接SQLクエリ
      try {
        const { data: tableData } = await supabaseAdmin
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
        tablesList = tableData?.map(t => t.table_name) || []
      } catch (e) {
        tablesList = ['table_check_failed']
      }
    }

    const response = NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: envInfo,
      databaseConnection: dbConnectionTest,
      availableTables: tablesList,
      message: '環境とDB接続状況のデバッグ情報'
    })

    // キャッシュを無効化
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response

  } catch (error) {
    console.error('❌ デバッグAPIエラー:', error)
    return NextResponse.json(
      { 
        error: `デバッグ情報取得中にエラーが発生しました: ${error}`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}