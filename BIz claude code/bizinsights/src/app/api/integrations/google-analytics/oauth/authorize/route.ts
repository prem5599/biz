import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Check if Google credentials are configured
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) {
      return NextResponse.json({
        error: 'Google Analytics integration not configured. Add GOOGLE_CLIENT_ID to environment.'
      }, { status: 500 })
    }

    // Generate secure state token
    const stateToken = crypto.randomBytes(32).toString('hex')

    // Get user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    // Get existing settings
    const existingSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id }
    })

    const currentSettings = existingSettings?.settings
      ? JSON.parse(existingSettings.settings as string)
      : {}

    // Store state in UserSettings for verification in callback
    const newSettings = {
      ...currentSettings,
      googleOAuthState: stateToken,
      googleOrgId: organizationId
    }

    await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        settings: JSON.stringify(newSettings)
      },
      update: {
        settings: JSON.stringify(newSettings)
      }
    })

    // Build Google OAuth URL
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/api/integrations/google-analytics/oauth/callback`

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    googleAuthUrl.searchParams.set('client_id', clientId)
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri)
    googleAuthUrl.searchParams.set('response_type', 'code')
    googleAuthUrl.searchParams.set('scope', 'openid email profile')
    googleAuthUrl.searchParams.set('access_type', 'offline')
    googleAuthUrl.searchParams.set('prompt', 'consent')
    googleAuthUrl.searchParams.set('state', stateToken)

    return NextResponse.redirect(googleAuthUrl.toString())
  } catch (error) {
    console.error('Google Analytics OAuth authorize error:', error)
    return NextResponse.json({
      error: 'Failed to start OAuth flow',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId } = await request.json()

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) {
      return NextResponse.json({
        error: 'Google Analytics integration not configured',
        configured: false
      }, { status: 500 })
    }

    // Return the authorize URL for frontend to redirect
    const authorizeUrl = new URL('/api/integrations/google-analytics/oauth/authorize', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002')
    authorizeUrl.searchParams.set('organization_id', organizationId)

    return NextResponse.json({
      success: true,
      authUrl: authorizeUrl.toString(),
      configured: true
    })
  } catch (error) {
    console.error('Google Analytics OAuth POST error:', error)
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 })
  }
}