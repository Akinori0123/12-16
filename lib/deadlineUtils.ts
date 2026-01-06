import { DeadlineCalculation } from '@/types/deadline'

export class DeadlineCalculator {
  /**
   * 正社員転換日から各種期限を自動計算（キャリアアップ助成金制度準拠）
   * @param conversionDate - 正社員転換実施日（YYYY-MM-DD形式）
   * @returns 計算された期限情報
   */
  static calculateDeadlines(conversionDate: string): DeadlineCalculation {
    const startDate = new Date(conversionDate)
    
    // キャリアアップ計画期間終了日: 転換日から5年後（通常設定）
    const planEndDate = new Date(startDate)
    planEndDate.setFullYear(planEndDate.getFullYear() + 5)
    
    // 転換後6ヶ月分賃金支払完了想定日
    // 実際は各企業の給与締切日・支払日によるが、転換日から7ヶ月後を想定
    const sixMonthsPaymentEnd = new Date(startDate)
    sixMonthsPaymentEnd.setMonth(sixMonthsPaymentEnd.getMonth() + 7)
    
    // 支給申請期限開始日: 6ヶ月分賃金支払完了日の翌日
    const applicationDeadlineStart = new Date(sixMonthsPaymentEnd)
    applicationDeadlineStart.setDate(applicationDeadlineStart.getDate() + 1)
    
    // 支給申請期限終了日: 申請開始日から2ヶ月後
    const applicationDeadlineEnd = new Date(applicationDeadlineStart)
    applicationDeadlineEnd.setMonth(applicationDeadlineEnd.getMonth() + 2)
    
    // 現在日付からの日数計算
    const today = new Date()
    const daysUntilDeadline = Math.ceil(
      (applicationDeadlineEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    // 2週間以内の緊急フラグ
    const isUrgent = daysUntilDeadline <= 14 && daysUntilDeadline >= 0
    
    return {
      planStartDate: startDate,
      planEndDate,
      applicationDeadlineStart,
      applicationDeadlineEnd,
      daysUntilDeadline,
      isUrgent
    }
  }

  /**
   * 日付を日本語形式でフォーマット
   * @param date - Date オブジェクト
   * @returns YYYY年MM月DD日形式の文字列
   */
  static formatDateJapanese(date: Date): string {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}年${month}月${day}日`
  }

  /**
   * 日付をISO形式（YYYY-MM-DD）でフォーマット
   * @param date - Date オブジェクト
   * @returns YYYY-MM-DD形式の文字列
   */
  static formatDateISO(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * 期限までの残り日数を人間が読みやすい形式で返す
   * @param daysUntilDeadline - 残り日数
   * @returns 人間が読みやすい文字列
   */
  static getDaysUntilDeadlineText(daysUntilDeadline: number): string {
    if (daysUntilDeadline < 0) {
      return `${Math.abs(daysUntilDeadline)}日経過`
    } else if (daysUntilDeadline === 0) {
      return '本日が期限'
    } else if (daysUntilDeadline <= 7) {
      return `残り${daysUntilDeadline}日`
    } else if (daysUntilDeadline <= 30) {
      return `残り${daysUntilDeadline}日`
    } else {
      const weeks = Math.floor(daysUntilDeadline / 7)
      return `残り約${weeks}週間`
    }
  }

  /**
   * 緊急度に応じたスタイルクラスを返す
   * @param daysUntilDeadline - 残り日数
   * @returns TailwindCSSクラス文字列
   */
  static getUrgencyStyle(daysUntilDeadline: number): {
    badgeColor: string
    textColor: string
    bgColor: string
  } {
    if (daysUntilDeadline < 0) {
      // 期限超過
      return {
        badgeColor: 'bg-red-600 text-white',
        textColor: 'text-red-700',
        bgColor: 'bg-red-50 border-red-200'
      }
    } else if (daysUntilDeadline <= 7) {
      // 1週間以内
      return {
        badgeColor: 'bg-red-500 text-white',
        textColor: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200'
      }
    } else if (daysUntilDeadline <= 14) {
      // 2週間以内
      return {
        badgeColor: 'bg-orange-500 text-white',
        textColor: 'text-orange-600',
        bgColor: 'bg-orange-50 border-orange-200'
      }
    } else if (daysUntilDeadline <= 30) {
      // 1ヶ月以内
      return {
        badgeColor: 'bg-yellow-500 text-white',
        textColor: 'text-yellow-600',
        bgColor: 'bg-yellow-50 border-yellow-200'
      }
    } else {
      // 余裕あり
      return {
        badgeColor: 'bg-green-500 text-white',
        textColor: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200'
      }
    }
  }

  /**
   * 入力された日付が有効かどうかを検証
   * @param dateString - YYYY-MM-DD形式の日付文字列
   * @returns 有効かどうかのブール値
   */
  static isValidDate(dateString: string): boolean {
    const date = new Date(dateString)
    return date instanceof Date && !isNaN(date.getTime())
  }

  /**
   * 正社員転換日が適切な範囲内かどうかを検証
   * @param conversionDate - 正社員転換実施日
   * @returns バリデーション結果とエラーメッセージ
   */
  static validateConversionDate(conversionDate: string): {
    isValid: boolean
    errorMessage?: string
  } {
    if (!this.isValidDate(conversionDate)) {
      return {
        isValid: false,
        errorMessage: '有効な日付を入力してください'
      }
    }

    const startDate = new Date(conversionDate)
    const today = new Date()
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    
    const oneMonthFromNow = new Date()
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1)

    if (startDate > oneMonthFromNow) {
      return {
        isValid: false,
        errorMessage: '転換日は1ヶ月以内の日付を選択してください'
      }
    }

    if (startDate < twoYearsAgo) {
      return {
        isValid: false,
        errorMessage: '転換日は2年以内の日付を選択してください'
      }
    }

    return { isValid: true }
  }

  /**
   * キャリアアップ計画期限チェック（転換日前日までに提出必要）
   * @param conversionDate - 正社員転換実施日
   * @returns 計画提出期限情報
   */
  static getCareerPlanDeadline(conversionDate: string): {
    deadlineDate: Date
    isOverdue: boolean
    daysUntilDeadline: number
  } {
    const conversionDateTime = new Date(conversionDate)
    const deadlineDate = new Date(conversionDateTime)
    deadlineDate.setDate(deadlineDate.getDate() - 1) // 転換日の前日
    
    const today = new Date()
    const daysUntilDeadline = Math.ceil(
      (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    return {
      deadlineDate,
      isOverdue: daysUntilDeadline < 0,
      daysUntilDeadline
    }
  }
}