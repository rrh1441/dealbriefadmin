import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  const startTime = Date.now()
  const { scanId } = params
  
  try {
    console.log(`🔍 [REPORT-VIEW] Starting report view for scan ${scanId}...`)
    
    // Query security_reports table for report_url
    const queryStart = Date.now()
    const { data: report, error } = await db
      .from('security_reports')
      .select('*')
      .eq('scan_id', scanId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    const queryTime = Date.now() - queryStart
    console.log(`📊 [REPORT-VIEW] Supabase query completed in ${queryTime}ms`)
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`⚠️ [REPORT-VIEW] No report found for scan ${scanId}`)
        return NextResponse.json({ 
          error: 'Report not found',
          message: `No report found for scan ID: ${scanId}`
        }, { status: 404 })
      }
      console.error('❌ [REPORT-VIEW] Supabase query error:', error)
      throw error
    }
    
    if (!report) {
      console.log(`⚠️ [REPORT-VIEW] No report found for scan ${scanId}`)
      return NextResponse.json({ 
        error: 'Report not found',
        message: `No report found for scan ID: ${scanId}`
      }, { status: 404 })
    }
    
    console.log(`✅ [REPORT-VIEW] Found report for scan ${scanId}`)
    
    const totalTime = Date.now() - startTime
    console.log(`✅ [REPORT-VIEW] Returning report in ${totalTime}ms`)
    
    return NextResponse.json(report)
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