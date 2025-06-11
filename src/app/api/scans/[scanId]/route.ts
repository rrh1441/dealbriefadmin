import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  const startTime = Date.now()
  const { scanId } = params
  
  try {
    console.log(`🔍 [SCAN-DETAILS] Starting detailed scan fetch for scan ${scanId}...`)
    
    // Fetch scan metadata from scan_status table
    const statusStart = Date.now()
    const { data: scanStatus, error: statusError } = await db
      .from('scan_status')
      .select('*')
      .eq('scan_id', scanId)
      .single()
    
    const statusTime = Date.now() - statusStart
    console.log(`📊 [SCAN-DETAILS] Scan status query completed in ${statusTime}ms`)
    
    if (statusError) {
      if (statusError.code === 'PGRST116') {
        console.log(`⚠️ [SCAN-DETAILS] No scan found with ID: ${scanId}`)
        return NextResponse.json({ 
          error: 'Scan not found',
          message: `No scan found with ID: ${scanId}`
        }, { status: 404 })
      }
      console.error('❌ [SCAN-DETAILS] Scan status query error:', statusError)
      throw statusError
    }
    
    if (!scanStatus) {
      console.log(`⚠️ [SCAN-DETAILS] No scan status found for scan ${scanId}`)
      return NextResponse.json({ 
        error: 'Scan not found',
        message: `No scan found with ID: ${scanId}`
      }, { status: 404 })
    }
    
    console.log(`📊 [SCAN-DETAILS] Found scan status: ${scanStatus.status}`)
    
    // Fetch findings from security_reports table
    const findingsStart = Date.now()
    const { data: findings, error: findingsError } = await db
      .from('security_reports')
      .select('*')
      .eq('scan_id', scanId)
      .order('created_at', { ascending: false })
    
    const findingsTime = Date.now() - findingsStart
    console.log(`📊 [SCAN-DETAILS] Security reports query completed in ${findingsTime}ms`)
    
    if (findingsError) {
      console.error('❌ [SCAN-DETAILS] Security reports query error:', findingsError)
      throw findingsError
    }
    
    console.log(`📊 [SCAN-DETAILS] Found ${findings?.length || 0} findings`)
    
    // Calculate max severity from findings
    let maxSeverity = 'INFO'
    const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'INFO': 0 }
    
    findings?.forEach(finding => {
      const currentSeverity = severityOrder[finding.severity as keyof typeof severityOrder] || 0
      const currentMaxSeverity = severityOrder[maxSeverity as keyof typeof severityOrder] || 0
      
      if (currentSeverity > currentMaxSeverity) {
        maxSeverity = finding.severity
      }
    })
    
    // Build response object
    const response = {
      id: scanStatus.scan_id,
      companyName: scanStatus.company_name,
      domain: scanStatus.domain,
      status: scanStatus.status,
      progress: scanStatus.progress,
      currentModule: scanStatus.current_module,
      totalModules: scanStatus.total_modules,
      createdAt: scanStatus.created_at,
      updatedAt: scanStatus.updated_at,
      completedAt: scanStatus.completed_at,
      errorMessage: scanStatus.error_message,
      findings: findings || [],
      maxSeverity,
      totalFindings: scanStatus.total_findings_count || findings?.length || 0,
      totalArtifacts: scanStatus.total_artifacts_count || 0
    }
    
    const processingTime = Date.now() - startTime
    console.log(`✅ [SCAN-DETAILS] Operation completed in ${processingTime}ms`)
    console.log(`📊 [SCAN-DETAILS] Response summary:`, {
      scanId: response.id,
      status: response.status,
      totalFindings: response.totalFindings,
      totalArtifacts: response.totalArtifacts,
      maxSeverity: response.maxSeverity
    })
    
    return NextResponse.json(response)
  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`❌ [SCAN-DETAILS] Operation failed after ${totalTime}ms:`, error)
    console.error('❌ [SCAN-DETAILS] Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack
    })
    
    return NextResponse.json({ 
      error: 'Failed to fetch scan details',
      details: error?.message || 'Unknown error',
      code: error?.code 
    }, { status: 500 })
  }
}