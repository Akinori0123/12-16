import { GoogleGenerativeAI } from '@google/generative-ai'
import { PromptManagementService } from './promptManagementService'

export interface AnalysisResult {
  success: boolean
  isCompliant: boolean
  feedback: string
  missingItems: string[]
  suggestions: string[]
  confidence: number // 0-100の信頼度
}

// 実行時にAPIキーをチェック
const getGenAI = (): GoogleGenerativeAI => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables')
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
}

export interface DocumentAnalysisRequest {
  documentType: 'employment_rules' | 'attendance_record' | 'wage_ledger'
  fileName: string
  fileContent: string // Base64 encoded file content
  subsidyType: 'career_up' | 'work_life_balance' | 'human_resource_support'
}

export class GeminiAnalysisService {
  private static getModel() {
    const genAI = getGenAI()
    return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  }

  static async analyzeDocument(request: DocumentAnalysisRequest): Promise<AnalysisResult> {
    try {
      // カスタムプロンプトを使用して分析プロンプトを構築
      const prompt = this.buildCustomAnalysisPrompt(request)
      
      console.log('🤖 Gemini AI分析開始（カスタムプロンプト使用）:', request.fileName)
      
      const model = this.getModel()
      const result = await model.generateContent([
        {
          text: prompt
        },
        {
          inlineData: {
            data: request.fileContent,
            mimeType: this.getMimeType(request.fileName)
          }
        }
      ])

      const response = await result.response
      const analysisText = response.text()
      
      console.log('🤖 Gemini AI分析結果:', analysisText)

      return this.parseAnalysisResult(analysisText, request.documentType)
    } catch (error) {
      console.error('Gemini AI分析エラー:', error)
      
      // エラー時はフォールバック結果を返す
      return {
        success: false,
        isCompliant: false,
        feedback: `AI分析中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
        missingItems: ['AI分析を完了できませんでした'],
        suggestions: ['手動でドキュメントを確認してください'],
        confidence: 0
      }
    }
  }

  private static buildCustomAnalysisPrompt(request: DocumentAnalysisRequest): string {
    try {
      // プロンプト管理サービスでカスタムプロンプトを構築
      return PromptManagementService.buildPrompt(
        request.subsidyType,
        request.documentType,
        request.fileName
      )
    } catch (error) {
      console.warn('カスタムプロンプト構築に失敗、デフォルトプロンプトを使用:', error)
      return this.buildAnalysisPrompt(request)
    }
  }

  private static buildAnalysisPrompt(request: DocumentAnalysisRequest): string {
    const documentTypeNames = {
      employment_rules: '就業規則',
      attendance_record: '出勤簿',
      wage_ledger: '賃金台帳'
    }

    const subsidyTypeNames = {
      career_up: 'キャリアアップ助成金（正社員化コース）',
      work_life_balance: '両立支援等助成金（育児休業等支援コース）',
      human_resource_support: '人材確保等支援助成金（雇用管理制度助成コース）'
    }

    const documentType = documentTypeNames[request.documentType]
    const subsidyType = subsidyTypeNames[request.subsidyType]

    let specificRequirements = ''
    
    switch (request.documentType) {
      case 'employment_rules':
        specificRequirements = `
        - 正規雇用転換に関する規定が含まれているか
        - 有期雇用労働者の正社員登用制度が明記されているか
        - 転換後の労働条件が適切に定められているか
        - 試用期間や評価基準が明確に記載されているか
        `
        break
      case 'attendance_record':
        specificRequirements = `
        - 対象労働者の6ヶ月分以上の出勤記録があるか
        - 勤務時間、休憩時間が正確に記録されているか
        - 有給休暇の取得状況が記載されているか
        - 残業時間の記録が適切に管理されているか
        `
        break
      case 'wage_ledger':
        specificRequirements = `
        - 転換前後の賃金が比較できるよう記録されているか
        - 基本給、諸手当が明確に区分されているか
        - 社会保険料の控除が適切に行われているか
        - 昇給や賞与の支給実績が記載されているか
        `
        break
    }

    return `
あなたは${subsidyType}の申請書類を専門的に審査する労務コンサルタントです。
提供された${documentType}を詳細に分析し、助成金申請の要件を満たしているかを判定してください。

## 分析対象
- 文書種別: ${documentType}
- ファイル名: ${request.fileName}
- 助成金種別: ${subsidyType}

## 確認すべき要件
${specificRequirements}

## 回答形式
以下のJSON形式で回答してください：

{
  "isCompliant": true/false,
  "feedback": "分析結果の詳細説明",
  "missingItems": ["不足している項目1", "不足している項目2"],
  "suggestions": ["改善提案1", "改善提案2"],
  "confidence": 0-100の数値
}

## 分析のポイント
1. 法的要件の充足度を厳格に確認
2. 実務上の問題点があれば指摘
3. 改善が必要な箇所は具体的に提案
4. 信頼度は内容の明確性と完全性に基づいて判定

文書の内容を詳細に確認し、助成金申請において問題となりそうな点を見逃さないよう、専門的な観点から厳格に審査してください。
`
  }

  private static getMimeType(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop()
    switch (extension) {
      case 'pdf':
        return 'application/pdf'
      case 'doc':
        return 'application/msword'
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      case 'xls':
        return 'application/vnd.ms-excel'
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      default:
        return 'application/pdf'
    }
  }

  private static parseAnalysisResult(analysisText: string, documentType: string): AnalysisResult {
    try {
      // JSONの抽出を試みる
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const jsonResult = JSON.parse(jsonMatch[0])
        return {
          success: true,
          isCompliant: jsonResult.isCompliant || false,
          feedback: jsonResult.feedback || 'AI分析が完了しました。',
          missingItems: jsonResult.missingItems || [],
          suggestions: jsonResult.suggestions || [],
          confidence: Math.min(100, Math.max(0, jsonResult.confidence || 75))
        }
      }

      // JSONが抽出できない場合は、テキストから情報を推定
      const isPositive = analysisText.includes('適切') || 
                        analysisText.includes('問題なし') || 
                        analysisText.includes('要件を満たし')

      return {
        success: true,
        isCompliant: isPositive,
        feedback: analysisText.substring(0, 500) + (analysisText.length > 500 ? '...' : ''),
        missingItems: isPositive ? [] : ['詳細な確認が必要です'],
        suggestions: isPositive ? ['書類は適切に作成されています'] : ['内容の見直しをお勧めします'],
        confidence: 75
      }
    } catch (error) {
      console.error('AI分析結果のパースエラー:', error)
      return {
        success: true,
        isCompliant: false,
        feedback: 'AI分析は完了しましたが、結果の解析中に問題が発生しました。',
        missingItems: ['結果の詳細確認が必要'],
        suggestions: ['手動での確認をお勧めします'],
        confidence: 50
      }
    }
  }
}