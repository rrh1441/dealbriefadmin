import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  const startTime = Date.now()
  const { scanId } = params
  
  try {
    console.log(`🔍 [SCAN-STATUS] Fetching status for scan ${scanId}`)

    const { data: status, error } = await db
      .from('scan_status')
      .select('*')
      .eq('scan_id', scanId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`⚠️ [SCAN-STATUS] No status record found for scan ${scanId} - returning pending status`)
        return NextResponse.json({
          id: scanId,
          status: 'pending',
          progress: 0,
          currentModule: 'Initializing',
          totalModules: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
      throw error
    }

    if (!status) {
      console.log(`⚠️ [SCAN-STATUS] No status found for scan ${scanId}`)
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      )
    }

    const totalTime = Date.now() - startTime
    console.log(`✅ [SCAN-STATUS] Status retrieved in ${totalTime}ms`)

    return NextResponse.json({
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
      errorMessage: status.error_message
    })
  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`❌ [SCAN-STATUS] Operation failed after ${totalTime}ms:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch scan status' },
      { status: 500 }
    )
  }
} 