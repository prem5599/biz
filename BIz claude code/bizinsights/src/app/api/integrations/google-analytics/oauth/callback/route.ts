import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // organizationId
    const error = searchParams.get('error')

    if (error) {
      console.error('OAuth error:', error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?error=oauth_denied`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?error=missing_params`)
    }

    const organizationId = state

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    })

    if (!organization) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?error=invalid_organization`)
    }

    // Exchange authorization code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-analytics/oauth/callback`
    )

    const { tokens } = await oauth2Client.getToken(code)
    
    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?error=token_exchange_failed`)
    }

    // Set credentials for API calls
    oauth2Client.setCredentials(tokens)

    // Get Analytics accounts to validate the connection
    const analytics = google.analytics('v3')
    const accountsResponse = await analytics.management.accounts.list({
      auth: oauth2Client
    })

    if (!accountsResponse.data.items || accountsResponse.data.items.length === 0) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?error=no_analytics_accounts`)
    }

    // Store or update the integration
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        organizationId,
        platform: 'GOOGLE_ANALYTICS'
      }
    })

    const integrationData = {
      organizationId,
      platform: 'GOOGLE_ANALYTICS' as const,
      config: JSON.stringify({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        tokenType: tokens.token_type,
        scope: tokens.scope,
        accounts: accountsResponse.data.items.map(account => ({
          id: account.id,
          name: account.name
        }))
      }),
      status: 'CONNECTED' as const,
      lastSyncAt: new Date()
    }

    if (existingIntegration) {
      await prisma.integration.update({
        where: { id: existingIntegration.id },
        data: integrationData
      })
    } else {
      await prisma.integration.create({
        data: integrationData
      })
    }

    // Redirect to success page
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?success=google_analytics_connected`)

  } catch (error) {
    console.error('Google Analytics OAuth callback error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?error=callback_failed`)
  }
}