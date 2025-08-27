import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  let organizationId = searchParams.get('organization_id')
  
  // Use default organization ID for testing if none provided
  if (!organizationId) {
    organizationId = 'default-org-id'
    console.log('Using default organization ID for testing:', organizationId)
  }

  // Google OAuth URL for Analytics
  const googleAuthUrl = new URL('https://accounts.google.com/oauth2/authorize')
  googleAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID || 'demo_client_id')
  googleAuthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/analytics.readonly')
  googleAuthUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-analytics/oauth/callback`)
  googleAuthUrl.searchParams.set('state', organizationId)
  googleAuthUrl.searchParams.set('response_type', 'code')
  googleAuthUrl.searchParams.set('access_type', 'offline')
  googleAuthUrl.searchParams.set('prompt', 'consent')

  return NextResponse.redirect(googleAuthUrl.toString())
}

export async function POST(request: NextRequest) {
  let { organizationId } = await request.json()
  
  // Use default organization ID for testing if none provided
  if (!organizationId) {
    organizationId = 'default-org-id'
    console.log('Using default organization ID for testing:', organizationId)
  }

  // Return the OAuth URL for frontend to use
  const googleAuthUrl = new URL('https://accounts.google.com/oauth2/authorize')
  googleAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID || 'demo_client_id')
  googleAuthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/analytics.readonly')
  googleAuthUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-analytics/oauth/callback`)
  googleAuthUrl.searchParams.set('state', organizationId)
  googleAuthUrl.searchParams.set('response_type', 'code')
  googleAuthUrl.searchParams.set('access_type', 'offline')
  googleAuthUrl.searchParams.set('prompt', 'consent')

  return NextResponse.json({
    success: true,
    authUrl: googleAuthUrl.toString()
  })
}