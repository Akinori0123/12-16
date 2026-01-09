import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

export const dynamic = 'force-dynamic'

/**
 * Vercelのキャッシュを強制的にクリアするAPIエンドポイント
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

    console.log('🧹 Vercelキャッシュのクリアを開始...')

    // Next.js App Routerのキャッシュをクリア
    try {
      revalidatePath('/admin/dashboard', 'page')
      revalidatePath('/admin/dashboard', 'layout')
      revalidatePath('/admin', 'layout')
      revalidatePath('/', 'layout')
      console.log('✅ revalidatePath完了')
    } catch (e) {
      console.warn('⚠️ revalidatePathエラー:', e)
    }

    // データフェッチのキャッシュをクリア
    try {
      revalidateTag('admin-dashboard')
      revalidateTag('applications')
      revalidateTag('admin-data')
      console.log('✅ revalidateTag完了')
    } catch (e) {
      console.warn('⚠️ revalidateTagエラー:', e)
    }

    // Vercel Edge NetworkのキャッシュをHTTPヘッダーでクリア
    const response = NextResponse.json({
      message: 'キャッシュクリアが完了しました',
      timestamp: new Date().toISOString(),
      clearedPaths: ['/admin/dashboard'],
      clearedTags: ['admin-dashboard', 'applications', 'admin-data']
    })

    // VercelのEdge Cacheを強制的に無効化
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0, s-maxage=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Surrogate-Control', 'no-store')
    response.headers.set('CDN-Cache-Control', 'no-store')
    response.headers.set('Vercel-Cache-Control', 'no-store')
    response.headers.set('X-Vercel-Cache', 'BYPASS')
    response.headers.set('Vary', '*')
    
    return response

  } catch (error) {
    console.error('❌ キャッシュクリアエラー:', error)
    return NextResponse.json(
      { error: `キャッシュクリア中にエラーが発生しました: ${error}` },
      { status: 500 }
    )
  }
}