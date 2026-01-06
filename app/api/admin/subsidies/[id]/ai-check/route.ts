import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    
    // Gemini APIキーを確認
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
    }

    // Gemini AIを初期化
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    // 対象助成金と必要書類を取得
    const { data: subsidyData, error: subsidyError } = await supabaseAdmin
      .from('subsidy_types')
      .select(`
        *,
        subsidy_required_documents(*)
      `)
      .eq('id', id)
      .single()

    if (subsidyError) {
      console.error('Error fetching subsidy data:', subsidyError)
      return NextResponse.json({ error: 'Failed to fetch subsidy data' }, { status: 500 })
    }

    // AIプロンプトを作成
    const prompt = `
あなたは助成金申請の専門家です。以下の助成金の必要書類と確認点を分析し、最新の制度と照らし合わせて不備や改善点をチェックしてください。

【対象助成金】
名称: ${subsidyData.name}
説明: ${subsidyData.description || '詳細情報なし'}

【現在設定されている必要書類と確認点】
${subsidyData.subsidy_required_documents.map((doc: any, index: number) => `
${index + 1}. 書類名: ${doc.document_name}
   書類キー: ${doc.document_key}
   説明: ${doc.description || '説明なし'}
   確認点: ${doc.checkpoints || '確認点未設定'}
   必須: ${doc.is_required ? 'はい' : 'いいえ'}
   ファイル形式: ${doc.file_types}
   順序: ${doc.sort_order}
`).join('\n')}

【チェックポイント】
1. 必要書類の不足: 一般的に必要とされる書類で設定されていないものはありますか？
2. 確認点の適切性: 各書類の確認点は十分詳細で実用的ですか？
3. 制度変更への対応: 最近の制度改正に対応できていない項目はありますか？
4. 書類の重複や不要性: 不要な書類や重複している書類はありますか？
5. 順序の妥当性: 書類の順序は申請プロセスに沿って適切ですか？

【出力形式】
以下の形式でJSONとして回答してください：
{
  "overall_score": 85,
  "summary": "全体的な評価コメント",
  "issues": [
    {
      "type": "missing_document",
      "severity": "high",
      "title": "問題のタイトル",
      "description": "詳細な説明",
      "recommendation": "改善提案"
    }
  ],
  "improvements": [
    {
      "document_key": "employment_rules",
      "suggestion": "改善提案",
      "new_checkpoints": "推奨される新しい確認点"
    }
  ]
}

必ず有効なJSONフォーマットで回答し、日本語で記述してください。
`

    // Gemini APIを呼び出し
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

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
        overall_score: 70,
        summary: "AIによる分析が完了しましたが、構造化された結果の解析に問題が発生しました。",
        issues: [{
          type: "analysis_error",
          severity: "medium",
          title: "分析結果の解析エラー",
          description: "AI分析は完了しましたが、結果の構造化に問題が発生しました。手動での確認をお勧めします。",
          recommendation: "設定内容を手動で確認し、最新の制度要件と照らし合わせてください。"
        }],
        improvements: [],
        raw_response: text
      }
    }

    // 分析結果をレスポンス
    return new NextResponse(JSON.stringify({ 
      success: true,
      analysis: aiAnalysis,
      subsidyName: subsidyData.name,
      documentCount: subsidyData.subsidy_required_documents.length,
      analyzedAt: new Date().toISOString()
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