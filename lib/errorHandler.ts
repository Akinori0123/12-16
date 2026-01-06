export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = '認証が必要です') {
    super(message, 401)
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'アクセス権限がありません') {
    super(message, 403)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'リソースが見つかりません') {
    super(message, 404)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'リクエスト制限に達しました') {
    super(message, 429)
  }
}

export const errorHandler = (error: any) => {
  console.error('Application Error:', {
    message: error.message,
    stack: error.stack,
    statusCode: error.statusCode || 500,
    isOperational: error.isOperational || false,
    timestamp: new Date().toISOString()
  })

  // プロダクション環境では詳細なエラー情報を隠す
  if (process.env.NODE_ENV === 'production' && !error.isOperational) {
    return {
      error: '内部サーバーエラーが発生しました',
      statusCode: 500
    }
  }

  return {
    error: error.message || '予期しないエラーが発生しました',
    statusCode: error.statusCode || 500,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  }
}

export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export const clientErrorHandler = (error: any) => {
  // クライアント側のエラーハンドリング
  console.error('Client Error:', error)
  
  let userMessage = 'エラーが発生しました'
  
  if (error.response) {
    // APIエラー
    const status = error.response.status
    const data = error.response.data
    
    switch (status) {
      case 400:
        userMessage = data.error || '入力内容に問題があります'
        break
      case 401:
        userMessage = '認証が必要です。再度ログインしてください'
        break
      case 403:
        userMessage = 'この操作を行う権限がありません'
        break
      case 404:
        userMessage = 'お探しのページまたはデータが見つかりません'
        break
      case 413:
        userMessage = 'ファイルサイズが大きすぎます'
        break
      case 429:
        userMessage = 'リクエストが多すぎます。しばらく待ってから再試行してください'
        break
      case 500:
        userMessage = 'サーバーエラーが発生しました。管理者にお問い合わせください'
        break
      default:
        userMessage = data.error || '予期しないエラーが発生しました'
    }
  } else if (error.request) {
    // ネットワークエラー
    userMessage = 'ネットワークエラーが発生しました。接続を確認してください'
  } else {
    // その他のエラー
    userMessage = error.message || '予期しないエラーが発生しました'
  }

  return userMessage
}

export const logError = (error: any, context?: string) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    url: typeof window !== 'undefined' ? window.location.href : 'N/A'
  }

  console.error('Error logged:', errorInfo)

  // プロダクション環境では外部サービス（Sentry等）にログ送信
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    // Sentry.captureException(error, { extra: errorInfo })
  }
}