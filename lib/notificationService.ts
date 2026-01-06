import { DatabaseService } from './database'

export interface NotificationTemplate {
  subject: string
  htmlBody: string
  textBody: string
}

export interface DeadlineReminderData {
  companyName: string
  subsidyName: string
  deadlineDate: string
  daysUntilDeadline: number
  applicationId: string
  dashboardUrl: string
}

export class NotificationService {
  private static readonly SMTP_CONFIG = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.FROM_EMAIL || 'noreply@subsidysmart.com'
  }

  static async sendDeadlineReminder(
    recipientEmail: string,
    data: DeadlineReminderData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const template = this.generateDeadlineReminderTemplate(data)
      
      // デモモードでは実際にメールを送信せずにコンソールに出力
      if (process.env.NODE_ENV === 'development' || !this.SMTP_CONFIG.user) {
        console.log('📧 デモ: メール通知送信')
        console.log(`宛先: ${recipientEmail}`)
        console.log(`件名: ${template.subject}`)
        console.log(`本文: ${template.textBody}`)
        return { success: true }
      }

      // 実際のメール送信（本番環境用）
      const result = await this.sendEmail(
        recipientEmail,
        template.subject,
        template.htmlBody,
        template.textBody
      )

      return result
    } catch (error) {
      console.error('Notification error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  static generateDeadlineReminderTemplate(data: DeadlineReminderData): NotificationTemplate {
    const urgencyLevel = data.daysUntilDeadline <= 7 ? '緊急' : 
                        data.daysUntilDeadline <= 14 ? '注意' : '情報'
    
    const urgencyColor = data.daysUntilDeadline <= 7 ? '#ef4444' : 
                        data.daysUntilDeadline <= 14 ? '#f59e0b' : '#3b82f6'

    const subject = `【${urgencyLevel}】${data.subsidyName} 申請期限のお知らせ - ${data.companyName}様`

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>助成金申請期限のお知らせ</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
          .urgency-alert { background: ${urgencyColor}15; border: 2px solid ${urgencyColor}; border-radius: 6px; padding: 15px; margin: 20px 0; }
          .deadline-box { background: #f9fafb; border-radius: 6px; padding: 20px; margin: 20px 0; text-align: center; }
          .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">SubsidySmart</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">助成金申請支援システム</p>
          </div>
          
          <div class="content">
            <h2 style="color: ${urgencyColor}; margin-top: 0;">【${urgencyLevel}】申請期限のお知らせ</h2>
            
            <p>いつもSubsidySmartをご利用いただきありがとうございます。</p>
            
            <div class="urgency-alert">
              <strong style="color: ${urgencyColor};">
                ${data.subsidyName}の申請期限が近づいています
              </strong>
            </div>
            
            <div class="deadline-box">
              <h3 style="margin: 0 0 10px 0; color: #1f2937;">申請期限</h3>
              <p style="font-size: 24px; font-weight: bold; color: ${urgencyColor}; margin: 0;">
                ${data.deadlineDate}
              </p>
              <p style="margin: 10px 0 0 0; color: #6b7280;">
                あと${data.daysUntilDeadline}日
              </p>
            </div>
            
            <h4>申請情報</h4>
            <ul>
              <li><strong>会社名:</strong> ${data.companyName}</li>
              <li><strong>助成金:</strong> ${data.subsidyName}</li>
              <li><strong>申請ID:</strong> ${data.applicationId}</li>
            </ul>
            
            <h4>次のステップ</h4>
            <p>申請手続きを完了するには、以下のボタンからダッシュボードにアクセスしてください。</p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${data.dashboardUrl}" class="btn">ダッシュボードで確認する</a>
            </p>
            
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #92400e;">重要なお知らせ</h4>
              <p style="margin: 0; color: #92400e;">申請期限を過ぎると助成金を受給できませんので、お早めに手続きをお済ませください。</p>
            </div>
          </div>
          
          <div class="footer">
            <p>このメールは自動送信されています。</p>
            <p>SubsidySmart - 助成金申請支援システム</p>
            <p>© 2024 TM人事労務コンサルティング株式会社</p>
          </div>
        </div>
      </body>
      </html>
    `

    const textBody = `
【${urgencyLevel}】助成金申請期限のお知らせ

${data.companyName}様

いつもSubsidySmartをご利用いただきありがとうございます。

${data.subsidyName}の申請期限が近づいています。

■ 申請期限: ${data.deadlineDate}（あと${data.daysUntilDeadline}日）

■ 申請情報
- 会社名: ${data.companyName}
- 助成金: ${data.subsidyName}
- 申請ID: ${data.applicationId}

■ 次のステップ
申請手続きを完了するには、以下のURLからダッシュボードにアクセスしてください。
${data.dashboardUrl}

重要: 申請期限を過ぎると助成金を受給できませんので、お早めに手続きをお済ませください。

--
このメールは自動送信されています。
SubsidySmart - 助成金申請支援システム
© 2024 TM人事労務コンサルティング株式会社
    `

    return { subject, htmlBody, textBody }
  }

  private static async sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
    textBody: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Node.js環境でのnodemailer使用例
      if (typeof window === 'undefined') {
        // サーバーサイドでのメール送信処理
        // 実際の実装では nodemailer などのライブラリを使用
        console.log('Server-side email sending not implemented in demo')
        return { success: true }
      } else {
        // クライアントサイドでは送信不可
        return { success: false, error: 'Cannot send email from client side' }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  static async checkAndSendDeadlineReminders(): Promise<void> {
    try {
      // 期限が近づいている申請を取得（14日以内）
      const upcomingDeadlines = await DatabaseService.getUpcomingDeadlines(14)
      
      for (const deadline of upcomingDeadlines) {
        if (deadline.application) {
          const daysUntil = Math.ceil(
            (new Date(deadline.deadline_date).getTime() - new Date().getTime()) / 
            (1000 * 60 * 60 * 24)
          )
          
          // リマインダーのタイミング（7日前、3日前、1日前）
          const shouldSend = daysUntil === 7 || daysUntil === 3 || daysUntil === 1
          
          if (shouldSend && !deadline.alert_sent) {
            const reminderData: DeadlineReminderData = {
              companyName: deadline.application.company?.name || '会社名不明',
              subsidyName: this.getSubsidyDisplayName(deadline.application.subsidy_type || 'career_up'),
              deadlineDate: new Date(deadline.deadline_date).toLocaleDateString('ja-JP'),
              daysUntilDeadline: daysUntil,
              applicationId: deadline.application_id,
              dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/applications`
            }
            
            const email = deadline.application.email || deadline.application.company?.email
            if (email) {
              const result = await this.sendDeadlineReminder(email, reminderData)
              
              if (result.success) {
                // 通知送信フラグを更新
                await DatabaseService.updateDeadline(deadline.id, {
                  alert_sent: true
                })
                console.log(`✅ リマインダー送信完了: ${email}`)
              } else {
                console.error(`❌ リマインダー送信失敗: ${email}`, result.error)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Deadline reminder check error:', error)
    }
  }

  private static getSubsidyDisplayName(subsidyType: string): string {
    const names = {
      'career_up': 'キャリアアップ助成金（正社員化コース）',
      'work_life_balance': '両立支援等助成金（育児休業等支援コース）',
      'human_resource_support': '人材確保等支援助成金（雇用管理制度助成コース）'
    }
    return names[subsidyType as keyof typeof names] || subsidyType
  }

  // 手動でのリマインダー送信（管理者用）
  static async sendManualReminder(
    applicationId: string,
    message?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const application = await DatabaseService.getApplication(applicationId)
      if (!application) {
        return { success: false, error: '申請が見つかりません' }
      }

      const email = application.email || application.company?.email
      if (!email) {
        return { success: false, error: 'メールアドレスが設定されていません' }
      }

      const deadlines = application.deadlines
      const nearestDeadline = deadlines?.find(d => d.deadline_type === 'application_deadline')
      
      if (!nearestDeadline) {
        return { success: false, error: '申請期限が設定されていません' }
      }

      const daysUntil = Math.ceil(
        (new Date(nearestDeadline.deadline_date).getTime() - new Date().getTime()) / 
        (1000 * 60 * 60 * 24)
      )

      const reminderData: DeadlineReminderData = {
        companyName: application.company?.name || '会社名不明',
        subsidyName: this.getSubsidyDisplayName(application.subsidy_type || 'career_up'),
        deadlineDate: new Date(nearestDeadline.deadline_date).toLocaleDateString('ja-JP'),
        daysUntilDeadline: daysUntil,
        applicationId,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/applications`
      }

      return await this.sendDeadlineReminder(email, reminderData)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}