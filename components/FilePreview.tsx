'use client'

import React, { useState, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

// PDF.js workerを安全に設定

interface FilePreviewProps {
  base64Content: string
  filename: string
  fileType: string
  isOpen: boolean
  onClose: () => void
}

export default function FilePreview({ 
  base64Content, 
  filename, 
  fileType, 
  isOpen, 
  onClose 
}: FilePreviewProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [workerInitialized, setWorkerInitialized] = useState<boolean>(false)

  // PDF.js workerを安全に初期化
  useEffect(() => {
    if (typeof window !== 'undefined' && !workerInitialized) {
      try {
        pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
        setWorkerInitialized(true)
      } catch (err) {
        console.warn('PDF worker initialization failed:', err)
      }
    }
  }, [workerInitialized])

  if (!isOpen) return null

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
    setError('')
  }

  const onDocumentLoadError = (error: Error) => {
    setLoading(false)
    setError('PDFの読み込みに失敗しました')
    console.error('PDF load error:', error)
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
              {!workerInitialized && (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">PDF viewer を初期化中...</span>
                </div>
              )}
              
              {workerInitialized && loading && (
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

              {!loading && !error && workerInitialized && (
                <>
                  <Document
                    file={base64Content}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">PDFを読み込み中...</span>
                      </div>
                    }
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={1.2}
                      loading={
                        <div className="flex items-center justify-center p-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                      }
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
                </>
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