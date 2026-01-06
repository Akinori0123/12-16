import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: '認証が無効です' }, { status: 401 })
    }

    // ユーザープロファイル取得
    const userProfile = await DatabaseService.getUserProfile(user.id)
    
    if (!userProfile) {
      return NextResponse.json({ error: 'ユーザープロファイルが見つかりません' }, { status: 404 })
    }

    // 管理者かクライアントかで取得データを分ける
    let applications
    if (userProfile.role === 'admin') {
      applications = await DatabaseService.getAllApplicationsForAdmin()
    } else {
      applications = await DatabaseService.getApplicationsByUser(user.id)
    }

    return NextResponse.json({ applications })

  } catch (error) {
    console.error('申請取得エラー:', error)
    return NextResponse.json(
      { error: '申請の取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: '認証が無効です' }, { status: 401 })
    }

    const applicationData = await request.json()

    // ユーザープロファイルを取得、存在しない場合は企業と一緒に作成
    let userProfile
    try {
      userProfile = await DatabaseService.getUserProfile(user.id)
      console.log('Existing user profile found:', userProfile.id)
    } catch (error) {
      console.log('User profile not found, creating company and profile')
      
      // 企業を作成（重複エラーを避けるため、存在確認はしない）
      let company
      try {
        company = await DatabaseService.createCompany({
          name: applicationData.company_name || 'サンプル株式会社',
          representative_name: applicationData.representative_name || '山田 太郎',
          email: user.email || applicationData.email,
          phone_number: applicationData.phone_number,
          address: applicationData.address
        })
        console.log('Company created:', company.id)
      } catch (companyError) {
        console.error('Company creation failed:', companyError)
        throw new Error('企業の作成中にエラーが発生しました')
      }

      // ユーザープロファイルをupsert
      try {
        userProfile = await DatabaseService.upsertUserProfile({
          id: user.id,
          company_id: company.id,
          role: 'client',
          full_name: applicationData.representative_name || user.user_metadata?.full_name || '山田 太郎'
        })
        console.log('User profile upserted:', userProfile.id)
      } catch (profileError) {
        console.error('User profile upsert failed:', profileError)
        throw new Error('ユーザープロファイルの処理中にエラーが発生しました')
      }
    }

    // 申請データの作成
    console.log('Creating application with user_id:', user.id, 'company_id:', userProfile.company_id || userProfile.company?.id)
    const newApplication = await DatabaseService.createApplication({
      ...applicationData,
      user_id: user.id,
      company_id: userProfile.company_id || userProfile.company?.id
    })
    
    if (!newApplication) {
      throw new Error('申請の作成に失敗しました - データが返されませんでした')
    }
    
    console.log('New application created with ID:', newApplication.id)

    // 初期期限の設定
    if (applicationData.plan_start_date) {
      const planStartDate = new Date(applicationData.plan_start_date)
      let planEndDate = new Date(planStartDate)
      if (applicationData.plan_end_date) {
        planEndDate = new Date(applicationData.plan_end_date)
      } else {
        planEndDate.setMonth(planEndDate.getMonth() + 6) // 6ヶ月後
      }

      let applicationDeadline = new Date(applicationData.application_deadline || planEndDate)
      if (!applicationData.application_deadline) {
        applicationDeadline.setMonth(applicationDeadline.getMonth() + 2) // さらに2ヶ月後
      }

      try {
        await DatabaseService.createDeadline({
          application_id: newApplication.id,
          deadline_type: 'application_deadline',
          deadline_date: applicationDeadline.toISOString().split('T')[0]
        })
        console.log('Deadline created successfully')
      } catch (deadlineError) {
        console.error('Deadline creation error:', deadlineError)
        // 期限作成エラーは致命的ではないため続行
      }

      // 申請レコードに期限を更新
      try {
        await DatabaseService.updateApplication(newApplication.id, {
          plan_end_date: planEndDate.toISOString().split('T')[0],
          application_deadline: applicationDeadline.toISOString().split('T')[0]
        })
        console.log('Application updated with deadlines successfully')
      } catch (updateError) {
        console.error('Application update error:', updateError)
        // 更新エラーは致命的ではないため続行
      }
    }

    return NextResponse.json({ application: newApplication })

  } catch (error) {
    console.error('申請作成エラー:', error)
    return NextResponse.json(
      { error: '申請の作成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}