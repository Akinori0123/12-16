'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { ApplicationInfo } from '@/types/deadline'
import { DeadlineCalculator } from '@/lib/deadlineUtils'
import { UploadService } from '@/lib/uploadService'
import { TestPdfGenerator } from '@/lib/testPdfGenerator'

interface ClientApplication extends ApplicationInfo {
  status: 'draft' | 'in_progress' | 'completed' | 'submitted' | 'approved' | 'rejected'
  documentCount: number
  lastUpdated: string
  clientEmail: string
  assignedConsultant: string
  notes?: string
}

interface Document {
  id: string
  document_type: string
  filename: string
  upload_status: 'pending' | 'uploading' | 'completed' | 'error'
  file_content?: string
  base64Content?: string
  fileType?: string
  upload_date?: string
  file_size?: string
  review_status?: 'not_reviewed' | 'approved' | 'rejected'
  review_notes?: string
}

export default function AdminReviewPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [applicationLoading, setApplicationLoading] = useState(true)
  const [application, setApplication] = useState<ClientApplication | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  const [comments, setComments] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  
  const router = useRouter()
  const params = useParams()
  const applicationId = params.id as string

  useEffect(() => {
    const checkUser = async () => {
      // セッションストレージから管理者認証情報をチェック
      const adminUser = sessionStorage.getItem('adminUser')
      if (adminUser) {
        const userData = JSON.parse(adminUser)
        setUser({
          id: userData.id,
          email: userData.email,
          aud: 'authenticated',
          role: 'authenticated',
          email_confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: { company_name: userData.company_name },
          identities: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as User)
        
        // 申請データを読み込み
        await loadApplicationData()
        setLoading(false)
        return
      }

      // デモ管理者チェック（バックアップ）
      const demoUser = localStorage.getItem('demoUser')
      if (demoUser) {
        const userData = JSON.parse(demoUser)
        
        // 管理者でない場合はアクセス拒否
        if (userData.email !== 'admin@tm-consultant.com') {
          router.push('/admin/login')
          return
        }
        
        setUser({
          id: userData.id,
          email: userData.email,
          aud: 'authenticated',
          role: 'authenticated',
          email_confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
          identities: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as User)
        
        // 申請データを読み込み
        await loadApplicationData()
        setLoading(false)
        return
      }

      // 通常のSupabase認証チェック（管理者のみ許可）
      const { data: { session } } = await supabase.auth.getSession()
      const sessionUser = session?.user
      
      if (sessionUser && sessionUser.email?.includes('tm-consultant.com')) {
        setUser(sessionUser)
        await loadApplicationData()
      } else {
        router.push('/admin/login')
      }
      
      setLoading(false)
    }

    checkUser()
  }, [router, applicationId])

  const loadApplicationData = async () => {
    setApplicationLoading(true)
    try {
      // 管理者認証チェック
      const adminUser = sessionStorage.getItem('adminUser')
      if (!adminUser) {
        console.error('No admin user found')
        setApplicationLoading(false)
        return
      }

      // 管理者APIエンドポイントから申請データを取得
      const response = await fetch(`/api/admin/applications/${applicationId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer admin-${JSON.parse(adminUser).email}`
        }
      })

      if (!response.ok) {
        console.error('Failed to fetch application:', response.status)
        // フォールバック: localStorageから読み込み
        loadApplicationDataFromLocalStorage()
        return
      }

      const data = await response.json()
      const app = data.application
      
      if (app) {
        // planEndDateが未設定の場合は計算する
        let planEndDate = app.plan_end_date
        if (!planEndDate && app.plan_start_date) {
          const deadline = DeadlineCalculator.calculateDeadlines(app.plan_start_date)
          planEndDate = deadline.planEndDate.toISOString().split('T')[0]
        }
        
        const formattedApp: ClientApplication = {
          id: app.id,
          companyName: app.company_name,
          representativeName: app.representative_name,
          planStartDate: app.plan_start_date,
          planEndDate: planEndDate,
          applicationDeadlineStart: app.application_deadline,
          applicationDeadlineEnd: app.application_deadline,
          isDeadlineOverridden: false,
          status: app.status,
          created_at: app.created_at,
          updated_at: app.updated_at,
          clientEmail: app.email || (app.user_profile?.id ? `user${app.user_profile.id.slice(0, 8)}@example.com` : 'unknown@example.com'),
          assignedConsultant: '管理者',
          documentCount: app.documents_count || 0,
          lastUpdated: app.updated_at || app.created_at || new Date().toISOString(),
          notes: app.review_comments || ''
        }
        
        setApplication(formattedApp)
        setSelectedStatus(formattedApp.status)
        
        // アップロードされた書類を読み込み
        loadDocuments()
      } else {
        console.error('Application not found in response')
        // フォールバック: localStorageから読み込み
        loadApplicationDataFromLocalStorage()
      }
    } catch (error) {
      console.error('申請データ読み込みエラー:', error)
      // エラー時はlocalStorageから読み込み
      loadApplicationDataFromLocalStorage()
    } finally {
      setApplicationLoading(false)
    }
  }

  const loadApplicationDataFromLocalStorage = () => {
    try {
      // 進行中の申請から該当IDを検索
      const inProgressApplications = localStorage.getItem('inProgressApplications')
      
      if (inProgressApplications) {
        let applications = []
        try {
          applications = JSON.parse(inProgressApplications)
          if (!Array.isArray(applications)) {
            applications = []
          }
        } catch (parseError) {
          console.warn('Failed to parse inProgress applications:', parseError)
          applications = []
        }
        
        const targetApplication = applications.find((app: any) => app && app.id === applicationId)
        
        if (targetApplication) {
          // planEndDateが未設定の場合は計算する
          let planEndDate = targetApplication.planEndDate
          if (!planEndDate && targetApplication.planStartDate) {
            const deadline = DeadlineCalculator.calculateDeadlines(targetApplication.planStartDate)
            planEndDate = deadline.planEndDate.toISOString().split('T')[0]
          }
          
          const formattedApp: ClientApplication = {
            ...targetApplication,
            planEndDate: planEndDate,
            clientEmail: targetApplication.userEmail || 'user@example.com',
            assignedConsultant: '管理者',
            documentCount: 0,
            lastUpdated: targetApplication.updated_at || targetApplication.created_at || new Date().toISOString(),
            notes: ''
          }
          
          setApplication(formattedApp)
          setSelectedStatus(formattedApp.status)
          
          // アップロードされた書類を読み込み
          loadDocuments()
        } else {
          // 申請が見つからない場合
          setApplication(null)
        }
      }
    } catch (error) {
      console.error('申請データ読み込みエラー:', error)
    } finally {
      setApplicationLoading(false)
    }
  }

  const loadDocuments = async () => {
    try {
      console.log('Loading documents for applicationId:', applicationId)
      
      // 管理者認証情報を取得
      const adminUser = sessionStorage.getItem('adminUser')
      if (!adminUser) {
        console.error('No admin user found for document loading')
        return
      }

      // 管理者用APIエンドポイントを使用してRLSをバイパス
      const response = await fetch(`/api/admin/applications/${applicationId}/documents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer admin-${JSON.parse(adminUser).email}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Admin documents API error:', response.status, errorText)
        // APIエラーの場合はLocalStorageにフォールバック
        loadDocumentsFromLocalStorage()
        return
      }

      const responseText = await response.text()
      const { documents: uploadedDocs } = JSON.parse(responseText)
      
      console.log('Found documents via admin API:', uploadedDocs.length, uploadedDocs)
      
      // 管理者APIから書類を取得する（件数が0でも処理を続行）
      console.log('Processing admin API documents, count:', uploadedDocs.length)
      
      if (uploadedDocs.length === 0) {
        console.log('No documents found via admin API for applicationId:', applicationId)
        // 空の配列を設定
        setDocuments([])
        return
      }
      
      // 各ドキュメントにBase64コンテンツを追加
      const documentsWithBase64: Document[] = await Promise.all(
        uploadedDocs.map(async (doc) => {
          // ファイルタイプを判定
          let fileType = doc.file_type || 'application/pdf'
          if (doc.file_name) {
            const ext = doc.file_name.toLowerCase().split('.').pop()
            switch (ext) {
              case 'jpg':
              case 'jpeg':
                fileType = 'image/jpeg'
                break
              case 'png':
                fileType = 'image/png'
                break
              case 'gif':
                fileType = 'image/gif'
                break
              case 'webp':
                fileType = 'image/webp'
                break
              default:
                fileType = 'application/pdf'
            }
          }

          // 管理者APIを使用してファイルコンテンツを取得
          let base64Content = ''
          if (doc.file_path) {
            console.log('Downloading file via admin API for document:', doc.id)
            try {
              const adminUser = sessionStorage.getItem('adminUser')
              if (adminUser) {
                const response = await fetch(`/api/admin/documents/${doc.id}/download?mode=base64`, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer admin-${JSON.parse(adminUser).email}`
                  }
                })

                if (response.ok) {
                  const result = await response.json()
                  if (result.success && result.base64Content) {
                    base64Content = result.base64Content
                    console.log('Successfully downloaded file via admin API, length:', result.base64Content.length)
                  } else {
                    console.warn('Admin API returned no content for document:', doc.id)
                  }
                } else {
                  console.warn('Admin API download failed:', response.status, await response.text())
                }
              }
            } catch (downloadError) {
              console.warn('Error during admin API file download:', doc.id, downloadError)
            }
          } else {
            console.warn('No file_path found for document:', doc.id, doc.file_name)
          }

          // Supabaseからのデータをフォーマット
          return {
            id: doc.id,
            document_type: doc.document_type,
            filename: doc.file_name,
            upload_status: doc.upload_status,
            upload_date: doc.created_at,
            file_size: doc.file_size || 'Unknown',
            base64Content: base64Content,
            fileType: fileType,
            file_content: doc.file_content || '',
            review_status: 'not_reviewed',
            review_notes: ''
          }
        })
      )
      
      console.log('Setting documents with base64:', documentsWithBase64.map(d => ({
        id: d.id, 
        filename: d.filename, 
        hasBase64: !!d.base64Content,
        base64Length: d.base64Content?.length || 0
      })))
      console.log('Final document count being set:', documentsWithBase64.length)
      
      setDocuments(documentsWithBase64)
    } catch (error) {
      console.error('書類データ読み込みエラー:', error)
      // エラーの場合はlocalStorageから読み込み（デモ用）
      loadDocumentsFromLocalStorage()
    }
  }

  const loadDocumentsFromLocalStorage = () => {
    try {
      // デモユーザーの場合: localStorageから取得
      const savedDocuments = localStorage.getItem(`applicationDocuments_${applicationId}`)
      let uploadedDocs = {}
      
      if (savedDocuments) {
        try {
          uploadedDocs = JSON.parse(savedDocuments)
          // parseされた結果がオブジェクトでない場合はデフォルトに戻す
          if (!uploadedDocs || typeof uploadedDocs !== 'object') {
            uploadedDocs = {}
          }
        } catch (parseError) {
          console.warn('Failed to parse saved documents:', parseError)
          uploadedDocs = {}
        }
      }
      
      const documentTypes = [
        { type: 'employment_rules', name: '就業規則（写し）' },
        { type: 'employment_contract_before', name: '雇用契約書（転換前）' },
        { type: 'employment_contract_after', name: '雇用契約書（転換後）' },
        { type: 'wage_ledger_before', name: '賃金台帳（転換前6ヶ月分）' },
        { type: 'wage_ledger_after', name: '賃金台帳（転換後6ヶ月分）' },
        { type: 'attendance_before', name: '出勤簿（転換前6ヶ月分）' },
        { type: 'attendance_after', name: '出勤簿（転換後6ヶ月分）' },
        { type: 'career_plan', name: 'キャリアアップ計画書（写し）' },
        { type: 'salary_transfer_proof', name: '賃金振込の証明書' }
      ]

      // 実際にアップロードされているドキュメントのみを表示
      const documentsData: Document[] = documentTypes
        .filter(docType => uploadedDocs[docType.type]) // アップロード済みのみフィルター
        .map((doc) => {
          const uploadInfo = uploadedDocs[doc.type]
          
          // uploadInfoが存在しない場合のデフォルト値
          if (!uploadInfo || typeof uploadInfo !== 'object') {
            return null
          }
          
          // ファイルタイプを判定
          let fileType = 'application/pdf'
          if (uploadInfo.filename && typeof uploadInfo.filename === 'string') {
            const ext = uploadInfo.filename.toLowerCase().split('.').pop()
            switch (ext) {
              case 'jpg':
              case 'jpeg':
                fileType = 'image/jpeg'
                break
              case 'png':
                fileType = 'image/png'
                break
              case 'gif':
                fileType = 'image/gif'
                break
              case 'webp':
                fileType = 'image/webp'
                break
              default:
                fileType = 'application/pdf'
            }
          }
          
          return {
            id: `${applicationId}-${doc.type}`,
            document_type: doc.name,
            filename: uploadInfo.filename || `${doc.name}.pdf`,
            upload_status: 'completed',
            upload_date: uploadInfo.uploadDate,
            file_size: uploadInfo.fileSize,
            base64Content: uploadInfo.base64Content,
            fileType: fileType,
            file_content: `【${doc.name}】\n\n実際のファイルコンテンツ:\n${uploadInfo.filename || doc.name}`,
            review_status: 'not_reviewed',
            review_notes: ''
          }
        })
        .filter((doc): doc is Document => doc !== null) // nullを除外
      
      console.log('Setting localStorage documents, count:', documentsData.length)
      setDocuments(documentsData)
      
      // デモ用：もしアップロードされた書類がない場合は実際のPDFを作成
      if (documentsData.length === 0) {
        console.log('No uploaded documents found, creating demo PDFs...')
        TestPdfGenerator.createDemoApplicationWithPdf(applicationId)
        
        // PDFが作成されたので再度読み込み
        const newSavedDocuments = localStorage.getItem(`applicationDocuments_${applicationId}`)
        if (newSavedDocuments) {
          const newUploadedDocs = JSON.parse(newSavedDocuments)
          const newDocumentsData = documentTypes
            .filter(docType => newUploadedDocs[docType.type])
            .map((doc) => {
              const uploadInfo = newUploadedDocs[doc.type]
              return {
                id: `${applicationId}-${doc.type}`,
                document_type: doc.name,
                filename: uploadInfo.filename,
                upload_status: 'completed' as const,
                upload_date: uploadInfo.uploadDate,
                file_size: uploadInfo.fileSize,
                base64Content: uploadInfo.base64Content,
                fileType: 'application/pdf',
                file_content: `【${doc.name}】\n\n実際のPDFファイルがアップロードされています。`,
                review_status: 'not_reviewed' as const,
                review_notes: ''
              }
            })
          console.log('Setting demo PDF documents, count:', newDocumentsData.length)
          setDocuments(newDocumentsData)
        } else {
          // フォールバック：プレースホルダーデータ
          const sampleDocs = documentTypes.slice(0, 3).map((doc) => {
            const uploadDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
            return {
              id: `${applicationId}-${doc.type}`,
              document_type: doc.name,
              filename: `${doc.name}.pdf`,
              upload_status: 'completed' as const,
              upload_date: uploadDate.toISOString(),
              file_size: `${Math.floor(Math.random() * 2000 + 500)}KB`,
              fileType: 'application/pdf',
              file_content: `【${doc.name}】\n\nサンプルデータです。実際のPDFプレビューをテストするには、アプリケーション画面からファイルをアップロードしてください。`,
              review_status: 'not_reviewed' as const,
              review_notes: ''
            }
          })
          console.log('Setting sample documents as final fallback, count:', sampleDocs.length)
          setDocuments(sampleDocs)
        }
      }
    } catch (error) {
      console.error('書類データ読み込みエラー:', error)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!application) return
    
    setActionLoading(true)
    try {
      // 管理者認証チェック
      const adminUser = sessionStorage.getItem('adminUser')
      if (!adminUser) {
        alert('管理者認証情報が見つかりません。ページを再読み込みしてください。')
        return
      }

      // Supabaseで申請ステータスを更新
      const response = await fetch(`/api/admin/applications/${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer admin-${JSON.parse(adminUser).email}`
        },
        body: JSON.stringify({
          status: newStatus,
          review_comments: comments
        })
      })

      if (!response.ok) {
        throw new Error('申請ステータスの更新に失敗しました')
      }

      // ローカル状態も更新
      setApplication(prev => prev ? { ...prev, status: newStatus as any, notes: comments } : null)
      
      const statusText = newStatus === 'completed' ? '審査完了' : newStatus === 'in_progress' ? '差し戻し' : getStatusText(newStatus)
      alert(`申請を${statusText}しました`)
      
      // コメントをクリア
      setComments('')
      
      // ダッシュボードに戻る
      setTimeout(() => {
        router.push('/admin/dashboard')
      }, 1000)
    } catch (error) {
      console.error('ステータス更新エラー:', error)
      alert('ステータスの更新中にエラーが発生しました')
    } finally {
      setActionLoading(false)
    }
  }

  const handleFilePreview = (document: Document) => {
    // documentとBase64コンテンツの安全チェック
    if (!document || typeof document !== 'object') {
      console.error('Invalid document object:', document)
      alert('ドキュメント情報が無効です。')
      return
    }
    
    console.log('Opening preview in new tab for:', document.filename)
    
    // 実際のBase64コンテンツがある場合のみプレビューを表示
    if (document.base64Content && typeof document.base64Content === 'string') {
      if (document.base64Content.length < 100) {
        console.warn('Base64 content too short:', document.base64Content)
        alert('ファイルデータが短すぎます。正しくアップロードされていない可能性があります。')
        return
      }
      
      // Data URLを作成
      let dataUrl = document.base64Content
      if (!document.base64Content.startsWith('data:')) {
        dataUrl = `data:${document.fileType || 'application/pdf'};base64,${document.base64Content}`
      }
      
      // 新しいタブでPDFを開く
      const newWindow = window.open()
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>${document.filename}</title>
              <style>
                body { margin: 0; padding: 0; background: #f0f0f0; }
                .header { background: white; padding: 10px 20px; border-bottom: 1px solid #ddd; }
                .filename { font-weight: bold; margin: 0; color: #333; }
                embed { width: 100%; height: calc(100vh - 60px); }
              </style>
            </head>
            <body>
              <div class="header">
                <p class="filename">${document.filename}</p>
              </div>
              <embed src="${dataUrl}" type="${document.fileType || 'application/pdf'}" />
            </body>
          </html>
        `)
        console.log('PDF opened in new tab successfully')
      } else {
        alert('新しいタブを開けませんでした。ブラウザのポップアップ設定を確認してください。')
      }
    } else {
      console.error('No base64 content available for document:', document)
      alert('ファイル内容が見つかりません。実際のファイルがアップロードされていない可能性があります。')
    }
  }


  const handleFileDownload = async (doc: Document) => {
    try {
      console.log('Starting file download for document:', doc.id)
      
      const adminUser = sessionStorage.getItem('adminUser')
      if (!adminUser) {
        alert('管理者認証情報が見つかりません。')
        return
      }

      const response = await fetch(`/api/admin/documents/${doc.id}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer admin-${JSON.parse(adminUser).email}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Download failed:', response.status, errorText)
        alert('ファイルのダウンロードに失敗しました。')
        return
      }

      // ファイルをBlob として取得
      const blob = await response.blob()
      
      // ダウンロード用のリンクを作成
      const url = window.URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = doc.filename || `document_${doc.id}`
      
      // 自動ダウンロードを開始
      window.document.body.appendChild(link)
      link.click()
      
      // クリーンアップ
      window.document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      console.log('File download completed successfully')
    } catch (error) {
      console.error('Download error:', error)
      alert('ファイルのダウンロード中にエラーが発生しました。')
    }
  }


  const getUploadProgress = () => {
    const uploaded = documents.filter(doc => doc.upload_status === 'completed').length
    const total = documents.length
    return { uploaded, total, percentage: total > 0 ? Math.round((uploaded / total) * 100) : 0 }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'submitted': 'bg-purple-100 text-purple-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string) => {
    const texts = {
      'draft': '下書き',
      'in_progress': '書類提出中',
      'completed': '完了',
      'submitted': '審査待ち',
      'approved': '承認済み',
      'rejected': '却下'
    }
    return texts[status as keyof typeof texts] || status
  }

  if (loading || applicationLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">管理者権限が必要です</h2>
          <p className="text-gray-600 mb-6">このページにアクセスするには管理者としてログインが必要です。</p>
          <button
            onClick={() => router.push('/admin/login')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            管理者ログインページへ
          </button>
        </div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">申請が見つかりません</h2>
          <p className="text-gray-600 mb-6">指定された申請IDの申請データが見つかりませんでした。</p>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            管理者ダッシュボードに戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className="w-8 h-8 bg-purple-600 rounded-lg mr-3 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">申請詳細レビュー</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">管理者: {user.email}</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* 申請基本情報 */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">{application.companyName}</h2>
              <p className="text-gray-600">申請ID: {application.id}</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
                {getStatusText(application.status)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">企業情報</h3>
                <div className="mt-2 space-y-2">
                  <p><span className="font-medium">代表者:</span> {application.representativeName}</p>
                  <p><span className="font-medium">担当者メール:</span> {application.clientEmail}</p>
                  <p><span className="font-medium">担当コンサルタント:</span> {application.assignedConsultant}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">申請詳細</h3>
                <div className="mt-2 space-y-2">
                  <p><span className="font-medium">正社員転換実施日:</span> {DeadlineCalculator.formatDateJapanese(new Date(application.planStartDate))}</p>
                  <p><span className="font-medium">申請期限:</span> {
                    (() => {
                      const deadline = DeadlineCalculator.calculateDeadlines(application.planStartDate)
                      return `${DeadlineCalculator.formatDateJapanese(deadline.applicationDeadlineStart)} ～ ${DeadlineCalculator.formatDateJapanese(deadline.applicationDeadlineEnd)}`
                    })()
                  }</p>
                  <p><span className="font-medium">最終更新:</span> {new Date(application.lastUpdated).toLocaleDateString('ja-JP')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* 提出書類一覧 */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">提出書類詳細</h3>
          
          <div className="space-y-4">
            {documents.length > 0 ? (
              documents.map((doc) => (
                <div key={doc.id} className={`border-2 rounded-lg p-4 transition-all ${
                  doc.upload_status === 'completed' ? 'border-green-200 bg-green-50' :
                  doc.upload_status === 'error' ? 'border-red-200 bg-red-50' :
                  'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h4 className="font-medium text-gray-900 mr-3">{doc.document_type}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          doc.upload_status === 'completed' ? 'bg-green-100 text-green-800' :
                          doc.upload_status === 'error' ? 'bg-red-100 text-red-800' :
                          doc.upload_status === 'uploading' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {doc.upload_status === 'completed' ? 'アップロード済み' :
                           doc.upload_status === 'error' ? 'エラー' :
                           doc.upload_status === 'uploading' ? 'アップロード中' : '未アップロード'}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{doc.filename}</p>
                      
                      {doc.upload_status === 'completed' && (
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>アップロード日時: {new Date(doc.upload_date!).toLocaleString('ja-JP')}</div>
                          <div>ファイルサイズ: {doc.file_size}</div>
                        </div>
                      )}
                    </div>
                    
                    {doc.upload_status === 'completed' && (
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleFilePreview(doc)}
                          className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                          </svg>
                          プレビュー
                        </button>
                        <button
                          onClick={() => handleFileDownload(doc)}
                          className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                          </svg>
                          ダウンロード
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                まだ書類がアップロードされていません
              </div>
            )}
          </div>
        </div>

        {/* 申請審査 - 審査待ちまたはreview状態のときに表示 */}
        {(application.status === 'submitted' || application.status === 'review') && (
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">申請審査</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  審査コメント
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="審査結果やコメントを入力してください..."
                />
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => handleStatusUpdate('completed')}
                  disabled={actionLoading}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  {actionLoading ? '処理中...' : '審査完了'}
                </button>
                
                <button
                  onClick={() => {
                    if (!comments.trim()) {
                      alert('差し戻しの場合はコメントの入力が必要です。')
                      return
                    }
                    handleStatusUpdate('in_progress')
                  }}
                  disabled={actionLoading}
                  className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                  {actionLoading ? '処理中...' : '差し戻し'}
                </button>
                
                <button
                  onClick={() => router.push('/admin/dashboard')}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 font-medium"
                >
                  ダッシュボードに戻る
                </button>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  )
}