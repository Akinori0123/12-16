import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { ApplicationInfo } from '@/types/deadline'

export async function POST(request: NextRequest) {
  try {
    const { applicationInfo, documentType } = await request.json()

    if (!applicationInfo || !documentType) {
      return NextResponse.json(
        { error: 'アプリケーション情報と書類タイプが必要です' },
        { status: 400 }
      )
    }

    const pdfBytes = await generatePDF(applicationInfo, documentType)

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${documentType}_${new Date().toISOString().split('T')[0]}.pdf"`
      }
    })

  } catch (error) {
    console.error('PDF生成エラー:', error)
    return NextResponse.json(
      { error: 'PDF生成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

async function generatePDF(applicationInfo: ApplicationInfo, documentType: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842]) // A4サイズ
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  
  const { width, height } = page.getSize()
  const fontSize = 12

  // タイトル
  page.drawText(documentType, {
    x: 50,
    y: height - 50,
    size: 18,
    font,
    color: rgb(0, 0, 0),
  })

  let yPosition = height - 100

  switch (documentType) {
    case 'キャリアアップ助成金申請書':
      await generateApplicationForm(page, font, applicationInfo, yPosition)
      break
    case '計画書':
      await generatePlanDocument(page, font, applicationInfo, yPosition)
      break
    case '就業規則確認書':
      await generateWorkRuleConfirmation(page, font, applicationInfo, yPosition)
      break
    case '賃金台帳確認書':
      await generateWageConfirmation(page, font, applicationInfo, yPosition)
      break
    default:
      page.drawText('指定された書類タイプは対応していません', {
        x: 50,
        y: yPosition,
        size: fontSize,
        font,
        color: rgb(1, 0, 0),
      })
  }

  return await pdfDoc.save()
}

async function generateApplicationForm(page: any, font: any, applicationInfo: ApplicationInfo, startY: number) {
  const fontSize = 12
  let yPosition = startY

  const fields = [
    { label: '申請者（事業主）', value: applicationInfo.companyName || '' },
    { label: '代表者名', value: applicationInfo.representativeName || '' },
    { label: '所在地', value: '本社所在地' },
    { label: '電話番号', value: '03-0000-0000' },
    { label: 'メールアドレス', value: 'info@company.com' },
    { label: '事業所番号', value: '0000-000000-0' },
    { label: '計画開始日', value: applicationInfo.planStartDate || '' },
    { label: '計画期間', value: '6か月' },
    { label: '対象者数', value: '1名' },
    { label: '助成金種類', value: 'キャリアアップ助成金（正社員化コース）' },
  ]

  fields.forEach((field) => {
    page.drawText(`${field.label}:`, {
      x: 50,
      y: yPosition,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    })

    page.drawText(field.value, {
      x: 200,
      y: yPosition,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    })

    // 下線を引く
    page.drawLine({
      start: { x: 200, y: yPosition - 2 },
      end: { x: 500, y: yPosition - 2 },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    })

    yPosition -= 30
  })

  // 注意事項
  yPosition -= 20
  page.drawText('注意事項:', {
    x: 50,
    y: yPosition,
    size: 14,
    font,
    color: rgb(0, 0, 0),
  })

  const notes = [
    '• この申請書は、キャリアアップ助成金（正社員化コース）の申請に使用します',
    '• 必要書類を添付の上、管轄の労働局またはハローワークに提出してください',
    '• 申請期限は計画期間終了後2か月以内です',
    '• 虚偽の申請は助成金の返還対象となります'
  ]

  yPosition -= 30
  notes.forEach((note) => {
    page.drawText(note, {
      x: 50,
      y: yPosition,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    })
    yPosition -= 20
  })

  // 署名欄
  yPosition -= 30
  page.drawText('申請者署名:', {
    x: 50,
    y: yPosition,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  })

  page.drawLine({
    start: { x: 150, y: yPosition - 2 },
    end: { x: 350, y: yPosition - 2 },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  })

  yPosition -= 30
  page.drawText(`申請日: ${new Date().toLocaleDateString('ja-JP')}`, {
    x: 50,
    y: yPosition,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  })
}

async function generatePlanDocument(page: any, font: any, applicationInfo: ApplicationInfo, startY: number) {
  const fontSize = 12
  let yPosition = startY

  page.drawText('キャリアアップ計画書', {
    x: 50,
    y: yPosition,
    size: 16,
    font,
    color: rgb(0, 0, 0),
  })

  yPosition -= 40

  const planDetails = [
    { label: '計画の概要', value: '有期雇用労働者の正社員化を通じた処遇改善' },
    { label: '実施期間', value: `${applicationInfo.planStartDate} から 6か月間` },
    { label: '対象労働者数', value: '1名' },
    { label: '実施方法', value: '社内選考により有期雇用から正社員への転換を実施' },
    { label: '期待される効果', value: '労働者のモチベーション向上、離職率低下、生産性向上' },
  ]

  planDetails.forEach((detail) => {
    page.drawText(`${detail.label}:`, {
      x: 50,
      y: yPosition,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    })

    yPosition -= 25

    // 複数行対応
    const lines = detail.value.match(/.{1,40}/g) || [detail.value]
    lines.forEach((line) => {
      page.drawText(line, {
        x: 70,
        y: yPosition,
        size: 11,
        font,
        color: rgb(0, 0, 0),
      })
      yPosition -= 20
    })

    yPosition -= 15
  })

  // スケジュール表
  yPosition -= 20
  page.drawText('実施スケジュール:', {
    x: 50,
    y: yPosition,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  })

  yPosition -= 30

  const schedule = [
    '第1月目: 対象者選定、面談実施',
    '第2-3月目: 研修プログラム実施',
    '第4-5月目: OJT・実務経験',
    '第6月目: 評価・正社員転換判定'
  ]

  schedule.forEach((item) => {
    page.drawText(`• ${item}`, {
      x: 70,
      y: yPosition,
      size: 11,
      font,
      color: rgb(0, 0, 0),
    })
    yPosition -= 25
  })
}

async function generateWorkRuleConfirmation(page: any, font: any, applicationInfo: ApplicationInfo, startY: number) {
  const fontSize = 12
  let yPosition = startY

  page.drawText('就業規則確認書', {
    x: 50,
    y: yPosition,
    size: 16,
    font,
    color: rgb(0, 0, 0),
  })

  yPosition -= 40

  page.drawText(`事業所名: ${applicationInfo.companyName}`, {
    x: 50,
    y: yPosition,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  })

  yPosition -= 30

  const confirmationItems = [
    '正社員の定義が明確に記載されている',
    '有期雇用労働者から正社員への転換規定がある', 
    '転換後の労働条件が明記されている',
    '賃金・賞与等の処遇改善内容が規定されている',
    '転換手続きの方法が明確に定められている'
  ]

  page.drawText('確認項目:', {
    x: 50,
    y: yPosition,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  })

  yPosition -= 30

  confirmationItems.forEach((item) => {
    page.drawText('☑', {
      x: 70,
      y: yPosition,
      size: fontSize,
      font,
      color: rgb(0, 0.5, 0),
    })

    page.drawText(item, {
      x: 90,
      y: yPosition,
      size: 11,
      font,
      color: rgb(0, 0, 0),
    })

    yPosition -= 25
  })

  yPosition -= 30
  page.drawText('上記項目について、提出された就業規則において確認済みです。', {
    x: 50,
    y: yPosition,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  })

  yPosition -= 50
  page.drawText('確認者:', {
    x: 50,
    y: yPosition,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  })

  page.drawLine({
    start: { x: 120, y: yPosition - 2 },
    end: { x: 300, y: yPosition - 2 },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  })

  yPosition -= 30
  page.drawText(`確認日: ${new Date().toLocaleDateString('ja-JP')}`, {
    x: 50,
    y: yPosition,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  })
}

async function generateWageConfirmation(page: any, font: any, applicationInfo: ApplicationInfo, startY: number) {
  const fontSize = 12
  let yPosition = startY

  page.drawText('賃金台帳確認書', {
    x: 50,
    y: yPosition,
    size: 16,
    font,
    color: rgb(0, 0, 0),
  })

  yPosition -= 40

  page.drawText(`事業所名: ${applicationInfo.companyName}`, {
    x: 50,
    y: yPosition,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  })

  yPosition -= 30

  page.drawText(`対象期間: ${applicationInfo.planStartDate} から 6か月間`, {
    x: 50,
    y: yPosition,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  })

  yPosition -= 40

  // 賃金台帳のヘッダー
  const headers = ['氏名', '転換前基本給', '転換後基本給', '昇給額', '昇給率']
  const headerX = [50, 150, 250, 350, 450]

  headers.forEach((header, index) => {
    page.drawText(header, {
      x: headerX[index],
      y: yPosition,
      size: 11,
      font,
      color: rgb(0, 0, 0),
    })
  })

  // ヘッダー下線
  page.drawLine({
    start: { x: 50, y: yPosition - 5 },
    end: { x: 500, y: yPosition - 5 },
    thickness: 1,
    color: rgb(0, 0, 0),
  })

  yPosition -= 30

  // サンプル行（実際は動的に生成）
  for (let i = 1; i <= 1; i++) {
    const rowData = [
      `対象者${i}`,
      '180,000円',
      '220,000円',
      '40,000円',
      '22.2%'
    ]

    rowData.forEach((data, index) => {
      page.drawText(data, {
        x: headerX[index],
        y: yPosition,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      })
    })

    yPosition -= 25
  }

  yPosition -= 30

  const notes = [
    '※ 転換前後の賃金台帳を添付してください',
    '※ 社会保険料控除前の基本給で計算してください',
    '※ 昇給率は5%以上である必要があります'
  ]

  notes.forEach((note) => {
    page.drawText(note, {
      x: 50,
      y: yPosition,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    })
    yPosition -= 20
  })

  yPosition -= 30
  page.drawText('作成者:', {
    x: 50,
    y: yPosition,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  })

  page.drawLine({
    start: { x: 120, y: yPosition - 2 },
    end: { x: 300, y: yPosition - 2 },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  })

  yPosition -= 30
  page.drawText(`作成日: ${new Date().toLocaleDateString('ja-JP')}`, {
    x: 50,
    y: yPosition,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  })
}