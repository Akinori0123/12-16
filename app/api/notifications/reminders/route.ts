import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notificationService'

// POST /api/notifications/reminders - 期限チェック＆リマインダー送信
export async function POST(request: NextRequest) {
  try {
    // リマインダーチェックを実行
    await NotificationService.checkAndSendDeadlineReminders()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Deadline reminders checked and sent successfully' 
    })
  } catch (error) {
    console.error('Reminder API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// POST /api/notifications/reminders/manual - 手動リマインダー送信
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { applicationId, message } = body

    if (!applicationId) {
      return NextResponse.json(
        { success: false, error: 'Application ID is required' },
        { status: 400 }
      )
    }

    const result = await NotificationService.sendManualReminder(applicationId, message)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Manual reminder API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}