import { AIPromptTemplate, CustomPromptSettings, PromptVariable } from '@/types/prompt'

export class PromptManagementService {
  private static readonly STORAGE_KEY = 'ai_prompt_templates'
  private static readonly SETTINGS_KEY = 'ai_prompt_settings'

  // デフォルトプロンプトテンプレート
  static getDefaultTemplates(): AIPromptTemplate[] {
    return [
      {
        id: 'career_up_employment_rules',
        name: 'キャリアアップ助成金 - 就業規則',
        subsidyType: 'career_up',
        documentType: 'employment_rules',
        systemRole: 'あなたは20年以上の経験を持つ社会保険労務士で、キャリアアップ助成金の申請に特化した専門家です。',
        analysisInstructions: `提供された就業規則を詳細に分析し、キャリアアップ助成金（正社員化コース）の申請要件を満たしているかを評価してください。

分析の観点：
1. 法的要件の完全性
2. 実務上の実現可能性
3. 助成金支給要件との適合性
4. 労働者保護の観点`,
        evaluationCriteria: [
          '正規雇用転換に関する明確な規定があること',
          '転換時の賃金アップ（5%以上推奨）が規定されていること',
          '勤務成績または勤続年数に基づく昇給制度があること',
          '労働条件が適切に明記されていること',
          '転換手続きが明確に定められていること'
        ],
        requiredElements: [
          '正社員転換規定',
          '賃金規定',
          '昇給制度',
          '雇用期間',
          '労働時間',
          '退職制度'
        ],
        outputFormat: `必ず以下のJSON形式で回答してください：
{
  "isCompliant": boolean,
  "feedback": "総合評価（200文字以内）",
  "missingItems": ["不足項目のリスト"],
  "suggestions": ["具体的改善提案のリスト"],
  "confidence": 0-100の数値
}`,
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      },
      {
        id: 'career_up_attendance_record',
        name: 'キャリアアップ助成金 - 出勤簿',
        subsidyType: 'career_up',
        documentType: 'attendance_record',
        systemRole: 'あなたは労務管理の専門家として、出勤記録の適切性を評価する専門家です。',
        analysisInstructions: `提供された出勤簿を分析し、キャリアアップ助成金申請に必要な要件を満たしているかを確認してください。

重要チェックポイント：
1. 6ヶ月以上の継続雇用実績
2. 出勤状況の正確性
3. 労働時間の適正性
4. 記録の完全性`,
        evaluationCriteria: [
          '対象期間（6ヶ月以上）の出勤記録が完備されていること',
          '労働時間が適切に記録されていること',
          '休憩時間が明記されていること',
          '有給休暇等の取得状況が記載されていること',
          '残業時間の管理が適切に行われていること'
        ],
        requiredElements: [
          '出勤日数',
          '労働時間',
          '休憩時間',
          '休暇取得記録',
          '残業時間記録'
        ],
        outputFormat: `必ず以下のJSON形式で回答してください：
{
  "isCompliant": boolean,
  "feedback": "総合評価（200文字以内）",
  "missingItems": ["不足項目のリスト"],
  "suggestions": ["具体的改善提案のリスト"],
  "confidence": 0-100の数値
}`,
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      },
      {
        id: 'career_up_wage_ledger',
        name: 'キャリアアップ助成金 - 賃金台帳',
        subsidyType: 'career_up',
        documentType: 'wage_ledger',
        systemRole: 'あなたは給与計算と賃金管理の専門家として、賃金台帳の適切性を評価します。',
        analysisInstructions: `提供された賃金台帳を分析し、キャリアアップ助成金の正社員化による賃金アップが適切に反映されているかを確認してください。

分析要点：
1. 転換前後の賃金比較
2. 賃金アップ率の妥当性
3. 社会保険の適用状況
4. 記録の正確性`,
        evaluationCriteria: [
          '転換前後の賃金が比較可能な形で記録されていること',
          '5%以上の賃金アップが確認できること',
          '基本給と各種手当が明確に区分されていること',
          '社会保険料の控除が適切に行われていること',
          '支給実績が正確に記録されていること'
        ],
        requiredElements: [
          '基本給',
          '諸手当',
          '総支給額',
          '控除額',
          '差引支給額',
          '社会保険料'
        ],
        outputFormat: `必ず以下のJSON形式で回答してください：
{
  "isCompliant": boolean,
  "feedback": "総合評価（200文字以内）",
  "missingItems": ["不足項目のリスト"],
  "suggestions": ["具体的改善提案のリスト"],
  "confidence": 0-100の数値
}`,
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      }
    ]
  }

  static getDefaultSettings(): CustomPromptSettings {
    return {
      strictnessLevel: 'standard',
      complianceThreshold: 80,
      confidenceThreshold: 70,
      focusAreas: ['法的要件', '実務要件', '助成金要件'],
      customVariables: {
        company_size: '中小企業',
        industry_type: '製造業',
        compliance_focus: '標準'
      },
      enableDetailedAnalysis: true,
      enableSuggestions: true
    }
  }

  // プロンプトテンプレートの取得
  static getPromptTemplates(): AIPromptTemplate[] {
    if (typeof window === 'undefined') {
      return this.getDefaultTemplates()
    }

    const stored = localStorage.getItem(this.STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (error) {
        console.error('Failed to parse stored prompt templates:', error)
      }
    }

    const defaults = this.getDefaultTemplates()
    this.savePromptTemplates(defaults)
    return defaults
  }

  // プロンプトテンプレートの保存
  static savePromptTemplates(templates: AIPromptTemplate[]): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates))
    } catch (error) {
      console.error('Failed to save prompt templates:', error)
    }
  }

  // 設定の取得
  static getPromptSettings(): CustomPromptSettings {
    if (typeof window === 'undefined') {
      return this.getDefaultSettings()
    }

    const stored = localStorage.getItem(this.SETTINGS_KEY)
    if (stored) {
      try {
        return { ...this.getDefaultSettings(), ...JSON.parse(stored) }
      } catch (error) {
        console.error('Failed to parse stored prompt settings:', error)
      }
    }

    return this.getDefaultSettings()
  }

  // 設定の保存
  static savePromptSettings(settings: CustomPromptSettings): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save prompt settings:', error)
    }
  }

  // 特定のプロンプトテンプレートを取得
  static getPromptTemplate(subsidyType: string, documentType: string): AIPromptTemplate | null {
    const templates = this.getPromptTemplates()
    return templates.find(t => 
      t.subsidyType === subsidyType && 
      t.documentType === documentType && 
      t.isActive
    ) || null
  }

  // プロンプトテンプレートの更新
  static updatePromptTemplate(id: string, updates: Partial<AIPromptTemplate>): boolean {
    const templates = this.getPromptTemplates()
    const index = templates.findIndex(t => t.id === id)
    
    if (index === -1) return false

    templates[index] = {
      ...templates[index],
      ...updates,
      updatedAt: new Date().toISOString(),
      version: templates[index].version + 1
    }

    this.savePromptTemplates(templates)
    return true
  }

  // 新しいプロンプトテンプレートの作成
  static createPromptTemplate(template: Omit<AIPromptTemplate, 'id' | 'createdAt' | 'updatedAt' | 'version'>): string {
    const templates = this.getPromptTemplates()
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const newTemplate: AIPromptTemplate = {
      ...template,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    }

    templates.push(newTemplate)
    this.savePromptTemplates(templates)
    return id
  }

  // プロンプトの組み立て
  static buildPrompt(subsidyType: string, documentType: string, fileName: string, customSettings?: Partial<CustomPromptSettings>): string {
    const template = this.getPromptTemplate(subsidyType, documentType)
    if (!template) {
      throw new Error(`プロンプトテンプレートが見つかりません: ${subsidyType}/${documentType}`)
    }

    const settings = { ...this.getPromptSettings(), ...customSettings }
    
    // 厳格さレベルの調整
    const strictnessInstructions = this.getStrictnessInstructions(settings.strictnessLevel)
    
    // カスタム変数の置換
    let prompt = `${template.systemRole}

${template.analysisInstructions}

${strictnessInstructions}

## 評価基準：
${template.evaluationCriteria.map((criteria, index) => `${index + 1}. ${criteria}`).join('\n')}

## 必須確認項目：
${template.requiredElements.map((element, index) => `- ${element}`).join('\n')}

## 分析設定：
- 企業規模: ${settings.customVariables.company_size}
- 業種: ${settings.customVariables.industry_type}
- コンプライアンス重視度: ${settings.customVariables.compliance_focus}
- 要件適合閾値: ${settings.complianceThreshold}%以上
- 信頼度閾値: ${settings.confidenceThreshold}%以上

## 重点チェック領域：
${settings.focusAreas.map(area => `- ${area}`).join('\n')}

## 分析対象文書：
- ファイル名: ${fileName}
- 文書種別: ${this.getDocumentTypeName(documentType)}
- 助成金種別: ${this.getSubsidyTypeName(subsidyType)}

${template.outputFormat}

※ 信頼度は${settings.confidenceThreshold}%以上、要件適合は${settings.complianceThreshold}%以上の基準で判定してください。`

    return prompt
  }

  private static getStrictnessInstructions(level: string): string {
    const instructions = {
      lenient: '基本的な要件を満たしていれば適合と判定してください。',
      standard: '一般的な水準での厳格さで要件適合を判定してください。',
      strict: '高い水準での厳格さを持って要件適合を判定してください。細部まで注意深く確認してください。',
      very_strict: '最高レベルの厳格さで判定してください。わずかでも不備があれば指摘し、完璧性を求めてください。'
    }
    
    return `## 判定基準の厳格さ: ${instructions[level as keyof typeof instructions]}`
  }

  private static getDocumentTypeName(type: string): string {
    const names = {
      employment_rules: '就業規則',
      attendance_record: '出勤簿',
      wage_ledger: '賃金台帳'
    }
    return names[type as keyof typeof names] || type
  }

  private static getSubsidyTypeName(type: string): string {
    const names = {
      career_up: 'キャリアアップ助成金（正社員化コース）',
      work_life_balance: '両立支援等助成金（育児休業等支援コース）',
      human_resource_support: '人材確保等支援助成金（雇用管理制度助成コース）'
    }
    return names[type as keyof typeof names] || type
  }
}