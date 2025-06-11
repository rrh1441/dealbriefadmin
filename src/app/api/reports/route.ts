import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/db'

export async function GET() {
  const startTime = Date.now()
  
  try {
    console.log('🔍 [REPORTS] Starting reports fetch operation...')
    
    // Fetch all reports from security_reports table
    const queryStart = Date.now()
    const { data: reports, error } = await supabaseServer
      .from('security_reports')
      .select('scan_id, company_name, domain, severity, created_at, report_url')
      .not('company_name', 'is', null)
      .order('created_at', { ascending: false })
    
    const queryTime = Date.now() - queryStart
    console.log(`📊 [REPORTS] Supabase query completed in ${queryTime}ms`)
    
    if (error) {
      console.error('❌ [REPORTS] Supabase query error:', error)
      throw error
    }
    
    console.log(`📊 [REPORTS] Found ${reports?.length || 0} reports`)
    
    if (!reports || reports.length === 0) {
      console.log('⚠️ [REPORTS] No reports found')
      return NextResponse.json([])
    }
    
    // Group reports by scan_id to create report summaries
    const processingStart = Date.now()
    const reportMap = new Map()
    
    reports.forEach(report => {
      const scanId = report.scan_id
      
      if (!reportMap.has(scanId)) {
        reportMap.set(scanId, {
          id: scanId, // Using scan_id as report id for now
          scanId,
          companyName: report.company_name,
          domain: report.domain,
          createdAt: report.created_at,
          totalFindings: 0,
          maxSeverity: 'INFO',
          report_url: report.report_url
        })
      }
      
      const reportSummary = reportMap.get(scanId)
      reportSummary.totalFindings++
      
      // Update max severity
      const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'INFO': 0 }
      const currentSeverity = severityOrder[report.severity as keyof typeof severityOrder] || 0
      const maxSeverity = severityOrder[reportSummary.maxSeverity as keyof typeof severityOrder] || 0
      
      if (currentSeverity > maxSeverity) {
        reportSummary.maxSeverity = report.severity
      }
      
      // Use the latest report_url if multiple reports exist for the same scan
      if (report.report_url && (!reportSummary.report_url || new Date(report.created_at) > new Date(reportSummary.createdAt))) {
        reportSummary.report_url = report.report_url
      }
    })
    
    const processingTime = Date.now() - processingStart
    console.log(`📊 [REPORTS] Processed ${reports.length} report entries into ${reportMap.size} unique reports in ${processingTime}ms`)
    
    const reportSummaries = Array.from(reportMap.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 100)
    
    // Log severity breakdown
    const severityBreakdown = reportSummaries.reduce((acc, report) => {
      acc[report.maxSeverity] = (acc[report.maxSeverity] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const totalTime = Date.now() - startTime
    console.log(`✅ [REPORTS] Operation completed in ${totalTime}ms - returning ${reportSummaries.length} reports`)
    console.log(`📊 [REPORTS] Severity breakdown:`, severityBreakdown)
    
    return NextResponse.json(reportSummaries)
  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`❌ [REPORTS] Operation failed after ${totalTime}ms:`, error)
    console.error('❌ [REPORTS] Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint
    })
    
    return NextResponse.json({ 
      error: 'Failed to fetch reports',
      details: error?.message || 'Unknown error',
      code: error?.code 
    }, { status: 500 })
  }
}