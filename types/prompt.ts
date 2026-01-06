export interface AIPromptTemplate {
  id: string
  name: string
  subsidyType: 'career_up' | 'work_life_balance' | 'human_resource_support'
  documentType: 'employment_rules' | 'attendance_record' | 'wage_ledger'
  systemRole: string // AIの役割設定
  analysisInstructions: string // 分析指示
  evaluationCriteria: string[] // 評価基準のリスト
  requiredElements: string[] // 必須要素のリスト
  outputFormat: string // 出力形式の指示
  isActive: boolean
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  version: number
}

export interface PromptVariable {
  key: string
  label: string
  description: string
  defaultValue: string
  type: 'text' | 'textarea' | 'number' | 'select'
  options?: string[] // select type用
}

export interface CustomPromptSettings {
  strictnessLevel: 'lenient' | 'standard' | 'strict' | 'very_strict'
  complianceThreshold: number // 0-100 要件適合の閾値
  confidenceThreshold: number // 0-100 信頼度の閾値
  focusAreas: string[] // 重点チェック項目
  customVariables: Record<string, string>
  enableDetailedAnalysis: boolean
  enableSuggestions: boolean
}

export const DEFAULT_PROMPT_VARIABLES: PromptVariable[] = [
  {
    key: 'company_size',
    label: '企業規模',
    description: '分析対象企業の規模（中小企業/大企業）',
    defaultValue: '中小企業',
    type: 'select',
    options: ['中小企業', '大企業']
  },
  {
    key: 'industry_type',
    label: '業種',
    description: '企業の業種・業界',
    defaultValue: '製造業',
    type: 'text'
  },
  {
    key: 'compliance_focus',
    label: 'コンプライアンス重視度',
    description: '法令遵守の重視レベル',
    defaultValue: '標準',
    type: 'select',
    options: ['基本', '標準', '厳格', '最高']
  }
]