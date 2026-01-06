import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest, { params }: { params: { documentId: string } }) {
  try {
    const { documentId } = params
    console.log('AI Check API called with documentId:', documentId)
    
    // Gemini APIキーを確認
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured')
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
    }

    // ユーザー認証チェック
    const authHeader = request.headers.get('Authorization')
    console.log('Auth header:', authHeader ? 'Present' : 'Missing')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header')
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Authentication error:', authError, 'User:', user)
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    console.log('User authenticated:', user.id)
    
    // Service roleクライアントを作成
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // まずドキュメント情報を取得（service roleクライアントを使用）
    console.log('Fetching document with ID:', documentId)
    const { data: document, error: docError } = await adminClient
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    console.log('Document fetch result:', { document: document?.id, error: docError })

    if (docError || !document) {
      console.error('Document fetch error:', docError)
      return NextResponse.json({ 
        error: 'Document not found',
        searchedId: documentId,
        details: docError
      }, { status: 404 })
    }

    // 次にアプリケーション情報を取得してユーザー権限をチェック
    const { data: application, error: appError } = await adminClient
      .from('applications')
      .select('user_id, subsidy_type')
      .eq('id', document.application_id)
      .single()

    if (appError || !application || application.user_id !== user.id) {
      console.error('Application fetch error or access denied:', appError, 'user_id:', application?.user_id, 'expected:', user.id)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // 該当書類の確認事項を取得をスキップして一時的な設定を使用
    const subsidyDocument = {
      document_name: document.document_type,
      description: '書類の確認',
      checkpoints: 'アップロードされた書類を確認し、助成金の要件に適合するかどうかを分析してください。'
    }

    // ファイルサイズチェック（20MBを上限とする）
    const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
    if (document.file_size && document.file_size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'ファイルサイズが大きすぎます', 
        details: `ファイルサイズ: ${Math.round(document.file_size / 1024 / 1024)}MB (上限: 20MB)`
      }, { status: 400 })
    }

    console.log('Downloading file:', document.file_path, 'Size:', document.file_size)

    // Supabase Storageからファイルを取得（adminClientは既に作成済み）
    const { data: fileData, error: storageError } = await adminClient.storage
      .from('documents')
      .download(document.file_path)

    if (storageError || !fileData) {
      console.error('Storage error:', storageError)
      return NextResponse.json({ error: 'Failed to retrieve file', details: storageError }, { status: 500 })
    }

    console.log('File downloaded successfully, size:', fileData.size, 'type:', fileData.type)

    // ファイルをBase64に変換
    let base64String: string
    try {
      console.log('Starting Base64 conversion...')
      const arrayBuffer = await fileData.arrayBuffer()
      console.log('ArrayBuffer size:', arrayBuffer.byteLength)
      
      // ArrayBufferを直接Base64に変換する安全な方法
      const uint8Array = new Uint8Array(arrayBuffer)
      
      if (uint8Array.length > 15 * 1024 * 1024) { // 15MB以上
        console.log('File too large for AI analysis:', uint8Array.length)
        return NextResponse.json({ 
          error: 'ファイルサイズが大きすぎます', 
          details: `ファイルサイズが${Math.round(uint8Array.length / 1024 / 1024)}MBです。15MB以下のファイルをアップロードしてください。`
        }, { status: 400 })
      }

      // より効率的なBase64変換
      console.log('Converting to Base64...')
      let binary = ''
      const chunkSize = 8192 // 8KB chunks
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize)
        try {
          binary += String.fromCharCode.apply(null, Array.from(chunk))
        } catch (chunkError) {
          console.error('Chunk conversion error at position:', i, chunkError)
          throw chunkError
        }
      }
      console.log('Binary string length:', binary.length)
      base64String = btoa(binary)
      
      console.log('Base64 conversion successful, length:', base64String.length)
    } catch (conversionError) {
      console.error('Base64 conversion error:', conversionError)
      return NextResponse.json({ 
        error: 'ファイル変換エラー', 
        details: `変換エラー: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`
      }, { status: 500 })
    }

    // Gemini AIを初期化
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.1,
      }
    })

    // AIプロンプトを作成
    const prompt = `
あなたは助成金申請書類の専門チェッカーです。アップロードされた書類画像を分析し、以下の確認事項に沿ってチェックしてください。

【書類情報】
書類名: ${subsidyDocument.document_name}
書類説明: ${subsidyDocument.description || '説明なし'}

【確認事項】
${subsidyDocument.checkpoints || 'チェックポイントが設定されていません'}

【チェック指示】
1. 画像から文字を読み取り、内容を理解してください
2. 上記の確認事項に沿って書類をチェックしてください
3. 問題点があれば具体的に指摘してください
4. 改善提案があれば具体的に提示してください
5. 全体的な評価（1-100点）を付けてください

【出力形式】
以下のJSONフォーマットで回答してください：
{
  "score": 85,
  "summary": "全体的な評価コメント",
  "issues": [
    {
      "severity": "high",
      "title": "問題のタイトル",
      "description": "詳細な説明",
      "location": "書類の該当箇所"
    }
  ],
  "suggestions": [
    {
      "title": "改善提案のタイトル",
      "description": "具体的な改善方法"
    }
  ],
  "extracted_text": "書類から読み取った主要なテキスト（抜粋）"
}

必ず有効なJSONフォーマットで回答し、日本語で記述してください。
`

    // MimeTypeを正確に設定
    const mimeType = document.mime_type || 'application/pdf'
    console.log('File mime type:', mimeType, 'File name:', document.file_name)
    
    // Gemini APIを呼び出し（画像付き）
    console.log('Calling Gemini API...')
    let result, response, text
    try {
      result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64String,
            mimeType: mimeType
          }
        }
      ])

      response = await result.response
      text = response.text()
      console.log('Gemini API response received, length:', text.length)
    } catch (apiError) {
      console.error('Gemini API error:', apiError)
      return NextResponse.json({ 
        error: 'AI分析サービスエラー', 
        details: 'ファイルサイズが大きすぎるか、AI分析サービスが一時的に利用できません'
      }, { status: 500 })
    }

    // JSONレスポンスを解析
    let aiAnalysis
    try {
      // JSONマークダウンの除去
      const jsonText = text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
      aiAnalysis = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError)
      console.log('Raw AI response:', text)
      
      // JSONパースに失敗した場合のフォールバック
      aiAnalysis = {
        score: 70,
        summary: "書類の分析が完了しましたが、構造化された結果の解析に問題が発生しました。手動での確認をお勧めします。",
        issues: [{
          severity: "medium",
          title: "分析結果の解析エラー",
          description: "AI分析は完了しましたが、結果の構造化に問題が発生しました。",
          location: "全体"
        }],
        suggestions: [{
          title: "手動確認の実施",
          description: "専門家による手動確認を実施してください。"
        }],
        extracted_text: "テキスト抽出に失敗しました",
        raw_response: text
      }
    }

    // 分析結果をデータベースに保存（カラムが存在する場合のみ）
    try {
      const { error: updateError } = await adminClient
        .from('documents')
        .update({
          ai_check_result: aiAnalysis,
          ai_check_status: 'completed',
          ai_check_score: aiAnalysis.score,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)

      if (updateError) {
        console.warn('Error saving AI check result to database (columns may not exist):', updateError)
        // カラムが存在しない場合はワーニングのみ出力し、処理を続行
      }
    } catch (saveError) {
      console.warn('Failed to save AI check result to database:', saveError)
      // カラムが存在しない場合でもエラーにせずに続行
    }

    // 分析結果をレスポンス
    return new NextResponse(JSON.stringify({ 
      success: true,
      analysis: aiAnalysis,
      documentName: subsidyDocument.document_name,
      checkedAt: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    })

  } catch (error) {
    console.error('AI check error:', error)
    return NextResponse.json({ 
      error: 'AI分析中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

