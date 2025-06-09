import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/db'

export async function GET() {
  const startTime = Date.now()
  
  try {
    console.log('🔍 [SCANS] Starting scan fetch operation...')
    
    // Fetch artifacts and group by scan_id to create scan summaries
    const queryStart = Date.now()
    const { data: artifacts, error } = await supabaseServer
      .from('artifacts')
      .select('meta, created_at, severity, src_url')
      .not('meta->>scan_id', 'is', null)
      .order('created_at', { ascending: false })
    
    const queryTime = Date.now() - queryStart
    console.log(`📊 [SCANS] Supabase query completed in ${queryTime}ms`)
    
    if (error) {
      console.error('❌ [SCANS] Supabase query error:', error)
      throw error
    }
    
    console.log('📊 [SCANS] Processing', artifacts?.length || 0, 'artifacts...')
    
    if (!artifacts || artifacts.length === 0) {
      console.log('⚠️ [SCANS] No artifacts found with scan_id')
      return NextResponse.json([])
    }
    
    // Group artifacts by scan_id and create scan summaries
    const processingStart = Date.now()
    const scanMap = new Map()
    let processedCount = 0
    let skippedCount = 0
    
    artifacts?.forEach(artifact => {
      const meta = artifact.meta as any
      const scanId = meta?.scan_id
      
      if (!scanId) {
        skippedCount++
        return
      }
      
      processedCount++
      
      if (!scanMap.has(scanId)) {
        scanMap.set(scanId, {
          scanId,
          companyName: meta?.company || 'Unknown',
          domain: meta?.domain || artifact.src_url || 'Unknown',
          status: 'done',
          createdAt: artifact.created_at,
          completedAt: artifact.created_at,
          totalFindings: 0,
          maxSeverity: 'INFO'
        })
      }
      
      const scan = scanMap.get(scanId)
      scan.totalFindings++
      
      // Update completed_at to latest artifact
      if (new Date(artifact.created_at) > new Date(scan.completedAt)) {
        scan.completedAt = artifact.created_at
      }
      
      // Update created_at to earliest artifact
      if (new Date(artifact.created_at) < new Date(scan.createdAt)) {
        scan.createdAt = artifact.created_at
      }
      
      // Update max severity
      const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'INFO': 0 }
      const currentSeverity = severityOrder[artifact.severity as keyof typeof severityOrder] || 0
      const maxSeverity = severityOrder[scan.maxSeverity as keyof typeof severityOrder] || 0
      
      if (currentSeverity > maxSeverity) {
        scan.maxSeverity = artifact.severity
      }
    })
    
    const processingTime = Date.now() - processingStart
    console.log(`📊 [SCANS] Processed ${processedCount} artifacts, skipped ${skippedCount} in ${processingTime}ms`)
    console.log(`📊 [SCANS] Created ${scanMap.size} unique scans`)
    
    const scans = Array.from(scanMap.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 100)
    
    const totalTime = Date.now() - startTime
    console.log(`✅ [SCANS] Operation completed in ${totalTime}ms - returning ${scans.length} scans`)
    
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