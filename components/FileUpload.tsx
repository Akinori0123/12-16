'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'

interface FileUploadProps {
  documentType: string
  onFileSelect: (file: File) => void
  uploadState: { status: 'pending' | 'uploading' | 'completed' | 'error', fileName?: string }
  isReadOnly?: boolean
  acceptedFileTypes?: string
  maxFileSize?: number
}

export default function FileUpload({ 
  documentType,
  onFileSelect, 
  uploadState,
  isReadOnly = false,
  acceptedFileTypes = 'pdf,jpg,jpeg,png',
  maxFileSize = 10485760 // 10MB in bytes
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const acceptedTypes = acceptedFileTypes.split(',').map(type => `.${type.trim()}`)
  const maxSize = Math.round(maxFileSize / 1024 / 1024) // Convert bytes to MB

  const validateFile = (file: File): string | null => {
    // ファイルサイズチェック
    if (file.size > maxFileSize) {
      return `ファイルサイズは${maxSize}MB以下にしてください`
    }

    // ファイル形式チェック
    const fileExtension = file.name.toLowerCase().split('.').pop()
    const allowedExtensions = acceptedTypes.map(type => type.toLowerCase().replace('.', ''))
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return `対応ファイル形式: ${acceptedTypes.join(', ')}`
    }

    return null
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    setError('')

    if (isReadOnly) return

    const files = e.dataTransfer.files
    if (files && files[0]) {
      const file = files[0]
      const validationError = validateFile(file)
      
      if (validationError) {
        setError(validationError)
        return
      }

      onFileSelect(file)
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    setError('')

    if (isReadOnly) return

    const files = e.target.files
    if (files && files[0]) {
      const file = files[0]
      const validationError = validateFile(file)
      
      if (validationError) {
        setError(validationError)
        // inputの値をリセットしてエラー後も再選択可能にする
        e.target.value = ''
        return
      }

      onFileSelect(file)
      // 同じファイルでも再選択できるようにinputの値をリセット
      e.target.value = ''
    }
  }

  const openFileDialog = () => {
    if (!isReadOnly && fileInputRef.current) {
      // ファイル選択ダイアログを開く前にinputの値をリセット
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const getStatusColor = () => {
    switch (uploadState.status) {
      case 'uploading':
        return 'border-blue-400 bg-blue-50'
      case 'completed':
        return 'border-green-400 bg-green-50'
      case 'error':
        return 'border-red-400 bg-red-50'
      default:
        return dragActive 
          ? 'border-blue-400 bg-blue-50' 
          : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
    }
  }

  const renderContent = () => {
    if (uploadState.status === 'uploading') {
      return (
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4">
            <svg className="animate-spin w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-blue-600 font-medium">アップロード中...</p>
          <p className="text-blue-500 text-sm">{uploadState.fileName}</p>
        </div>
      )
    }

    if (uploadState.status === 'completed') {
      return (
        <div className="text-center">
          <svg className="w-12 h-12 text-green-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="text-green-600 font-medium mb-2">アップロード完了</p>
          <p className="text-green-700 text-sm mb-4">{uploadState.fileName}</p>
          <button 
            onClick={openFileDialog}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            別のファイルを選択
          </button>
        </div>
      )
    }

    if (uploadState.status === 'error') {
      return (
        <div className="text-center">
          <svg className="w-12 h-12 text-red-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="text-red-600 font-medium mb-2">アップロードエラー</p>
          <p className="text-red-700 text-sm mb-4">再度お試しください</p>
          <button 
            onClick={openFileDialog}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            再アップロード
          </button>
        </div>
      )
    }

    return (
      <div className="text-center">
        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
        </svg>
        <p className="text-gray-600 mb-2">ファイルをドラッグ＆ドロップまたはクリックしてアップロード</p>
        <p className="text-gray-500 text-sm mb-4">
          {acceptedTypes.join(', ')}形式のファイルをアップロードしてください（最大{maxSize}MB）
        </p>
        <button 
          onClick={openFileDialog}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            isReadOnly 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          disabled={isReadOnly}
        >
          ファイルを選択
        </button>
      </div>
    )
  }

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-lg p-8 transition-colors ${getStatusColor()} ${
          isReadOnly ? 'cursor-not-allowed opacity-60' : 
          uploadState.status === 'completed' ? '' : 'cursor-pointer'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={uploadState.status === 'completed' ? undefined : openFileDialog}
      >
        {renderContent()}
        
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          accept={acceptedTypes.join(',')}
          disabled={isReadOnly}
        />
      </div>
      
      {error && (
        <div className="mt-2 text-red-600 text-sm bg-red-50 border border-red-200 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  )
}