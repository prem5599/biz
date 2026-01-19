import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BetaAnalyticsDataClient } from '@google-analytics/data'
import fs from 'fs'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId, propertyId, serviceAccountKey: bodyServiceAccountKey } = await request.json()

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Get property ID from request or environment
    const finalPropertyId = propertyId || process.env.GA4_PROPERTY_ID

    if (!finalPropertyId) {
      return NextResponse.json({
        error: 'GA4 Property ID required',
        hint: 'Provide propertyId or add GA4_PROPERTY_ID to .env.local'
      }, { status: 400 })
    }

    // Get service account key - prioritize request body, then file
    let serviceAccountKey

    if (bodyServiceAccountKey) {
      // Service account key provided in request body (from form)
      try {
        serviceAccountKey = typeof bodyServiceAccountKey === 'string'
          ? JSON.parse(bodyServiceAccountKey)
          : bodyServiceAccountKey
      } catch (err) {
        return NextResponse.json({
          error: 'Invalid service account key JSON',
          details: err instanceof Error ? err.message : 'Failed to parse JSON'
        }, { status: 400 })
      }
    } else {
      // Try to read from file path in environment
      const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH

      if (!keyPath) {
        return NextResponse.json({
          error: 'Service account key required',
          hint: 'Provide serviceAccountKey in request or add GOOGLE_SERVICE_ACCOUNT_KEY_PATH to .env.local'
        }, { status: 400 })
      }

      try {
        const keyContent = fs.readFileSync(keyPath, 'utf-8')
        serviceAccountKey = JSON.parse(keyContent)
      } catch (err) {
        return NextResponse.json({
          error: 'Failed to read service account key file',
          details: err instanceof Error ? err.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    // Test the connection by fetching some data
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: serviceAccountKey
    })

    // Run a simple test query
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${finalPropertyId}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [{ name: 'sessions' }],
    })

    const sessions = response.rows?.[0]?.metricValues?.[0]?.value || '0'

    // Encode the service account key for storage
    const encodedKey = Buffer.from(JSON.stringify(serviceAccountKey)).toString('base64')

    // Create or update the integration
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
        accessToken: 'SERVICE_ACCOUNT', // Placeholder for required field
        status: 'CONNECTED',
        config: JSON.stringify({
          serviceAccountKey: encodedKey,
          propertyId: finalPropertyId,
          serviceAccountEmail: serviceAccountKey.client_email,
          connectedAt: new Date().toISOString(),
        }),
      },
      update: {
        status: 'CONNECTED',
        accessToken: 'SERVICE_ACCOUNT',
        config: JSON.stringify({
          serviceAccountKey: encodedKey,
          propertyId: finalPropertyId,
          serviceAccountEmail: serviceAccountKey.client_email,
          reconnectedAt: new Date().toISOString(),
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Google Analytics connected successfully!',
      data: {
        propertyId: finalPropertyId,
        testSessions: parseInt(sessions),
        serviceAccountEmail: serviceAccountKey.client_email,
      }
    })

  } catch (error) {
    console.error('Google Analytics connect error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Check for permission errors
    if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('403')) {
      return NextResponse.json({
        error: 'Permission denied. Make sure the service account email has Viewer access in Google Analytics.',
        hint: 'Go to Analytics > Admin > Property Access Management and add the service account email'
      }, { status: 403 })
    }

    return NextResponse.json({
      error: errorMessage, // Return the actual error message
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}