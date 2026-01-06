export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
}

export interface ValidationSchema {
  [key: string]: ValidationRule
}

export interface ValidationResult {
  isValid: boolean
  errors: { [key: string]: string }
}

export function validateField(value: any, rules: ValidationRule): string | null {
  // Required check
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return 'この項目は必須です'
  }

  // Skip other validations if value is empty and not required
  if (!value) {
    return null
  }

  // String-specific validations
  if (typeof value === 'string') {
    // Min length
    if (rules.minLength && value.length < rules.minLength) {
      return `${rules.minLength}文字以上で入力してください`
    }

    // Max length
    if (rules.maxLength && value.length > rules.maxLength) {
      return `${rules.maxLength}文字以下で入力してください`
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      return '入力形式が正しくありません'
    }
  }

  // Custom validation
  if (rules.custom) {
    const customResult = rules.custom(value)
    if (customResult) {
      return customResult
    }
  }

  return null
}

export function validateForm(data: any, schema: ValidationSchema): ValidationResult {
  const errors: { [key: string]: string } = {}

  for (const [field, rules] of Object.entries(schema)) {
    const error = validateField(data[field], rules)
    if (error) {
      errors[field] = error
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// 事前定義されたバリデーション関数
export const validationRules = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    custom: (value: string) => {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return '有効なメールアドレスを入力してください'
      }
      return null
    }
  },

  phone: {
    pattern: /^[0-9\-\+\(\)\s]+$/,
    custom: (value: string) => {
      if (value && value.replace(/[\s\-\(\)]/g, '').length < 10) {
        return '有効な電話番号を入力してください'
      }
      return null
    }
  },

  password: {
    minLength: 8,
    custom: (value: string) => {
      if (value && value.length < 8) {
        return 'パスワードは8文字以上である必要があります'
      }
      if (value && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
        return 'パスワードは大文字、小文字、数字を含む必要があります'
      }
      return null
    }
  },

  date: {
    custom: (value: string) => {
      if (value) {
        const date = new Date(value)
        if (isNaN(date.getTime())) {
          return '有効な日付を入力してください'
        }
      }
      return null
    }
  },

  futureDate: {
    custom: (value: string) => {
      if (value) {
        const date = new Date(value)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (date < today) {
          return '今日以降の日付を選択してください'
        }
      }
      return null
    }
  },

  positiveNumber: {
    custom: (value: any) => {
      const num = Number(value)
      if (value && (isNaN(num) || num <= 0)) {
        return '正の数値を入力してください'
      }
      return null
    }
  },

  fileSize: (maxSizeMB: number) => ({
    custom: (value: File) => {
      if (value && value.size > maxSizeMB * 1024 * 1024) {
        return `ファイルサイズは${maxSizeMB}MB以下である必要があります`
      }
      return null
    }
  }),

  fileType: (allowedTypes: string[]) => ({
    custom: (value: File) => {
      if (value) {
        const fileExtension = value.name.split('.').pop()?.toLowerCase()
        if (!fileExtension || !allowedTypes.includes(fileExtension)) {
          return `許可されているファイル形式: ${allowedTypes.join(', ')}`
        }
      }
      return null
    }
  })
}

// 申請フォーム用のスキーマ
export const applicationSchema: ValidationSchema = {
  companyName: {
    required: true,
    minLength: 2,
    maxLength: 100
  },
  representativeName: {
    required: true,
    minLength: 2,
    maxLength: 50
  },
  email: {
    required: true,
    ...validationRules.email
  },
  phoneNumber: {
    ...validationRules.phone
  },
  planStartDate: {
    required: true,
    ...validationRules.date,
    ...validationRules.futureDate
  },
  targetEmployees: {
    required: true,
    ...validationRules.positiveNumber,
    custom: (value: any) => {
      const num = Number(value)
      if (value && (!Number.isInteger(num) || num > 1000)) {
        return '1-1000の整数を入力してください'
      }
      return null
    }
  }
}

// ユーザー登録用のスキーマ
export const registrationSchema: ValidationSchema = {
  email: {
    required: true,
    ...validationRules.email
  },
  password: {
    required: true,
    ...validationRules.password
  },
  confirmPassword: {
    required: true,
    custom: (value: string, data?: any) => {
      if (data && value !== data.password) {
        return 'パスワードが一致しません'
      }
      return null
    }
  },
  fullName: {
    required: true,
    minLength: 2,
    maxLength: 50
  },
  companyName: {
    required: true,
    minLength: 2,
    maxLength: 100
  }
}

// ファイルアップロード用のバリデーション
export function validateFile(file: File): string | null {
  const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx').split(',')

  // ファイルサイズチェック
  if (file.size > maxSize) {
    return `ファイルサイズは${Math.round(maxSize / 1024 / 1024)}MB以下である必要があります`
  }

  // ファイルタイプチェック
  const fileExtension = file.name.split('.').pop()?.toLowerCase()
  if (!fileExtension || !allowedTypes.includes(fileExtension)) {
    return `許可されているファイル形式: ${allowedTypes.join(', ')}`
  }

  return null
}