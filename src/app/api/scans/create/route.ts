import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { companyName, domain } = await request.json()
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName, domain }),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to create scan: ${response.statusText}`)
    }
    
    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to create scan:', error)
    return NextResponse.json(
      { error: 'Failed to create scan' },
      { status: 500 }
    )
  }
}