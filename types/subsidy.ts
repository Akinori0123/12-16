export interface SubsidyType {
  id: string
  name: string
  description: string
  category: 'career_up' | 'work_life_balance' | 'human_resource_support' | 'other'
  estimatedAmount: {
    min: number
    max: number
  }
  eligibilityRequirements: string[]
  processingTime: string
  difficulty: 'easy' | 'medium' | 'hard'
  isAvailable: boolean
}

export interface WorkflowStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  isRequired: boolean
  estimatedDuration: string
  dependencies?: string[] // 前提となるステップのID
  documents?: string[] // 必要な書類
  actions?: WorkflowAction[]
}

export interface WorkflowAction {
  id: string
  type: 'upload_document' | 'input_data' | 'review_ai_analysis' | 'generate_pdf' | 'submit'
  label: string
  description?: string
  isCompleted: boolean
}

export interface SubsidyWorkflow {
  subsidyId: string
  applicationId: string
  steps: WorkflowStep[]
  currentStepIndex: number
  overallProgress: number
  estimatedCompletionDate?: string
}

export const SUBSIDY_TYPES: SubsidyType[] = [
  {
    id: 'career_up',
    name: 'キャリアアップ助成金（正社員化コース）',
    description: '有期雇用労働者の正社員転換を支援する助成金です。',
    category: 'career_up',
    estimatedAmount: {
      min: 285000,
      max: 712500
    },
    eligibilityRequirements: [
      '雇用保険適用事業所であること',
      'キャリアアップ管理者を置いていること',
      'キャリアアップ計画を作成し、労働局長の受給資格の認定を受けること',
      '正規雇用労働者として雇用することを約束して雇い入れること'
    ],
    processingTime: '約2-3ヶ月',
    difficulty: 'medium',
    isAvailable: true
  },
  {
    id: 'work_life_balance',
    name: '両立支援等助成金（育児休業等支援コース）',
    description: '育児休業の取得促進や職場環境整備を支援する助成金です。',
    category: 'work_life_balance',
    estimatedAmount: {
      min: 285000,
      max: 712500
    },
    eligibilityRequirements: [
      '雇用保険適用事業所であること',
      '次世代育成支援対策推進法に基づく一般事業主行動計画を策定していること',
      '育児休業等に関する制度について労働協約または就業規則に規定していること'
    ],
    processingTime: '約3-4ヶ月',
    difficulty: 'hard',
    isAvailable: true
  },
  {
    id: 'human_resource_support',
    name: '人材確保等支援助成金（雇用管理制度助成コース）',
    description: '人材確保や雇用管理改善のための制度導入を支援する助成金です。',
    category: 'human_resource_support',
    estimatedAmount: {
      min: 570000,
      max: 720000
    },
    eligibilityRequirements: [
      '雇用保険適用事業所であること',
      '離職率目標を達成すること',
      '雇用管理制度整備計画を提出し、認定を受けること'
    ],
    processingTime: '約4-5ヶ月',
    difficulty: 'hard',
    isAvailable: false // 一時的に受付停止の例
  }
]

export const CAREER_UP_WORKFLOW_TEMPLATE: WorkflowStep[] = [
  {
    id: 'company_registration',
    title: '企業情報登録',
    description: '会社の基本情報を入力してください',
    status: 'pending',
    isRequired: true,
    estimatedDuration: '10分',
    actions: [
      {
        id: 'input_company_info',
        type: 'input_data',
        label: '企業情報を入力',
        description: '会社名、代表者名、所在地などを入力',
        isCompleted: false
      }
    ]
  },
  {
    id: 'plan_creation',
    title: 'キャリアアップ計画書作成',
    description: '6ヶ月間の実施計画を立てます',
    status: 'pending',
    isRequired: true,
    estimatedDuration: '20分',
    dependencies: ['company_registration'],
    actions: [
      {
        id: 'input_plan_details',
        type: 'input_data',
        label: '計画詳細を入力',
        description: '計画開始日、対象従業員数、実施内容を入力',
        isCompleted: false
      }
    ]
  },
  {
    id: 'document_upload',
    title: '必要書類のアップロード',
    description: '就業規則、賃金台帳、出勤簿などをアップロードします',
    status: 'pending',
    isRequired: true,
    estimatedDuration: '30分',
    dependencies: ['plan_creation'],
    documents: ['就業規則', '賃金台帳', '出勤簿', '労働者名簿'],
    actions: [
      {
        id: 'upload_work_rules',
        type: 'upload_document',
        label: '就業規則をアップロード',
        isCompleted: false
      },
      {
        id: 'upload_wage_ledger',
        type: 'upload_document',
        label: '賃金台帳をアップロード',
        isCompleted: false
      },
      {
        id: 'upload_attendance',
        type: 'upload_document',
        label: '出勤簿をアップロード',
        isCompleted: false
      }
    ]
  },
  {
    id: 'ai_analysis_review',
    title: 'AI分析結果の確認',
    description: 'アップロードした書類のAI分析結果を確認し、必要に応じて修正します',
    status: 'pending',
    isRequired: true,
    estimatedDuration: '15分',
    dependencies: ['document_upload'],
    actions: [
      {
        id: 'review_analysis',
        type: 'review_ai_analysis',
        label: 'AI分析結果を確認',
        description: '要件適合性と改善提案を確認',
        isCompleted: false
      }
    ]
  },
  {
    id: 'document_generation',
    title: '申請書類の生成',
    description: '入力された情報を基に正式な申請書類を生成します',
    status: 'pending',
    isRequired: true,
    estimatedDuration: '5分',
    dependencies: ['ai_analysis_review'],
    actions: [
      {
        id: 'generate_application_pdf',
        type: 'generate_pdf',
        label: '申請書類を生成',
        description: 'PDF形式の申請書類をダウンロード',
        isCompleted: false
      }
    ]
  },
  {
    id: 'final_submission',
    title: '書類提出',
    description: '生成された書類を労働局に提出します',
    status: 'pending',
    isRequired: true,
    estimatedDuration: '窓口対応時間による',
    dependencies: ['document_generation'],
    actions: [
      {
        id: 'submit_to_office',
        type: 'submit',
        label: '労働局に提出',
        description: '印刷した書類を管轄の労働局に提出',
        isCompleted: false
      }
    ]
  }
]

export const WORK_LIFE_BALANCE_WORKFLOW_TEMPLATE: WorkflowStep[] = [
  {
    id: 'company_registration',
    title: '企業情報登録',
    description: '会社の基本情報を入力してください',
    status: 'pending',
    isRequired: true,
    estimatedDuration: '10分',
    actions: [
      {
        id: 'input_company_info',
        type: 'input_data',
        label: '企業情報を入力',
        isCompleted: false
      }
    ]
  },
  {
    id: 'action_plan_creation',
    title: '一般事業主行動計画策定',
    description: '次世代育成支援のための行動計画を策定します',
    status: 'pending',
    isRequired: true,
    estimatedDuration: '45分',
    dependencies: ['company_registration'],
    actions: [
      {
        id: 'create_action_plan',
        type: 'input_data',
        label: '行動計画を策定',
        description: '3年間の具体的な取組内容を計画',
        isCompleted: false
      }
    ]
  },
  {
    id: 'policy_setup',
    title: '育児休業制度の整備',
    description: '就業規則に育児休業等の制度を規定します',
    status: 'pending',
    isRequired: true,
    estimatedDuration: '30分',
    dependencies: ['action_plan_creation'],
    documents: ['就業規則', '育児休業規程'],
    actions: [
      {
        id: 'upload_childcare_policy',
        type: 'upload_document',
        label: '育児休業規程をアップロード',
        isCompleted: false
      }
    ]
  }
]