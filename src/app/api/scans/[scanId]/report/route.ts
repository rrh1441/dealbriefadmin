import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    const { reportUrl } = await request.json()
    const scanId = params.scanId

    const { error } = await db
      .from('security_reports')
      .insert({
        scan_id: scanId,
        report_url: reportUrl,
        created_at: new Date().toISOString()
      })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to store report:', error)
    return NextResponse.json(
      { error: 'Failed to store report' },
      { status: 500 }
    )
  }
}