import PDFParse from 'pdf-parse'
import { GoogleGenerativeAI } from '@google/generative-ai'

export interface AnalysisResult {
  success: boolean
  isCompliant: boolean
  feedback: string
  missingItems: string[]
  suggestions: string[]
  confidence: number // 0-100の信頼度
}

export class PDFAnalysisService {
  private static genAI: GoogleGenerativeAI | null = null

  // Gemini AI の初期化
  private static initializeAI() {
    if (!this.genAI) {
      const apiKey = process.env.GOOGLE_AI_API_KEY
      if (!apiKey) {
        throw new Error('GOOGLE_AI_API_KEY environment variable is not set')
      }
      this.genAI = new GoogleGenerativeAI(apiKey)
    }
    return this.genAI
  }

  // PDFからテキストを抽出
  static async extractTextFromPDF(fileBuffer: Buffer): Promise<{ text: string; error?: string }> {
    try {
      const data = await PDFParse(fileBuffer)
      
      if (!data.text || data.text.trim().length === 0) {
        return { 
          text: '', 
          error: 'PDFからテキストを抽出できませんでした。画像のみのPDFまたは保護されたPDFの可能性があります。' 
        }
      }

      return { text: data.text }
    } catch (error) {
      console.error('PDF parsing error:', error)
      return { 
        text: '', 
        error: error instanceof Error ? error.message : 'PDF解析中にエラーが発生しました' 
      }
    }
  }

  // キャリアアップ助成金用の就業規則分析
  static async analyzeEmploymentRules(pdfText: string): Promise<AnalysisResult> {
    try {
      const genAI = this.initializeAI()
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

      const prompt = `
あなたは経験豊富な社会保険労務士です。提供された就業規則のテキストを分析し、キャリアアップ助成金（正社員化コース）の申請要件を満たしているかどうかを詳細に評価してください。

## 評価基準（キャリアアップ助成金の要件）:

### 必須項目:
1. **正社員転換規定**: 有期雇用労働者から正社員への転換についての明確な規定
2. **賃金規定**: 正社員転換時の賃金設定に関する規定
3. **昇給制度**: 正社員の昇給に関する規定（勤務成績や勤続年数に基づく）
4. **雇用期間**: 正社員の雇用期間（期間の定めなし）に関する規定
5. **労働時間**: 正社員の労働時間に関する規定
6. **退職制度**: 正社員の退職に関する規定

### 分析対象テキスト:
\`\`\`
${pdfText}
\`\`\`

## 回答形式:
以下のJSON形式で回答してください：

\`\`\`json
{
  "isCompliant": boolean,
  "confidence": number,
  "feedback": "総合評価コメント（200字以内）",
  "missingItems": ["不足している項目のリスト"],
  "suggestions": ["具体的な改善提案のリスト"],
  "detailedAnalysis": {
    "正社員転換規定": {"found": boolean, "comment": "詳細コメント"},
    "賃金規定": {"found": boolean, "comment": "詳細コメント"},
    "昇給制度": {"found": boolean, "comment": "詳細コメント"},
    "雇用期間": {"found": boolean, "comment": "詳細コメント"},
    "労働時間": {"found": boolean, "comment": "詳細コメント"},
    "退職制度": {"found": boolean, "comment": "詳細コメント"}
  }
}
\`\`\`

注意事項:
- confidenceは0-100の数値で、分析の信頼度を示してください
- isCompliantは必須項目の80%以上が満たされている場合にtrueとしてください
- feedbackは具体的で建設的なコメントを記載してください
- 不足項目については具体的な条文例も提案してください
`

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      // JSONの抽出（```json から ``` までの部分）
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
      if (!jsonMatch) {
        throw new Error('AI応答からJSONを抽出できませんでした')
      }

      const analysisData = JSON.parse(jsonMatch[1])

      return {
        success: true,
        isCompliant: analysisData.isCompliant || false,
        feedback: analysisData.feedback || 'AI分析が完了しました',
        missingItems: analysisData.missingItems || [],
        suggestions: analysisData.suggestions || [],
        confidence: analysisData.confidence || 0
      }

    } catch (error) {
      console.error('AI analysis error:', error)
      return {
        success: false,
        isCompliant: false,
        feedback: `AI分析中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        missingItems: [],
        suggestions: [],
        confidence: 0
      }
    }
  }

  // デモ用の分析結果（実際のAI APIを使わない場合）
  static async analyzeEmploymentRulesDemo(pdfText: string): Promise<AnalysisResult> {
    // 1-3秒の分析時間をシミュレート
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000))

    // テキストの内容に基づいて簡単な判定
    const hasWageRules = pdfText.includes('賃金') || pdfText.includes('給与') || pdfText.includes('給料')
    const hasPromotionRules = pdfText.includes('昇給') || pdfText.includes('昇進') || pdfText.includes('昇格')
    const hasEmploymentConversion = pdfText.includes('正社員') || pdfText.includes('正規雇用') || pdfText.includes('転換')
    
    const foundItems = [hasWageRules, hasPromotionRules, hasEmploymentConversion].filter(Boolean).length
    const isCompliant = foundItems >= 2

    return {
      success: true,
      isCompliant,
      feedback: isCompliant 
        ? 'キャリアアップ助成金の主要な要件は概ね満たされています。詳細な確認後、申請手続きを進められます。'
        : '一部の要件が不足している可能性があります。正社員転換規定、賃金規定、昇給制度の記載を確認してください。',
      missingItems: [
        ...(hasWageRules ? [] : ['賃金規定の詳細記載']),
        ...(hasPromotionRules ? [] : ['昇給制度に関する規定']),
        ...(hasEmploymentConversion ? [] : ['正社員転換に関する明確な規定'])
      ],
      suggestions: [
        '正社員転換時の賃金アップ（5%以上）を明記することを推奨します',
        '勤続年数に応じた昇給制度を設けることで助成金の要件を満たしやすくなります',
        '転換後の労働条件を明確に定義することが重要です'
      ],
      confidence: 85
    }
  }

  // メイン分析メソッド（デモ判定付き）
  static async analyzeDocument(fileBuffer: Buffer): Promise<AnalysisResult> {
    // PDFからテキストを抽出
    const { text, error } = await this.extractTextFromPDF(fileBuffer)
    
    if (error || !text) {
      return {
        success: false,
        isCompliant: false,
        feedback: error || 'PDFからテキストを抽出できませんでした',
        missingItems: [],
        suggestions: ['PDFが正しく読み取り可能な形式であることを確認してください'],
        confidence: 0
      }
    }

    // サーバーサイドではデモモードは常にtrueとして扱う（実際のAI APIキーがない場合）
    if (typeof window === 'undefined' && !process.env.GOOGLE_AI_API_KEY) {
      return this.analyzeEmploymentRulesDemo(text)
    }

    // クライアントサイドではlocalStorageでデモモードを判定
    if (typeof window !== 'undefined' && localStorage.getItem('demoUser')) {
      return this.analyzeEmploymentRulesDemo(text)
    }

    // 実際のAI分析
    return this.analyzeEmploymentRules(text)
  }
}