import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: { documentId: string } }) {
  const { documentId } = params
  
  console.log('Test route called with documentId:', documentId)
  
  return NextResponse.json({ 
    success: true,
    message: 'Test route working',
    documentId,
    timestamp: new Date().toISOString()
  })
}