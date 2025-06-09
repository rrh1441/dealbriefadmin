import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer, SECURITY_MODULES } from '@/lib/db'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ scanId: string }> }
) {
  const startTime = Date.now()
  const params = await context.params
  const { scanId } = params
  
  try {
    console.log(`🔍 [SCAN-DETAILS] Starting scan details fetch for: ${scanId}`)
    console.log(`🔍 [SCAN-DETAILS] Request URL: ${request.url}`)
    
    // Get artifacts for this scan
    const artifactsStart = Date.now()
    const { data: artifacts, error: artifactsError } = await supabaseServer
      .from('artifacts')
      .select('*')
      .eq('meta->>scan_id', scanId)
      .order('created_at', { ascending: false })
    
    const artifactsTime = Date.now() - artifactsStart
    console.log(`📊 [SCAN-DETAILS] Artifacts query completed in ${artifactsTime}ms`)
    
    if (artifactsError) {
      console.error(`❌ [SCAN-DETAILS] Artifacts query error for ${scanId}:`, artifactsError)
      throw artifactsError
    }
    
    if (!artifacts || artifacts.length === 0) {
      console.log(`❌ [SCAN-DETAILS] Scan not found: ${scanId}`)
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }
    
    console.log(`✅ [SCAN-DETAILS] Found ${artifacts.length} artifacts for scan ${scanId}`)
    
    // Extract scan info from artifacts
    const firstArtifact = artifacts[0]
    const meta = firstArtifact.meta as any
    const companyName = meta?.company || 'Unknown'
    const domain = meta?.domain || firstArtifact.src_url || 'Unknown'
    
    console.log(`📊 [SCAN-DETAILS] Scan info - Company: ${companyName}, Domain: ${domain}`)
    
    const createdAt = artifacts.reduce((earliest, artifact) => 
      new Date(artifact.created_at) < new Date(earliest) ? artifact.created_at : earliest, 
      artifacts[0].created_at
    )
    
    const completedAt = artifacts.reduce((latest, artifact) => 
      new Date(artifact.created_at) > new Date(latest) ? artifact.created_at : latest, 
      artifacts[0].created_at
    )
    
    console.log(`📊 [SCAN-DETAILS] Scan timeline - Created: ${createdAt}, Completed: ${completedAt}`)
    
    // Group artifacts by module to get module status
    const moduleProcessingStart = Date.now()
    const moduleMap = new Map()
    
    artifacts.forEach(artifact => {
      const artifactMeta = artifact.meta as any
      const moduleName = artifactMeta?.scan_module
      
      if (moduleName) {
        if (!moduleMap.has(moduleName)) {
          moduleMap.set(moduleName, {
            name: moduleName,
            status: artifact.type === 'scan_error' ? 'failed' : 'completed',
            findings: 0,
            startedAt: artifact.created_at,
            completedAt: artifact.created_at,
          })
        }
        
        const moduleData = moduleMap.get(moduleName)
        moduleData.findings++
        
        // Update timestamps
        if (new Date(artifact.created_at) < new Date(moduleData.startedAt)) {
          moduleData.startedAt = artifact.created_at
        }
        if (new Date(artifact.created_at) > new Date(moduleData.completedAt)) {
          moduleData.completedAt = artifact.created_at
        }
        
        // Update status (failed takes precedence)
        if (artifact.type === 'scan_error') {
          moduleData.status = 'failed'
        }
      }
    })
    
    const moduleProcessingTime = Date.now() - moduleProcessingStart
    console.log(`📊 [SCAN-DETAILS] Module processing completed in ${moduleProcessingTime}ms`)
    console.log(`📊 [SCAN-DETAILS] Active modules: ${Array.from(moduleMap.keys()).join(', ')}`)
    
    // Get all modules with their status
    const moduleStatus = SECURITY_MODULES.map(moduleName => {
      const moduleData = moduleMap.get(moduleName)
      return moduleData || {
        name: moduleName,
        status: 'pending',
        findings: 0,
        startedAt: null,
        completedAt: null,
      }
    })
    
    console.log(`✅ [SCAN-DETAILS] Found ${moduleMap.size} active modules out of ${SECURITY_MODULES.length} total`)
    
    // Get findings for this scan
    const findingsStart = Date.now()
    const { data: findings, error: findingsError } = await supabaseServer
      .from('findings')
      .select(`
        id,
        finding_type,
        description,
        recommendation,
        artifact_id,
        created_at,
        artifacts!inner(severity, meta)
      `)
      .eq('artifacts.meta->>scan_id', scanId)
      .order('created_at', { ascending: false })
      .limit(100)
    
    const findingsTime = Date.now() - findingsStart
    console.log(`📊 [SCAN-DETAILS] Findings query completed in ${findingsTime}ms`)
    
    if (findingsError) {
      console.warn(`⚠️ [SCAN-DETAILS] Error fetching findings for ${scanId}:`, findingsError)
    }
    
    // Transform findings to match expected format
    const transformedFindings = findings?.map(finding => ({
      id: finding.id,
      type: finding.finding_type,
      severity: (finding.artifacts as any)?.severity || 'INFO',
      description: finding.description,
      recommendation: finding.recommendation,
      artifactId: finding.artifact_id,
      createdAt: finding.created_at
    })) || []
    
    // Sort findings by severity
    const severityOrder = { 'CRITICAL': 1, 'HIGH': 2, 'MEDIUM': 3, 'LOW': 4, 'INFO': 5 }
    transformedFindings.sort((a, b) => {
      const aSeverity = severityOrder[a.severity as keyof typeof severityOrder] || 5
      const bSeverity = severityOrder[b.severity as keyof typeof severityOrder] || 5
      return aSeverity - bSeverity
    })
    
    console.log(`✅ [SCAN-DETAILS] Found ${transformedFindings.length} findings`)
    
    // Log severity breakdown
    const severityBreakdown = transformedFindings.reduce((acc, finding) => {
      acc[finding.severity] = (acc[finding.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    console.log(`📊 [SCAN-DETAILS] Severity breakdown:`, severityBreakdown)
    
    // Transform artifacts to match expected format
    const transformedArtifacts = artifacts.map(artifact => ({
      id: artifact.id,
      type: artifact.type,
      valText: artifact.val_text,
      severity: artifact.severity,
      srcUrl: artifact.src_url,
      meta: artifact.meta,
      createdAt: artifact.created_at
    }))
    
    const response = {
      scanId,
      companyName,
      domain,
      status: 'done',
      createdAt,
      completedAt,
      totalFindings: transformedFindings.length,
      modules: moduleStatus,
      findings: transformedFindings,
      artifacts: transformedArtifacts,
    }
    
    const totalTime = Date.now() - startTime
    console.log(`✅ [SCAN-DETAILS] Operation completed in ${totalTime}ms for ${companyName}`)
    console.log(`✅ [SCAN-DETAILS] Response summary: ${transformedArtifacts.length} artifacts, ${transformedFindings.length} findings, ${moduleStatus.length} modules`)
    
    return NextResponse.json(response)
  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`❌ [SCAN-DETAILS] Operation failed after ${totalTime}ms for scan ${scanId}:`, error)
    console.error('❌ [SCAN-DETAILS] Error details:', {
      scanId,
      name: error?.name,
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint
    })
    
    return NextResponse.json({ 
      error: 'Failed to fetch scan details',
      details: error?.message || 'Unknown error',
      code: error?.code 
    }, { status: 500 })
  }
}