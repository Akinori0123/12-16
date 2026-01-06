// 期限管理関連の型定義

export interface ApplicationInfo {
  id: string
  companyName: string
  representativeName: string
  planStartDate: string // YYYY-MM-DD形式
  planEndDate: string // 自動計算される取組期間終了日
  applicationDeadlineStart: string // 申請期限開始日
  applicationDeadlineEnd: string // 申請期限終了日
  isDeadlineOverridden: boolean // 管理者による手動変更フラグ
  created_at: string
  updated_at: string
  review_comments?: string // 管理者からの審査コメント
}

export interface DeadlineCalculation {
  planStartDate: Date
  planEndDate: Date // 開始日から6ヶ月後
  applicationDeadlineStart: Date // 取組期間終了日の翌日
  applicationDeadlineEnd: Date // 申請期限開始日から2ヶ月後
  daysUntilDeadline: number // 申請期限終了日までの日数
  isUrgent: boolean // 2週間以内かどうか
}

export interface DeadlineEditState {
  isEditing: boolean
  tempStartDate: string
  tempEndDate: string
}