import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      console.error('Google OAuth error:', error)
      return NextResponse.redirect(new URL('/dashboard/integrations?error=oauth_denied', request.url))
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/dashboard/integrations?error=missing_params', request.url))
    }

    // Get user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userSettings: true
      }
    })

    if (!user) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    // Parse stored settings
    const storedSettings = user.userSettings?.settings
      ? JSON.parse(user.userSettings.settings as string)
      : {}

    const expectedState = storedSettings?.googleOAuthState

    if (!expectedState || state !== expectedState) {
      console.error('State mismatch:', { received: state, expected: expectedState })
      return NextResponse.redirect(new URL('/dashboard/integrations?error=invalid_state', request.url))
    }

    const organizationId = storedSettings?.googleOrgId

    if (!organizationId) {
      return NextResponse.redirect(new URL('/dashboard/integrations?error=no_organization', request.url))
    }

    // Exchange authorization code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/api/integrations/google-analytics/oauth/callback`

    if (!clientId || !clientSecret) {
      console.error('Google credentials not configured')
      return NextResponse.redirect(new URL('/dashboard/integrations?error=not_configured', request.url))
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange failed:', errorData)
      return NextResponse.redirect(new URL('/dashboard/integrations?error=token_exchange_failed', request.url))
    }

    const tokens = await tokenResponse.json()

    if (!tokens.access_token) {
      return NextResponse.redirect(new URL('/dashboard/integrations?error=no_access_token', request.url))
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokens.access_token)
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null

    // Store or update the integration
    await prisma.integration.upsert({
      where: {
        organizationId_platform: {
          organizationId,
          platform: 'GOOGLE_ANALYTICS',
        },
      },
      create: {
        organizationId,
        platform: 'GOOGLE_ANALYTICS',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        status: 'CONNECTED',
        metadata: JSON.stringify({
          scope: tokens.scope,
          tokenType: tokens.token_type,
          expiresIn: tokens.expires_in,
          connectedAt: new Date().toISOString(),
        }),
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        status: 'CONNECTED',
        metadata: JSON.stringify({
          scope: tokens.scope,
          tokenType: tokens.token_type,
          expiresIn: tokens.expires_in,
          reconnectedAt: new Date().toISOString(),
        }),
      },
    })

    // Clear OAuth state from user settings
    const clearedSettings = {
      ...storedSettings,
      googleOAuthState: null,
      googleOrgId: null,
    }

    await prisma.userSettings.update({
      where: { userId: user.id },
      data: {
        settings: JSON.stringify(clearedSettings),
      },
    })

    // Redirect to success page
    return NextResponse.redirect(new URL('/dashboard/integrations?success=google-analytics-connected', request.url))

  } catch (error) {
    console.error('Google Analytics OAuth callback error:', error)
    return NextResponse.redirect(new URL('/dashboard/integrations?error=callback_failed', request.url))
  }
}