import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // 環境変数から管理者認証情報を取得
    const adminEmail = process.env.ADMIN_MAIL
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: '管理者認証情報が設定されていません' },
        { status: 500 }
      )
    }

    // 認証チェック
    if (email === adminEmail && password === adminPassword) {
      // 管理者情報を返す
      const adminUser = {
        id: 'admin-user-001',
        email: adminEmail,
        company_name: 'TM人事労務コンサルティング',
        role: 'admin'
      }

      return NextResponse.json({ 
        success: true, 
        user: adminUser 
      })
    } else {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { error: 'ログイン処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}