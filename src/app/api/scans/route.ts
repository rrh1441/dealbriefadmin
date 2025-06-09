import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/db'

export async function GET() {
  const startTime = Date.now()
  
  try {
    console.log('🔍 [SCANS] Starting scan fetch operation...')
    
    // Fetch all scan statuses
    const statusStart = Date.now()
    const { data: scanStatuses, error: statusError } = await supabaseServer
      .from('scan_status')
      .select('*')
      .order('started_at', { ascending: false })
    
    const statusTime = Date.now() - statusStart
    console.log(`📊 [SCANS] Scan status query completed in ${statusTime}ms`)
    
    if (statusError) {
      console.error('❌ [SCANS] Failed to fetch scan statuses:', statusError)
      throw statusError
    }
    
    console.log(`📊 [SCANS] Found ${scanStatuses?.length || 0} scan statuses`)
    
    if (!scanStatuses || scanStatuses.length === 0) {
      console.log('⚠️ [SCANS] No scan statuses found')
      return NextResponse.json([])
    }
    
    // Get all scan IDs to fetch findings
    const scanIds = scanStatuses.map(status => status.scan_id)
    
    // Fetch findings for all scans
    const findingsStart = Date.now()
    const { data: findings, error: findingsError } = await supabaseServer
      .from('security_reports')
      .select('scan_id, severity, created_at')
      .in('scan_id', scanIds)
    
    const findingsTime = Date.now() - findingsStart
    console.log(`📊 [SCANS] Security reports query completed in ${findingsTime}ms`)
    
    if (findingsError) {
      console.warn('⚠️ [SCANS] Failed to fetch findings:', findingsError)
    }
    
    console.log(`📊 [SCANS] Found ${findings?.length || 0} findings across all scans`)
    
    // Group findings by scan_id
    const findingsMap = new Map()
    findings?.forEach(finding => {
      if (!findingsMap.has(finding.scan_id)) {
        findingsMap.set(finding.scan_id, [])
      }
      findingsMap.get(finding.scan_id).push(finding)
    })
    
    // Build scan objects
    const processingStart = Date.now()
    const scans = scanStatuses.map(status => {
      const scanFindings = findingsMap.get(status.scan_id) || []
      
      // Calculate max severity
      let maxSeverity = 'INFO'
      const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'INFO': 0 }
      
      scanFindings.forEach(finding => {
        const currentSeverity = severityOrder[finding.severity as keyof typeof severityOrder] || 0
        const currentMaxSeverity = severityOrder[maxSeverity as keyof typeof severityOrder] || 0
        
        if (currentSeverity > currentMaxSeverity) {
          maxSeverity = finding.severity
        }
      })
      
      return {
        scanId: status.scan_id,
        companyName: status.company_name,
        domain: status.domain,
        status: status.status,
        createdAt: status.started_at,
        completedAt: status.completed_at,
        totalFindings: scanFindings.length,
        maxSeverity,
        progress: status.progress,
        currentModule: status.current_module,
        errorMessage: status.error_message,
        lastUpdated: status.last_updated
      }
    })
    
    const processingTime = Date.now() - processingStart
    console.log(`📊 [SCANS] Processed ${scans.length} scans in ${processingTime}ms`)
    
    // Log status breakdown
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
    console.error('❌ [SCANS] Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint
    })
    
    return NextResponse.json({ 
      error: 'Failed to fetch scans',
      details: error?.message || 'Unknown error',
      code: error?.code 
    }, { status: 500 })
  }
}