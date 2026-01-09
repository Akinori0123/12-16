#!/usr/bin/env node

/**
 * 本番環境の申請データを削除するスクリプト
 * 
 * 使用方法:
 * 1. Vercelプロジェクトからこのスクリプトを実行
 * 2. または、ローカルで環境変数を設定して実行
 */

const { createClient } = require('@supabase/supabase-js')

// 環境変数の確認
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 必要な環境変数が設定されていません:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Supabase クライアント（Service Role Key使用）
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function clearAllApplicationData() {
  try {
    console.log('🧹 申請データの削除を開始します...')
    
    // 1. applications テーブルの全データを取得して確認
    const { data: applications, error: fetchError } = await supabase
      .from('applications')
      .select('id, company_name, created_at')
    
    if (fetchError) {
      throw new Error(`データ取得エラー: ${fetchError.message}`)
    }
    
    console.log(`📊 削除対象の申請数: ${applications?.length || 0}件`)
    
    if (!applications || applications.length === 0) {
      console.log('✅ 削除対象のデータがありません。')
      return
    }
    
    // 削除予定のデータを表示
    console.log('\n削除予定のデータ:')
    applications.forEach((app, index) => {
      console.log(`  ${index + 1}. ${app.company_name} (ID: ${app.id}) - 作成日: ${app.created_at}`)
    })
    
    // 関連データも削除する
    let deletedDocuments = 0
    let deletedCompanies = 0
    let deletedUserProfiles = 0
    
    console.log('\n🗑️  関連データの削除を開始...')
    
    // 各申請に関連するドキュメントを削除
    for (const app of applications) {
      const { count: docCount, error: docError } = await supabase
        .from('documents')
        .delete()
        .eq('application_id', app.id)
        .select('*', { count: 'exact' })
      
      if (docError) {
        console.warn(`⚠️  申請 ${app.id} のドキュメント削除でエラー: ${docError.message}`)
      } else {
        deletedDocuments += docCount || 0
      }
    }
    
    // 申請データを削除
    console.log('🗑️  申請データの削除中...')
    const { count: appCount, error: deleteError } = await supabase
      .from('applications')
      .delete()
      .neq('id', 'dummy') // 全て削除
      .select('*', { count: 'exact' })
    
    if (deleteError) {
      throw new Error(`申請データ削除エラー: ${deleteError.message}`)
    }
    
    // 孤立したcompaniesとuser_profilesも削除（オプション）
    const { count: companiesCount } = await supabase
      .from('companies')
      .delete()
      .not('id', 'in', '(SELECT DISTINCT company_id FROM applications WHERE company_id IS NOT NULL)')
      .select('*', { count: 'exact' })
    
    const { count: userProfilesCount } = await supabase
      .from('user_profiles')
      .delete()
      .not('id', 'in', '(SELECT DISTINCT user_id FROM applications WHERE user_id IS NOT NULL)')
      .eq('role', 'client') // 管理者は削除しない
      .select('*', { count: 'exact' })
    
    deletedCompanies = companiesCount || 0
    deletedUserProfiles = userProfilesCount || 0
    
    console.log('\n✅ データ削除が完了しました:')
    console.log(`  - 削除された申請: ${appCount || 0}件`)
    console.log(`  - 削除されたドキュメント: ${deletedDocuments}件`)
    console.log(`  - 削除された会社情報: ${deletedCompanies}件`)
    console.log(`  - 削除されたユーザープロファイル: ${deletedUserProfiles}件`)
    
    // 確認用に再度データを取得
    const { data: remainingApps } = await supabase
      .from('applications')
      .select('id')
    
    console.log(`\n📊 残存申請数: ${remainingApps?.length || 0}件`)
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message)
    process.exit(1)
  }
}

// スクリプトの実行
clearAllApplicationData()
  .then(() => {
    console.log('\n🎉 スクリプトが正常に完了しました。')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 スクリプトの実行中にエラーが発生しました:', error)
    process.exit(1)
  })