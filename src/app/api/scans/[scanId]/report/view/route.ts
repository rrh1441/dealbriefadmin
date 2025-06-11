import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  const startTime = Date.now()
  const { scanId } = params
  
  try {
    console.log(`🔍 [REPORT-VIEW] Fetching report for scan ${scanId}`)

    const { data: report, error } = await db
      .from('security_reports')
      .select('report_url')
      .eq('scan_id', scanId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`⚠️ [REPORT-VIEW] No report found for scan ${scanId}`)
        return NextResponse.json(
          { error: 'Report not found' },
          { status: 404 }
        )
      }
      throw error
    }

    if (!report || !report.report_url) {
      console.log(`⚠️ [REPORT-VIEW] No report URL available for scan ${scanId}`)
      return NextResponse.json(
        { error: 'Report URL not available' },
        { status: 404 }
      )
    }

    const totalTime = Date.now() - startTime
    console.log(`✅ [REPORT-VIEW] Redirecting to report URL in ${totalTime}ms`)

    // Redirect to the report URL
    return NextResponse.redirect(report.report_url)
  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`❌ [REPORT-VIEW] Operation failed after ${totalTime}ms:`, error)
    console.error('❌ [REPORT-VIEW] Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint
    })
    
    return NextResponse.json({ 
      error: 'Failed to fetch report',
      details: error?.message || 'Unknown error',
      code: error?.code 
    }, { status: 500 })
  }
}