// テスト用PDF生成ユーティリティ
export class TestPdfGenerator {
  // 最小限の有効なPDFを生成（Base64形式）
  static generateMinimalPdf(content: string = 'テストPDFドキュメント'): string {
    // 最小限のPDF構造
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/Contents 5 0 R
>>
endobj

4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

5 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(${content}) Tj
ET
endstream
endobj

xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000062 00000 n 
0000000120 00000 n 
0000000271 00000 n 
0000000342 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
436
%%EOF`

    // PDFコンテンツをBase64に変換（日本語対応）
    try {
      return btoa(pdfContent)
    } catch (error) {
      console.warn('btoa failed for PDF content, using manual encoding:', error)
      // btoaが失敗した場合の代替実装
      return TestPdfGenerator.manualBase64Encode(pdfContent)
    }
  }

  // 手動でBase64エンコードする代替実装
  private static manualBase64Encode(str: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    let result = ''
    
    for (let i = 0; i < str.length; i += 3) {
      const a = str.charCodeAt(i)
      const b = i + 1 < str.length ? str.charCodeAt(i + 1) : 0
      const c = i + 2 < str.length ? str.charCodeAt(i + 2) : 0
      
      const combined = (a << 16) | (b << 8) | c
      
      result += chars[(combined >> 18) & 63]
      result += chars[(combined >> 12) & 63]
      result += i + 1 < str.length ? chars[(combined >> 6) & 63] : '='
      result += i + 2 < str.length ? chars[combined & 63] : '='
    }
    
    return result
  }

  // データURL形式で返す
  static generateTestPdfDataUrl(content?: string): string {
    const base64 = this.generateMinimalPdf(content)
    return `data:application/pdf;base64,${base64}`
  }

  // デモ用の書類をlocalStorageに保存
  static createDemoApplicationWithPdf(applicationId: string) {
    const testPdf = this.generateTestPdfDataUrl('キャリアアップ助成金申請用テスト書類')
    
    const documentData = {
      employment_rules: {
        filename: 'test-employment-rules.pdf',
        fileSize: '245KB',
        uploadDate: new Date().toISOString(),
        base64Content: testPdf
      },
      employment_contract_before: {
        filename: 'test-contract-before.pdf', 
        fileSize: '189KB',
        uploadDate: new Date().toISOString(),
        base64Content: this.generateTestPdfDataUrl('転換前雇用契約書')
      },
      career_plan: {
        filename: 'test-career-plan.pdf',
        fileSize: '312KB', 
        uploadDate: new Date().toISOString(),
        base64Content: this.generateTestPdfDataUrl('キャリアアップ計画書')
      }
    }

    localStorage.setItem(`applicationDocuments_${applicationId}`, JSON.stringify(documentData))
    console.log('Demo PDF documents created for application:', applicationId)
  }
}