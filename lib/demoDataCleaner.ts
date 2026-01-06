/**
 * デモデータクリーナー
 * LocalStorageに保存されているデモデータを全て削除する
 */
export class DemoDataCleaner {
  
  // 削除対象のキー一覧
  private static readonly DEMO_STORAGE_KEYS = [
    'demoDocuments',
    'demoUser',
    'ai_prompt_templates',
    'ai_prompt_settings',
    'applicationInfo_demo-application-001',
    'workflow_demo-application-001',
    'applicationInfo_demo-application-002',
    'workflow_demo-application-002',
    'applicationInfo_demo-application-003',
    'workflow_demo-application-003',
    'applicationInfo_demo-application-004',
    'workflow_demo-application-004',
    'applicationInfo_demo-application-005',
    'workflow_demo-application-005',
  ]

  /**
   * 全てのデモデータを削除
   */
  static clearAllDemoData(): void {
    if (typeof window === 'undefined') return

    console.log('🧹 デモデータのクリア開始...')

    // 指定されたキーを削除
    this.DEMO_STORAGE_KEYS.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key)
        console.log(`✅ 削除: ${key}`)
      }
    })

    // 動的に生成されたキーもチェック（applicationInfo_*, workflow_*）
    const allKeys = Object.keys(localStorage)
    allKeys.forEach(key => {
      if (key.startsWith('applicationInfo_') || 
          key.startsWith('workflow_') ||
          key.startsWith('demo-')) {
        localStorage.removeItem(key)
        console.log(`✅ 削除: ${key}`)
      }
    })

    console.log('🎉 デモデータのクリア完了')
  }

  /**
   * 特定のカテゴリのデータのみ削除
   */
  static clearApplicationData(): void {
    if (typeof window === 'undefined') return

    const allKeys = Object.keys(localStorage)
    allKeys.forEach(key => {
      if (key.startsWith('applicationInfo_') || 
          key.startsWith('workflow_') ||
          key === 'demoDocuments') {
        localStorage.removeItem(key)
        console.log(`✅ 削除: ${key}`)
      }
    })
  }

  /**
   * AIプロンプト設定のみリセット
   */
  static resetAISettings(): void {
    if (typeof window === 'undefined') return

    localStorage.removeItem('ai_prompt_templates')
    localStorage.removeItem('ai_prompt_settings')
    console.log('🤖 AI設定をリセットしました')
  }

  /**
   * ユーザー情報のみ削除（ログアウト相当）
   */
  static clearUserData(): void {
    if (typeof window === 'undefined') return

    localStorage.removeItem('demoUser')
    console.log('👤 ユーザー情報を削除しました')
  }

  /**
   * LocalStorageの使用状況を確認
   */
  static getStorageInfo(): { totalKeys: number; demoKeys: string[]; size: string } {
    if (typeof window === 'undefined') {
      return { totalKeys: 0, demoKeys: [], size: '0 KB' }
    }

    const allKeys = Object.keys(localStorage)
    const demoKeys = allKeys.filter(key => 
      this.DEMO_STORAGE_KEYS.includes(key) || 
      key.startsWith('applicationInfo_') ||
      key.startsWith('workflow_') ||
      key.startsWith('demo-')
    )

    // 概算サイズ計算
    let totalSize = 0
    allKeys.forEach(key => {
      const value = localStorage.getItem(key) || ''
      totalSize += key.length + value.length
    })

    return {
      totalKeys: allKeys.length,
      demoKeys,
      size: `${(totalSize / 1024).toFixed(2)} KB`
    }
  }

  /**
   * デモ環境の初期化（完全リセット）
   */
  static initializeDemoEnvironment(): void {
    if (typeof window === 'undefined') return

    console.log('🔄 デモ環境を初期化中...')
    
    // 全てのデモデータを削除
    this.clearAllDemoData()
    
    // ページをリロードしてクリーンな状態にする
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1000)
    }
  }
}