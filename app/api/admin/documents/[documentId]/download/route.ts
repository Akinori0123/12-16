import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest, { params }: { params: { documentId: string } }) {
  try {
    const { documentId } = params
    
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
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    console.log('管理者によるファイルダウンロード要求:', { documentId })

    // ドキュメント情報を取得
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      console.error('ドキュメント情報取得エラー:', docError)
      return NextResponse.json({ error: 'ドキュメントが見つかりません' }, { status: 404 })
    }

    console.log('ドキュメント情報取得成功:', {
      documentId: document.id,
      fileName: document.file_name,
      filePath: document.file_path,
      mimeType: document.mime_type
    })

    // Supabase Storageからファイルをダウンロード
    const { data: fileData, error: storageError } = await supabaseAdmin.storage
      .from('documents')
      .download(document.file_path)

    if (storageError || !fileData) {
      console.error('ストレージからのファイル取得エラー:', storageError)
      return NextResponse.json({ error: 'ファイルの取得に失敗しました' }, { status: 500 })
    }

    console.log('ファイル取得成功:', {
      fileSize: fileData.size,
      fileType: fileData.type
    })

    // URLパラメータでプレビュー/ダウンロードを判定
    const url = new URL(request.url)
    const mode = url.searchParams.get('mode') // 'preview' または 'download'

    if (mode === 'base64') {
      // Base64形式で返す（プレビュー用）
      const arrayBuffer = await fileData.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      
      return new NextResponse(JSON.stringify({
        success: true,
        base64Content: base64,
        fileName: document.file_name,
        mimeType: document.mime_type,
        fileSize: fileData.size
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      })
    } else {
      // ファイルとして返す（ダウンロード用）
      const arrayBuffer = await fileData.arrayBuffer()
      
      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': document.mime_type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(document.file_name)}"`,
          'Content-Length': fileData.size.toString(),
        },
      })
    }

  } catch (error) {
    console.error('管理者ファイルダウンロード処理エラー:', error)
    return NextResponse.json({ 
      error: 'ファイルのダウンロード中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}