'use client'

import React, { useState, useEffect } from 'react'

interface SimplePdfViewerProps {
  base64Content: string
  filename: string
  fileType: string
  isOpen: boolean
  onClose: () => void
}

export default function SimplePdfViewer({ 
  base64Content, 
  filename, 
  fileType, 
  isOpen, 
  onClose 
}: SimplePdfViewerProps) {
  const [error, setError] = useState<string>('')
  const [isValidPdf, setIsValidPdf] = useState<boolean>(false)
  const [displayMethod, setDisplayMethod] = useState<'iframe' | 'object'>('iframe')

  useEffect(() => {
    if (base64Content) {
      validatePdfData(base64Content)
    }
  }, [base64Content])

  const validatePdfData = (data: string) => {
    try {
      // Base64データの基本検証
      if (!data || data.length < 100) {
        setError('ファイルデータが不完全です')
        return
      }

      // data URL形式の確認
      let base64String = data
      if (data.startsWith('data:')) {
        const parts = data.split(',')
        if (parts.length !== 2) {
          setError('不正なdata URL形式です')
          return
        }
        base64String = parts[1]
      }

      // Base64の形式チェック
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
      if (!base64Regex.test(base64String.replace(/\s/g, ''))) {
        setError('不正なBase64形式です')
        return
      }

      // PDFのマジックナンバーチェック
      try {
        const binaryString = atob(base64String.substring(0, 100))
        console.log('Decoded binary start:', binaryString.substring(0, 20))
        if (!binaryString.startsWith('%PDF-')) {
          console.warn('Invalid PDF magic number:', binaryString.substring(0, 10))
          setError('PDFファイルではありません')
          return
        }
        console.log('Valid PDF detected')
        setIsValidPdf(true)
        setError('')
      } catch (decodeError) {
        console.error('Base64 decode error:', decodeError)
        setError('Base64デコードに失敗しました')
      }
    } catch (err) {
      console.error('PDF validation error:', err)
      setError('ファイル検証中にエラーが発生しました')
    }
  }

  const getProcessedDataUrl = () => {
    if (!base64Content) {
      console.warn('No base64Content available')
      return ''
    }
    
    let result = ''
    if (base64Content.startsWith('data:')) {
      result = base64Content
      console.log('Using existing data URL')
    } else {
      result = `data:application/pdf;base64,${base64Content}`
      console.log('Created new data URL, length:', result.length)
    }
    
    console.log('Processed data URL preview:', result.substring(0, 100) + '...')
    return result
  }

  const isPDF = fileType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')
  const isImage = fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(filename)

  if (!isOpen) return null

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
          {error && (
            <div className="text-center p-8">
              <div className="text-red-600 mb-4">
                <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
                <p className="font-medium">ファイル表示エラー</p>
              </div>
              <p className="text-gray-600 text-sm mb-4">{error}</p>
              <div className="text-xs text-gray-500 bg-gray-100 p-3 rounded">
                <div>ファイル名: {filename}</div>
                <div>ファイルタイプ: {fileType}</div>
                <div>データ長: {base64Content ? base64Content.length : 0}</div>
                <div>データ開始: {base64Content ? base64Content.substring(0, 50) + '...' : 'なし'}</div>
              </div>
            </div>
          )}

          {!error && isPDF && isValidPdf && (
            <div className="flex flex-col items-center space-y-4">
              {/* 表示方法の切り替え */}
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setDisplayMethod('iframe')}
                  className={`px-3 py-1 rounded text-sm ${
                    displayMethod === 'iframe' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  iframe表示
                </button>
                <button
                  onClick={() => setDisplayMethod('object')}
                  className={`px-3 py-1 rounded text-sm ${
                    displayMethod === 'object' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  object表示
                </button>
              </div>

              {/* PDF表示エリア */}
              <div className="w-full max-w-4xl border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                {displayMethod === 'iframe' ? (
                  <iframe
                    src={getProcessedDataUrl()}
                    width="100%"
                    height="600px"
                    title={filename}
                    className="border-none bg-white"
                    onLoad={() => console.log('PDF iframe loaded successfully')}
                    onError={(e) => {
                      console.error('PDF iframe error:', e)
                      // 自動的にobject表示に切り替え
                      setDisplayMethod('object')
                    }}
                  />
                ) : (
                  <object
                    data={getProcessedDataUrl()}
                    type="application/pdf"
                    width="100%"
                    height="600px"
                    className="bg-white"
                    onLoad={() => console.log('PDF object loaded successfully')}
                  >
                    <div className="flex flex-col items-center justify-center h-full p-8">
                      <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                      </svg>
                      <p className="text-gray-600 text-center mb-4">
                        PDFの表示に対応していないブラウザです。<br/>
                        下記のボタンからPDFを開いてください。
                      </p>
                    </div>
                  </object>
                )}
              </div>
              
              {/* 代替PDF.js表示 */}
              <div className="w-full max-w-4xl">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span className="text-sm font-medium text-blue-900">PDFが表示されない場合</span>
                  </div>
                  <div className="text-sm text-blue-800 space-y-2">
                    <p>上記でPDFが正しく表示されない場合は、以下の代替方法をお試しください：</p>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          const dataUrl = getProcessedDataUrl()
                          const newWindow = window.open()
                          if (newWindow) {
                            newWindow.document.write(`
                              <html>
                                <head><title>${filename}</title></head>
                                <body style="margin:0;">
                                  <embed src="${dataUrl}" width="100%" height="100%" type="application/pdf">
                                </body>
                              </html>
                            `)
                          }
                        }}
                        className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        新しいタブで開く
                      </button>
                      <button
                        onClick={() => {
                          const dataUrl = getProcessedDataUrl()
                          window.open(dataUrl, '_blank')
                        }}
                        className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        直接表示
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center space-y-1">
                <div className="text-sm text-gray-600">
                  ※ ブラウザの内蔵PDFビューアーを使用しています
                </div>
                <div className="text-xs text-gray-500">
                  デバッグ情報: ファイル名={filename}, サイズ={base64Content.length}文字
                </div>
              </div>
            </div>
          )}

          {!error && isImage && (
            <div className="flex flex-col items-center">
              <div className="max-w-full max-h-[70vh] overflow-auto border border-gray-200 rounded-lg">
                <img
                  src={getProcessedDataUrl()}
                  alt={filename}
                  className="max-w-full h-auto"
                  onError={() => setError('画像の読み込みに失敗しました')}
                />
              </div>
            </div>
          )}

          {!error && !isPDF && !isImage && (
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
            href={getProcessedDataUrl()}
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