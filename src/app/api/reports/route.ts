import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  console.log('🔍 [REPORTS] Starting reports fetch operation...')
  const startTime = Date.now()

  try {
    const { data: reports, error } = await db
      .from('security_reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ [REPORTS] Supabase query error:', error)
      throw error
    }

    const queryTime = Date.now() - startTime
    console.log(`📊 [REPORTS] Supabase query completed in ${queryTime}ms`)

    return NextResponse.json(reports || [])
  } catch (error: any) {
    const errorTime = Date.now() - startTime
    console.error(`❌ [REPORTS] Operation failed after ${errorTime}ms:`, error)
    console.error('❌ [REPORTS] Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}