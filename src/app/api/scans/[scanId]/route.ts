import { NextRequest, NextResponse } from 'next/server'
import { getPool, SECURITY_MODULES } from '@/lib/db'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ scanId: string }> }
) {
  const params = await context.params
  const { scanId } = params
  
  try {
    console.log('🔍 Fetching scan details for:', scanId)
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set')
    
    const pool = getPool()
    
    // Get scan info
    const scanQuery = `
      SELECT 
        meta->>'scan_id' as scan_id,
        meta->>'company' as company_name,
        MIN(CASE WHEN meta->>'domain' IS NOT NULL THEN meta->>'domain' ELSE src_url END) as domain,
        MIN(created_at) as created_at,
        MAX(created_at) as completed_at,
        COUNT(*) as total_findings
      FROM artifacts
      WHERE meta->>'scan_id' = $1
      GROUP BY meta->>'scan_id', meta->>'company'
    `
    
    console.log('📊 Executing scan query for ID:', scanId)
    const scanResult = await pool.query(scanQuery, [scanId])
    
    if (scanResult.rows.length === 0) {
      console.log('❌ Scan not found:', scanId)
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }
    
    const scan = scanResult.rows[0]
    console.log('✅ Found scan:', scan.company_name)
    
    // Get module status  
    const moduleQuery = `
      SELECT 
        meta->>'scan_module' as module,
        COUNT(*) as findings,
        MIN(created_at) as started_at,
        MAX(created_at) as completed_at,
        CASE 
          WHEN type = 'scan_error' THEN 'failed'
          ELSE 'completed'
        END as status
      FROM artifacts
      WHERE meta->>'scan_id' = $1
      AND meta->>'scan_module' IS NOT NULL
      GROUP BY meta->>'scan_module', type
    `
    
    console.log('📊 Executing module query...')
    const moduleResult = await pool.query(moduleQuery, [scanId])
    console.log('✅ Found', moduleResult.rows.length, 'module results')
    
    // Get all modules with their status
    const moduleStatus = SECURITY_MODULES.map(moduleName => {
      const moduleData = moduleResult.rows.find(m => m.module === moduleName)
      return {
        name: moduleName,
        status: moduleData ? moduleData.status : 'pending',
        findings: moduleData ? parseInt(moduleData.findings) : 0,
        startedAt: moduleData?.started_at,
        completedAt: moduleData?.completed_at,
      }
    })
    
    // Get findings
    const findingsQuery = `
      SELECT 
        f.id,
        f.finding_type as type,
        a.severity,
        f.description,
        f.recommendation,
        f.artifact_id as "artifactId",
        f.created_at as "createdAt"
      FROM findings f
      JOIN artifacts a ON f.artifact_id = a.id
      WHERE a.meta->>'scan_id' = $1
      ORDER BY 
        CASE a.severity
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
          WHEN 'INFO' THEN 5
        END,
        f.created_at DESC
      LIMIT 100
    `
    
    console.log('📊 Executing findings query...')
    const findingsResult = await pool.query(findingsQuery, [scanId])
    console.log('✅ Found', findingsResult.rows.length, 'findings')
    
    // Get artifacts
    const artifactsQuery = `
      SELECT 
        id,
        type,
        val_text as "valText",
        severity,
        src_url as "srcUrl",
        meta,
        created_at as "createdAt"
      FROM artifacts
      WHERE meta->>'scan_id' = $1
      ORDER BY created_at DESC
      LIMIT 1000
    `
    
    console.log('📊 Executing artifacts query...')
    const artifactsResult = await pool.query(artifactsQuery, [scanId])
    console.log('✅ Found', artifactsResult.rows.length, 'artifacts')
    
    const response = {
      scanId: scan.scan_id,
      companyName: scan.company_name,
      domain: scan.domain,
      status: 'done',
      createdAt: scan.created_at,
      completedAt: scan.completed_at,
      totalFindings: parseInt(scan.total_findings),
      modules: moduleStatus,
      findings: findingsResult.rows,
      artifacts: artifactsResult.rows,
    }
    
    console.log('✅ Returning scan details for:', scan.company_name)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error('❌ Database error in scan details:', error)
    console.error('Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    })
    
    return NextResponse.json({ 
      error: 'Failed to fetch scan details',
      details: error?.message || 'Unknown error',
      code: error?.code 
    }, { status: 500 })
  }
}