import { supabase } from './supabase'

// Supabase設定の確認用
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
import { Document, FileUploadData } from '@/types/database'

export interface UploadResult {
  success: boolean
  document?: Document
  error?: string
}

export class UploadService {
  // ファイルをSupabase Storageにアップロード
  static async uploadFileToStorage(file: File, applicationId: string, documentType: string): Promise<{ path: string | null; error: string | null }> {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${applicationId}/${documentType}/${Date.now()}.${fileExt}`
      
      const { error } = await supabase.storage
        .from('documents')
        .upload(fileName, file)

      if (error) {
        console.error('Storage upload error:', error)
        return { path: null, error: error.message }
      }

      return { path: fileName, error: null }
    } catch (error) {
      console.error('Upload error:', error)
      return { path: null, error: error instanceof Error ? error.message : 'アップロードエラーが発生しました' }
    }
  }

  // データベースにドキュメント情報を保存
  static async saveDocumentMetadata(
    applicationId: string, 
    documentType: string,
    file: File, 
    filePath: string
  ): Promise<{ document: Document | null; error: string | null }> {
    try {
      const documentData = {
        application_id: applicationId,
        document_type: documentType,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        upload_status: 'completed'
      }

      console.log('🔄 Saving document metadata to Supabase:', {
        applicationId,
        documentType,
        fileName: file.name,
        filePath,
        fileSize: file.size,
        mimeType: file.type
      })

      const { data, error } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single()

      if (error) {
        console.error('❌ Database save error:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return { document: null, error: error.message }
      }

      console.log('✅ Successfully saved document metadata:', {
        documentId: data.id,
        applicationId: data.application_id,
        documentType: data.document_type,
        fileName: data.file_name,
        createdAt: data.created_at
      })

      return { document: data, error: null }
    } catch (error) {
      console.error('❌ Save metadata error:', error)
      return { document: null, error: error instanceof Error ? error.message : 'データベース保存エラーが発生しました' }
    }
  }

  // ファイルをBase64に変換
  static convertToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      // ファイルタイプの検証
      if (!file || file.size === 0) {
        reject(new Error('無効なファイルです'))
        return
      }

      console.log('Converting file to Base64:', {
        name: file.name,
        type: file.type,
        size: file.size
      })

      const reader = new FileReader()
      reader.readAsDataURL(file)
      
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          console.log('Base64 conversion successful, length:', reader.result.length)
          // data: URLの形式で返す（data:application/pdf;base64,... など）
          resolve(reader.result)
        } else {
          console.error('FileReader result is not a string:', typeof reader.result)
          reject(new Error('ファイルの読み込みに失敗しました'))
        }
      }
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error)
        reject(new Error('ファイルの読み込みでエラーが発生しました'))
      }
    })
  }


  // メインのアップロード処理
  static async uploadDocument(
    applicationId: string,
    documentType: string,
    file: File,
    onProgress?: (status: 'uploading' | 'completed' | 'error') => void
  ): Promise<UploadResult> {
    console.log('🚀 Starting document upload:', {
      applicationId,
      documentType,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })

    // UUID形式チェック
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(applicationId)
    
    if (!isUUID) {
      console.error('❌ Invalid applicationId format:', applicationId)
      return { 
        success: false, 
        error: '無効な申請IDです。新しい申請を作成してください。' 
      }
    }

    try {
      onProgress?.('uploading')

      // 1. ファイルをStorageにアップロード
      console.log('🔄 Step 1: Uploading file to Supabase Storage...')
      const { path, error: uploadError } = await this.uploadFileToStorage(file, applicationId, documentType)
      
      if (uploadError || !path) {
        console.error('❌ Storage upload failed:', uploadError)
        onProgress?.('error')
        return { success: false, error: uploadError || 'ファイルアップロードに失敗しました' }
      }
      
      console.log('✅ Step 1 completed: File uploaded to storage path:', path)

      // 2. メタデータをデータベースに保存
      console.log('🔄 Step 2: Saving document metadata to database...')
      const { document, error: dbError } = await this.saveDocumentMetadata(applicationId, documentType, file, path)
      
      if (dbError || !document) {
        console.error('❌ Database save failed:', dbError)
        onProgress?.('error')
        // アップロードしたファイルを削除
        console.log('🔄 Cleaning up uploaded file due to database error...')
        await supabase.storage.from('documents').remove([path])
        return { success: false, error: dbError || 'データベース保存に失敗しました' }
      }

      console.log('✅ Step 2 completed: Document metadata saved to database')
      
      // 3. アップロード直後にテスト検索を実行
      console.log('🔄 Step 3: Verifying document can be retrieved...')
      try {
        const { documents: verifyDocs, error: verifyError } = await this.getApplicationDocuments(applicationId)
        console.log('Verification search result:', {
          found: verifyDocs.length,
          documents: verifyDocs.map(d => ({ id: d.id, fileName: d.file_name, documentType: d.document_type })),
          error: verifyError
        })
        
        const justUploadedDoc = verifyDocs.find(d => d.id === document.id)
        if (justUploadedDoc) {
          console.log('✅ Step 3 completed: Just uploaded document found in verification search')
        } else {
          console.warn('⚠️  Step 3 warning: Just uploaded document not found in verification search')
        }
      } catch (verifyError) {
        console.error('❌ Step 3 error: Verification search failed:', verifyError)
      }
      
      console.log('🎉 Upload completed successfully:', {
        documentId: document.id,
        applicationId: document.application_id
      })

      onProgress?.('completed')
      return { success: true, document }
    } catch (error) {
      console.error('❌ Upload document error:', error)
      onProgress?.('error')
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'アップロード処理でエラーが発生しました' 
      }
    }
  }

  // 特定のアプリケーションのドキュメント一覧を取得
  static async getApplicationDocuments(applicationId: string): Promise<{ documents: Document[]; error: string | null }> {
    try {
      console.log('Fetching documents from Supabase for applicationId:', applicationId)
      console.log('ApplicationId type:', typeof applicationId, 'value:', JSON.stringify(applicationId))
      
      // Supabaseからドキュメントを取得（通常のクライアント使用）
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })

      console.log('Supabase query result:', { 
        data, 
        error, 
        dataLength: data?.length,
        applicationId,
        query: `SELECT * FROM documents WHERE application_id = '${applicationId}' ORDER BY created_at DESC`
      })

      if (error) {
        console.error('Fetch documents error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return { documents: [], error: error.message }
      }

      if (!data || data.length === 0) {
        console.warn('No documents found for applicationId:', applicationId)
        console.log('Checking if any documents exist in the table...')
        
        // デバッグ用：全ての書類をチェック
        const { data: allDocs, error: allError } = await supabase
          .from('documents')
          .select('application_id, id, document_type, created_at, file_name')
          .order('created_at', { ascending: false })
          .limit(50)
        
        console.log('All documents in table (first 50):', { allDocs, allError })
        
        // さらに詳細：同じapplicationIdで別の形式で検索
        console.log('Trying alternative queries...')
        
        // 1. 大文字小文字を無視した検索
        const { data: caseInsensitive, error: caseError } = await supabase
          .from('documents')
          .select('*')
          .ilike('application_id', applicationId)
          .limit(10)
        
        console.log('Case-insensitive search result:', { caseInsensitive, caseError })
        
        // 2. 部分一致検索（最初の8文字）
        const partialId = applicationId.substring(0, 8)
        const { data: partial, error: partialError } = await supabase
          .from('documents')
          .select('*')
          .ilike('application_id', `${partialId}%`)
          .limit(10)
        
        console.log('Partial ID search result:', { partial, partialError, searchId: partialId })
      }

      console.log('Successfully fetched documents from Supabase:', data?.length || 0, 'documents')
      return { documents: data || [], error: null }
    } catch (error) {
      console.error('Get documents error:', error)
      return { 
        documents: [], 
        error: error instanceof Error ? error.message : 'ドキュメント取得エラーが発生しました' 
      }
    }
  }

  // ドキュメントを削除
  static async deleteDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // ドキュメント情報を取得
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('file_path')
        .eq('id', documentId)
        .single()

      if (fetchError || !document) {
        return { success: false, error: 'ドキュメント情報の取得に失敗しました' }
      }

      // Storageからファイルを削除
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.file_path])

      if (storageError) {
        console.error('Storage delete error:', storageError)
        // ストレージの削除に失敗してもDBから削除は続行
      }

      // データベースから削除
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)

      if (dbError) {
        console.error('Database delete error:', dbError)
        return { success: false, error: dbError.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Delete document error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'ドキュメント削除エラーが発生しました' 
      }
    }
  }

  // ファイルのダウンロードURLを取得
  static async getDownloadUrl(filePath: string): Promise<{ url: string | null; error: string | null }> {
    try {
      // SupabaseからダウンロードURL取得
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600) // 1時間有効

      if (error) {
        console.error('Create signed URL error:', error)
        return { url: null, error: error.message }
      }

      return { url: data.signedUrl, error: null }
    } catch (error) {
      console.error('Get download URL error:', error)
      return { 
        url: null, 
        error: error instanceof Error ? error.message : 'ダウンロードURL生成エラーが発生しました' 
      }
    }
  }

  // ファイルをBase64形式で取得（プレビュー用）
  static async getFileAsBase64(filePath: string): Promise<{ base64Content: string | null; error: string | null }> {
    try {

      // Supabase Storageからファイルをダウンロード
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath)

      if (error) {
        console.error('File download error:', error)
        return { base64Content: null, error: error.message }
      }

      if (!data) {
        return { base64Content: null, error: 'ファイルが見つかりません' }
      }

      // BlobをArrayBufferに変換してからBase64に変換（バイナリファイル対応）
      const arrayBuffer = await data.arrayBuffer()
      const base64String = this.arrayBufferToBase64(arrayBuffer)
      
      // data:URLの形式で返す（MIMEタイプを推定）
      const mimeType = data.type || 'application/octet-stream'
      const base64Content = `data:${mimeType};base64,${base64String}`
      
      return { base64Content, error: null }
    } catch (error) {
      console.error('Get file as base64 error:', error)
      return { 
        base64Content: null, 
        error: error instanceof Error ? error.message : 'ファイル取得エラーが発生しました' 
      }
    }
  }

  // BlobをBase64に変換するヘルパーメソッド（バイナリセーフ）
  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(blob)
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Base64変換に失敗しました'))
        }
      }
      reader.onerror = () => reject(new Error('Blobの読み込みに失敗しました'))
    })
  }

  // ArrayBufferをBase64に変換するヘルパーメソッド（バイナリセーフ）
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    
    // より安全なBase64変換（日本語文字対応）
    if (typeof window !== 'undefined' && window.btoa) {
      // ブラウザ環境でのより安全な変換
      let binary = ''
      const len = bytes.byteLength
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      
      try {
        return window.btoa(binary)
      } catch (error) {
        console.warn('btoa failed, falling back to manual base64 conversion:', error)
        // btoaが失敗した場合の代替実装
        return this.manualBase64Encode(bytes)
      }
    } else {
      // Node.js環境またはbtoaが利用できない場合
      return this.manualBase64Encode(bytes)
    }
  }

  // 手動でBase64エンコードする代替実装
  private static manualBase64Encode(bytes: Uint8Array): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    let result = ''
    
    for (let i = 0; i < bytes.length; i += 3) {
      const a = bytes[i]
      const b = i + 1 < bytes.length ? bytes[i + 1] : 0
      const c = i + 2 < bytes.length ? bytes[i + 2] : 0
      
      const combined = (a << 16) | (b << 8) | c
      
      result += chars[(combined >> 18) & 63]
      result += chars[(combined >> 12) & 63]
      result += i + 1 < bytes.length ? chars[(combined >> 6) & 63] : '='
      result += i + 2 < bytes.length ? chars[combined & 63] : '='
    }
    
    return result
  }

  // AIチェックを開始する（手動実行）
  static async startAICheck(documentId: string): Promise<{ success: boolean; error?: string; analysis?: any; documentName?: string; checkedAt?: string }> {
    try {
      // 現在のユーザーのセッショントークンを取得
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.warn('No valid session found for AI check')
        return { success: false, error: 'ログインが必要です' }
      }

      const response = await fetch(`/api/documents/${documentId}/ai-check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('AI check request failed:', errorData)
        return { success: false, error: errorData.error || 'AIチェックに失敗しました' }
      }

      const responseData = await response.json()
      console.log('AI check completed successfully for document:', documentId)
      return { 
        success: true, 
        analysis: responseData.analysis,
        documentName: responseData.documentName,
        checkedAt: responseData.checkedAt
      }
    } catch (error) {
      console.error('Failed to start AI check:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'AIチェック中にエラーが発生しました' 
      }
    }
  }
}