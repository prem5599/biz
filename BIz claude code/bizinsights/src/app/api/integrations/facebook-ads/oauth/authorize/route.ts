/**
 * Facebook Ads OAuth Authorization
 *
 * Initiates OAuth flow with Facebook Login
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const redirectUri = searchParams.get('redirectUri') || `${process.env.APP_URL}/api/integrations/facebook-ads/oauth/callback`;

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Facebook App credentials
    const clientId = process.env.FACEBOOK_APP_ID;
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'Facebook App not configured' },
        { status: 500 }
      );
    }

    // Required permissions for Facebook Ads
    const scope = [
      'ads_read',           // Read ad account data
      'ads_management',     // Manage ad campaigns
      'business_management' // Access business manager
    ].join(',');

    // Build Facebook OAuth URL
    const facebookOAuthUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
    facebookOAuthUrl.searchParams.append('client_id', clientId);
    facebookOAuthUrl.searchParams.append('redirect_uri', redirectUri);
    facebookOAuthUrl.searchParams.append('scope', scope);
    facebookOAuthUrl.searchParams.append('state', organizationId); // Pass organizationId in state
    facebookOAuthUrl.searchParams.append('response_type', 'code');

    // Redirect to Facebook OAuth
    return NextResponse.redirect(facebookOAuthUrl.toString());
  } catch (error: any) {
    console.error('Facebook OAuth authorization error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'OAUTH_ERROR',
          message: 'Failed to initiate Facebook OAuth',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
