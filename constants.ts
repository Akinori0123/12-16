import { SubsidyProgram, TaskStatus } from './types';

export const DEMO_USER = {
  companyName: "株式会社テクノ・フロンティア",
  representative: "山田 太郎",
};

export const SUBSIDY_PROGRAMS: SubsidyProgram[] = [
  {
    id: 'career-up',
    name: 'キャリアアップ助成金',
    category: '正社員化コース',
    description: '有期雇用労働者等の正社員化、処遇改善の取組を実施した事業主に対して助成します。',
    phases: [
      {
        id: 'cu-phase-1',
        title: '計画届の作成・提出',
        description: 'キャリアアップ計画書の作成と労働局への提出準備を行います。',
        isActive: true,
        isCompleted: false,
        tasks: [
          {
            id: 'cu-task-1',
            title: '就業規則のアップロード',
            description: '現在の就業規則（最新版）をアップロードしてください。AIが記載内容を確認します。',
            status: TaskStatus.PENDING,
            required: true,
            fileType: 'pdf'
          },
          {
            id: 'cu-task-2',
            title: '対象労働者リストの作成',
            description: '正社員化を予定している対象者の情報を入力してください。',
            status: TaskStatus.ACTION_REQUIRED,
            required: true,
            dueDate: '2024-06-15',
            fileType: 'form'
          },
          {
            id: 'cu-task-3',
            title: 'キャリアアップ計画書（案）',
            description: 'AIが過去のデータに基づき叩き台を作成しました。確認してください。',
            status: TaskStatus.COMPLETED,
            required: true,
            fileType: 'pdf'
          }
        ]
      },
      {
        id: 'cu-phase-2',
        title: '要件確認・実施',
        description: '計画認定後、実際に正社員転換を行うフェーズです。',
        isActive: false,
        isCompleted: false,
        tasks: [
          {
            id: 'cu-task-4',
            title: '雇用契約書の締結',
            description: '転換後の雇用契約書が必要です。',
            status: TaskStatus.PENDING,
            required: true
          },
          {
            id: 'cu-task-5',
            title: '出勤簿（賃金台帳）の整備',
            description: '転換後6ヶ月分の実績が必要です。',
            status: TaskStatus.PENDING,
            required: true
          }
        ]
      },
      {
        id: 'cu-phase-3',
        title: '支給申請',
        description: '要件を満たした後、支給申請を行います。',
        isActive: false,
        isCompleted: false,
        tasks: []
      }
    ]
  },
  {
    id: 'work-life-balance',
    name: '両立支援等助成金',
    category: '出生時両立支援コース',
    description: '男性労働者が育児休業を取得しやすい職場風土作りに取り組む事業主を支援します。',
    phases: [
      {
        id: 'wlb-phase-1',
        title: '環境整備・計画策定',
        description: '育児休業を取得しやすい環境の整備と計画の策定を行います。',
        isActive: true,
        isCompleted: false,
        tasks: [
          {
            id: 'wlb-task-1',
            title: '一般事業主行動計画の策定',
            description: '次世代法に基づく行動計画を策定・届出してください。',
            status: TaskStatus.PENDING,
            required: true,
            fileType: 'form'
          },
          {
            id: 'wlb-task-2',
            title: '育児休業規定の改定',
            description: '最新の法改正に対応した育児介護休業規定をアップロードしてください。',
            status: TaskStatus.PENDING,
            required: true,
            fileType: 'pdf'
          }
        ]
      },
      {
        id: 'wlb-phase-2',
        title: '取組実施・育休取得',
        description: '対象となる男性労働者の育児休業取得実績を作ります。',
        isActive: false,
        isCompleted: false,
        tasks: [
          {
            id: 'wlb-task-3',
            title: '育児休業申出書の受領',
            description: '対象者からの休業申出書を保存してください。',
            status: TaskStatus.PENDING,
            required: true
          }
        ]
      }
    ]
  },
  {
    id: 'hr-securing',
    name: '人材確保等支援助成金',
    category: '中小企業団体助成コース',
    description: '雇用管理改善の取組を行い、離職率の低下目標を達成した場合に助成されます。',
    phases: [
      {
        id: 'hr-phase-1',
        title: '改善計画の認定',
        description: '雇用管理改善計画（設備導入等）を作成し、認定を受けます。',
        isActive: true,
        isCompleted: false,
        tasks: [
          {
            id: 'hr-task-1',
            title: '雇用管理改善計画書の作成',
            description: '導入する設備・機器と改善目標を入力してください。',
            status: TaskStatus.ACTION_REQUIRED,
            required: true,
            fileType: 'form'
          },
          {
            id: 'hr-task-2',
            title: '見積書の取得',
            description: '導入予定設備の相見積もり（2社以上）をアップロードしてください。',
            status: TaskStatus.PENDING,
            required: true,
            fileType: 'pdf'
          }
        ]
      },
      {
        id: 'hr-phase-2',
        title: '計画実施・評価',
        description: '計画に基づき設備を導入し、一定期間経過後の離職率を確認します。',
        isActive: false,
        isCompleted: false,
        tasks: [
          {
            id: 'hr-task-3',
            title: '導入完了報告',
            description: '納品書・請求書・支払証拠書類を提出してください。',
            status: TaskStatus.PENDING,
            required: true
          }
        ]
      }
    ]
  }
];