import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const { password } = await request.json()
  
  if (password === process.env.AUTH_PASSWORD) {
    // Generate a simple token
    const token = crypto.randomBytes(32).toString('hex')
    
    // Set cookie
    const response = NextResponse.json({ success: true })
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })
    
    // Store the token in env for validation (in production, use a database)
    process.env.AUTH_TOKEN = token
    
    return response
  }
  
  return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
}