'use client'

import React, { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'

// react-pdfを動的インポートしてSSRエラーを回避
const Document = dynamic(() => import('react-pdf').then(mod => mod.Document), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-2 text-gray-600">PDF viewer を読み込み中...</span>
    </div>
  )
})

const Page = dynamic(() => import('react-pdf').then(mod => mod.Page), {
  ssr: false
})

interface FilePreviewSafeProps {
  base64Content: string
  filename: string
  fileType: string
  isOpen: boolean
  onClose: () => void
}

export default function FilePreviewSafe({ 
  base64Content, 
  filename, 
  fileType, 
  isOpen, 
  onClose 
}: FilePreviewSafeProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [pdfWorkerReady, setPdfWorkerReady] = useState<boolean>(false)

  // PDF.js workerを動的に設定
  useEffect(() => {
    if (typeof window !== 'undefined' && !pdfWorkerReady) {
      const setupPdfWorker = async () => {
        try {
          const { pdfjs } = await import('react-pdf')
          
          // 安定したバージョンのworkerを使用
          const workerSources = [
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
            `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`,
            `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
          ]
          
          pdfjs.GlobalWorkerOptions.workerSrc = workerSources[0]
          console.log('PDF worker configured:', {
            version: pdfjs.version,
            workerSrc: workerSources[0]
          })
          
          setPdfWorkerReady(true)
        } catch (err) {
          console.error('PDF worker setup failed:', err)
          setError('PDFビューアーの初期化に失敗しました')
          setPdfWorkerReady(true) // エラーでも次に進む
        }
      }
      setupPdfWorker()
    }
  }, [pdfWorkerReady])

  if (!isOpen) return null

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('PDF loaded successfully, pages:', numPages)
    setNumPages(numPages)
    setLoading(false)
    setError('')
  }

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error details:', error)
    setLoading(false)
    setError('PDFファイルの読み込みに失敗しました。ファイル形式を確認してください。')
  }

  // Base64データの形式を検証・修正
  const getPdfDataUrl = (base64Content: string): string => {
    try {
      if (!base64Content || typeof base64Content !== 'string') {
        throw new Error('無効なBase64データです')
      }
      
      console.log('Processing Base64 data:', {
        length: base64Content.length,
        hasDataPrefix: base64Content.startsWith('data:'),
        type: base64Content.substring(0, 30)
      })
      
      // data: プレフィックスがない場合は追加
      if (!base64Content.startsWith('data:')) {
        const processedData = `data:application/pdf;base64,${base64Content}`
        console.log('Added data prefix, new length:', processedData.length)
        return processedData
      }
      
      // MIMEタイプが間違っている場合は修正
      if (base64Content.startsWith('data:') && !base64Content.includes('application/pdf')) {
        const base64Part = base64Content.split(',')[1]
        if (base64Part) {
          const correctedData = `data:application/pdf;base64,${base64Part}`
          console.log('Corrected MIME type')
          return correctedData
        }
      }
      
      // 既にdata URLの場合はそのまま返す
      console.log('Using original data URL')
      return base64Content
    } catch (err) {
      console.error('Base64 processing error:', err)
      // フォールバック：最低限のdata URL形式を作成
      return `data:application/pdf;base64,${base64Content}`
    }
  }

  const isPDF = fileType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')
  const isImage = fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(filename)

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1))
  }

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl max-h-[95vh] w-full mx-4 flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{filename}</h3>
            <p className="text-sm text-gray-500">ファイルプレビュー</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-auto p-6">
          {isPDF && (
            <div className="flex flex-col items-center">
              {!pdfWorkerReady && (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">PDF viewer を初期化中...</span>
                </div>
              )}
              
              {pdfWorkerReady && loading && !error && (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">PDFを読み込み中...</span>
                </div>
              )}
              
              {error && (
                <div className="text-center p-8">
                  <div className="text-red-600 mb-4">
                    <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                    </svg>
                    <p className="font-medium">{error}</p>
                  </div>
                  <p className="text-gray-600 text-sm">
                    PDFファイルの形式が正しくないか、破損している可能性があります。
                  </p>
                </div>
              )}

              {pdfWorkerReady && !loading && !error && (
                <Suspense fallback={
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">PDFを読み込み中...</span>
                  </div>
                }>
                  <Document
                    file={{
                      url: getPdfDataUrl(base64Content)
                    }}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">PDF解析中...</span>
                      </div>
                    }
                    error={
                      <div className="text-center p-8">
                        <div className="text-red-600 mb-4">
                          <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                          </svg>
                          <p className="font-medium">PDFの読み込みエラー</p>
                        </div>
                        <p className="text-gray-600 text-sm">
                          ファイルが破損している可能性があります。
                        </p>
                      </div>
                    }
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={1.2}
                    />
                  </Document>

                  {/* ページ制御 */}
                  {numPages > 1 && (
                    <div className="flex items-center space-x-4 mt-4 p-3 bg-gray-100 rounded-lg">
                      <button
                        onClick={goToPrevPage}
                        disabled={pageNumber <= 1}
                        className="px-3 py-1 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        前へ
                      </button>
                      <span className="text-sm text-gray-700">
                        {pageNumber} / {numPages}
                      </span>
                      <button
                        onClick={goToNextPage}
                        disabled={pageNumber >= numPages}
                        className="px-3 py-1 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        次へ
                      </button>
                    </div>
                  )}
                </Suspense>
              )}
            </div>
          )}

          {isImage && (
            <div className="flex flex-col items-center">
              <div className="max-w-full max-h-[70vh] overflow-auto border border-gray-200 rounded-lg">
                <img
                  src={base64Content}
                  alt={filename}
                  className="max-w-full h-auto"
                  onError={(e) => {
                    console.error('Image load error:', e)
                    setError('画像の読み込みに失敗しました')
                  }}
                />
              </div>
              
              {error && (
                <div className="text-center p-4 mt-4">
                  <div className="text-red-600">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                    </svg>
                    <p className="font-medium">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isPDF && !isImage && (
            <div className="text-center p-8">
              <div className="text-gray-500 mb-4">
                <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
                <p className="font-medium">プレビューできないファイル形式です</p>
              </div>
              <p className="text-gray-600 text-sm">
                {filename}のプレビューには対応していません。ダウンロードしてご確認ください。
              </p>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            閉じる
          </button>
          <a
            href={base64Content}
            download={filename}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            ダウンロード
          </a>
        </div>
      </div>
    </div>
  )
}