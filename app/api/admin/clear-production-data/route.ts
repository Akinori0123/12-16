import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * 本番環境の申請データを削除するAPIエンドポイント
 * 
 * 使用方法:
 * POST https://your-vercel-domain.vercel.app/api/admin/clear-production-data
 * 
 * セキュリティ: 管理者認証が必要
 */
export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: '管理者認証が必要です' }, { status: 403 })
    }

    console.log('🧹 申請データの削除を開始します...')
    
    // 1. applications テーブルの全データを取得して確認
    const { data: applications, error: fetchError } = await supabaseAdmin
      .from('applications')
      .select('id, company_name, created_at')
    
    if (fetchError) {
      throw new Error(`データ取得エラー: ${fetchError.message}`)
    }
    
    const applicationCount = applications?.length || 0
    console.log(`📊 削除対象の申請数: ${applicationCount}件`)
    
    if (applicationCount === 0) {
      return NextResponse.json({ 
        message: '削除対象のデータがありません',
        deletedApplications: 0,
        deletedDocuments: 0,
        deletedCompanies: 0,
        deletedUserProfiles: 0
      })
    }
    
    // 関連データも削除する
    let deletedDocuments = 0
    let deletedCompanies = 0
    let deletedUserProfiles = 0
    
    console.log('🗑️ 関連データの削除を開始...')
    
    // 各申請に関連するドキュメントを削除
    for (const app of applications) {
      const { count: docCount, error: docError } = await supabaseAdmin
        .from('documents')
        .delete()
        .eq('application_id', app.id)
        .select('*', { count: 'exact' })
      
      if (docError) {
        console.warn(`⚠️ 申請 ${app.id} のドキュメント削除でエラー: ${docError.message}`)
      } else {
        deletedDocuments += docCount || 0
      }
    }
    
    // 申請データを削除
    console.log('🗑️ 申請データの削除中...')
    const { count: appCount, error: deleteError } = await supabaseAdmin
      .from('applications')
      .delete()
      .neq('id', 'dummy') // 全て削除
      .select('*', { count: 'exact' })
    
    if (deleteError) {
      throw new Error(`申請データ削除エラー: ${deleteError.message}`)
    }
    
    // 孤立したcompaniesとuser_profilesも削除（オプション）
    const { count: companiesCount } = await supabaseAdmin
      .from('companies')
      .delete()
      .not('id', 'in', '(SELECT DISTINCT company_id FROM applications WHERE company_id IS NOT NULL)')
      .select('*', { count: 'exact' })
    
    const { count: userProfilesCount } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .not('id', 'in', '(SELECT DISTINCT user_id FROM applications WHERE user_id IS NOT NULL)')
      .eq('role', 'client') // 管理者は削除しない
      .select('*', { count: 'exact' })
    
    deletedCompanies = companiesCount || 0
    deletedUserProfiles = userProfilesCount || 0
    
    console.log('✅ データ削除が完了しました:')
    console.log(`  - 削除された申請: ${appCount || 0}件`)
    console.log(`  - 削除されたドキュメント: ${deletedDocuments}件`)
    console.log(`  - 削除された会社情報: ${deletedCompanies}件`)
    console.log(`  - 削除されたユーザープロファイル: ${deletedUserProfiles}件`)
    
    // 確認用に再度データを取得
    const { data: remainingApps } = await supabaseAdmin
      .from('applications')
      .select('id')
    
    console.log(`📊 残存申請数: ${remainingApps?.length || 0}件`)
    
    return NextResponse.json({
      message: 'データ削除が正常に完了しました',
      deletedApplications: appCount || 0,
      deletedDocuments,
      deletedCompanies,
      deletedUserProfiles,
      remainingApplications: remainingApps?.length || 0
    })

  } catch (error) {
    console.error('❌ データ削除エラー:', error)
    return NextResponse.json(
      { error: `データ削除中にエラーが発生しました: ${error}` },
      { status: 500 }
    )
  }
}