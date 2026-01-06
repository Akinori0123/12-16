import { NextRequest, NextResponse } from 'next/server'
import { PDFAnalysisService } from '@/lib/pdfAnalysis'
import { GeminiAnalysisService, AnalysisResult } from '@/lib/geminiService'
import { DatabaseService } from '@/lib/database'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentId = formData.get('documentId') as string
    const applicationId = formData.get('applicationId') as string
    const documentType = formData.get('documentType') as string
    const subsidyType = formData.get('subsidyType') as string

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが提供されていません' },
        { status: 400 }
      )
    }

    if (!documentId) {
      return NextResponse.json(
        { error: 'ドキュメントIDが提供されていません' },
        { status: 400 }
      )
    }

    // ファイルサイズの確認（10MB制限）
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'ファイルサイズが大きすぎます（最大10MB）' },
        { status: 400 }
      )
    }

    // ファイルをBufferに変換してBase64エンコード
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Content = buffer.toString('base64')

    let analysisResult: AnalysisResult

    // GEMINI_API_KEYがある場合は実際のAI分析を実行
    if (process.env.GEMINI_API_KEY) {
      console.log('🤖 Gemini APIを使用してAI分析を実行:', file.name)
      
      try {
        analysisResult = await GeminiAnalysisService.analyzeDocument({
          documentType: documentType as any || 'employment_rules',
          fileName: file.name,
          fileContent: base64Content,
          subsidyType: subsidyType as any || 'career_up'
        })
      } catch (geminiError) {
        console.error('Gemini API error, falling back to mock analysis:', geminiError)
        // Gemini APIエラーの場合はフォールバック
        analysisResult = await PDFAnalysisService.analyzeDocument(buffer)
      }
    } else {
      console.log('📝 GEMINI_API_KEYが設定されていないため、モック分析を使用:', file.name)
      // 従来のモック分析を使用
      analysisResult = await PDFAnalysisService.analyzeDocument(buffer)
    }

    // デモユーザーの場合はlocalStorageへの保存指示を返す
    if (request.headers.get('x-demo-user') === 'true') {
      return NextResponse.json({
        success: true,
        analysis: analysisResult,
        isDemoMode: true
      })
    }

    // 実際のユーザーの場合はSupabaseに保存
    try {
      // AI分析結果を専用のテーブルに保存
      // TODO: Re-enable AI analysis saving after build fix
      // const aiAnalysis = await DatabaseService.createAIAnalysis({
      //   document_id: documentId,
      //   analysis_type: 'career_up_compliance',
      //   status: analysisResult.success ? 'completed' : 'failed',
      //   confidence_score: analysisResult.confidence,
      //   compliance_status: analysisResult.isCompliant ? 'compliant' : 'non_compliant',
      //   feedback_summary: analysisResult.feedback,
      //   detailed_analysis: analysisResult,
      //   suggestions: analysisResult.suggestions || []
      // })

      // ドキュメントのステータスも更新
      await DatabaseService.updateDocument(documentId, {
        upload_status: 'completed'
      })

      // console.log('AI分析結果をデータベースに保存しました:', aiAnalysis.id)
      
    } catch (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({
        success: true,
        analysis: analysisResult,
        warning: 'AI分析は完了しましたが、結果の保存中にエラーが発生しました'
      })
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult
    })

  } catch (error) {
    console.error('Document analysis error:', error)
    
    return NextResponse.json(
      { 
        error: 'ドキュメント分析中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
}

// HEALTHチェック用のGETエンドポイント
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Document Analysis API',
    timestamp: new Date().toISOString()
  })
}