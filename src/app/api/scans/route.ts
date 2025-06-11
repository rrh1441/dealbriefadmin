import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  console.log('🔍 [SCANS] Starting scan fetch operation...')
  const startTime = Date.now()

  try {
    // Fetch scan statuses
    const statusQueryStart = Date.now()
    const { data: scanStatuses, error: statusError } = await db
      .from('scan_status')
      .select('*')
      .order('created_at', { ascending: false })

    // Handle build-time mock response
    if (statusError?.code === 'BUILD_TIME_MOCK') {
      console.log('📦 [SCANS] Build-time mode: returning empty scan list')
      return NextResponse.json([])
    }

    if (statusError) {
      console.error('❌ [SCANS] Failed to fetch scan statuses:', statusError)
      throw statusError
    }

    const statusQueryTime = Date.now() - statusQueryStart
    console.log(`📊 [SCANS] Scan status query completed in ${statusQueryTime}ms`)
    console.log(`📊 [SCANS] Found ${scanStatuses?.length || 0} scan statuses`)

    // Fetch security reports
    const reportsQueryStart = Date.now()
    const { data: reports, error: reportsError } = await db
      .from('security_reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (reportsError) {
      console.error('⚠️ [SCANS] Failed to fetch findings:', reportsError)
    }

    const reportsQueryTime = Date.now() - reportsQueryStart
    console.log(`📊 [SCANS] Security reports query completed in ${reportsQueryTime}ms`)
    console.log(`📊 [SCANS] Found ${reports?.length || 0} findings across all scans`)

    // Process scans
    const processingStart = Date.now()
    const scans = scanStatuses?.map(status => {
      const scanReports = reports?.filter(report => report.scan_id === status.scan_id) || []
      
      // Calculate max severity
      let maxSeverity = 'INFO'
      const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'INFO': 0 }
      
      scanReports.forEach(report => {
        const currentSeverity = severityOrder[report.severity as keyof typeof severityOrder] || 0
        const currentMaxSeverity = severityOrder[maxSeverity as keyof typeof severityOrder] || 0
        
        if (currentSeverity > currentMaxSeverity) {
          maxSeverity = report.severity
        }
      })
      
      return {
        id: status.scan_id,
        companyName: status.company_name,
        domain: status.domain,
        status: status.status,
        progress: status.progress,
        currentModule: status.current_module,
        totalModules: status.total_modules,
        createdAt: status.created_at,
        updatedAt: status.updated_at,
        completedAt: status.completed_at,
        errorMessage: status.error_message,
        maxSeverity: scanReports.length > 0 ? maxSeverity : undefined,
        totalFindings: scanReports.length,
        findings: scanReports.map(report => ({
          id: report.id,
          type: report.type,
          title: report.title,
          description: report.description,
          severity: report.severity,
          recommendation: report.recommendation
        }))
      }
    }) || []

    const processingTime = Date.now() - processingStart
    console.log(`📊 [SCANS] Processed ${scanStatuses?.length || 0} scans in ${processingTime}ms`)

    // Calculate status breakdown
    const statusBreakdown = scans.reduce((acc, scan) => {
      acc[scan.status] = (acc[scan.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const totalTime = Date.now() - startTime
    console.log(`✅ [SCANS] Operation completed in ${totalTime}ms - returning ${scans.length} scans`)
    console.log(`📊 [SCANS] Status breakdown:`, statusBreakdown)

    return NextResponse.json(scans)
  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`❌ [SCANS] Operation failed after ${totalTime}ms:`, error)
    return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 })
  }
}