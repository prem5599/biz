import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { google } from 'googleapis'
import { BetaAnalyticsDataClient } from '@google-analytics/data'

const syncSchema = z.object({
  organizationId: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationId } = syncSchema.parse(body)

    // Find Google Analytics integration
    const integration = await prisma.integration.findFirst({
      where: {
        organizationId,
        platform: 'GOOGLE_ANALYTICS',
        status: 'CONNECTED'
      }
    })

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Google Analytics integration not found' },
        { status: 404 }
      )
    }

    const config = JSON.parse(integration.config as string)
    
    interface AnalyticsData {
      sessions: number
      pageviews: number
      users: number
      bounceRate: string
      avgSessionDuration: number
      conversionRate: string
      topPages: Array<{ page: string; views: number }>
      trafficSources: Array<{ source: string; sessions: number }>
    }

    let analyticsData: AnalyticsData = {
      sessions: 0,
      pageviews: 0,
      users: 0,
      bounceRate: '0.00',
      avgSessionDuration: 0,
      conversionRate: '0.00',
      topPages: [],
      trafficSources: []
    }

    // Check if using OAuth tokens or service account
    if (config.accessToken && config.refreshToken) {
      // OAuth flow - use GA4 Data API
      try {
        // Setup OAuth client
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        )
        
        oauth2Client.setCredentials({
          access_token: config.accessToken,
          refresh_token: config.refreshToken,
          expiry_date: config.expiryDate
        })

        // Check if token needs refresh
        if (oauth2Client.isTokenExpiring()) {
          const { credentials } = await oauth2Client.refreshAccessToken()
          oauth2Client.setCredentials(credentials)
          
          // Update stored tokens
          await prisma.integration.update({
            where: { id: integration.id },
            data: {
              config: JSON.stringify({
                ...config,
                accessToken: credentials.access_token,
                refreshToken: credentials.refresh_token,
                expiryDate: credentials.expiry_date
              })
            }
          })
        }

        // Get Analytics properties
        const analytics = google.analytics('v3')
        const propertiesResponse = await analytics.management.webproperties.list({
          auth: oauth2Client,
          accountId: '~all'
        })

        if (!propertiesResponse.data.items || propertiesResponse.data.items.length === 0) {
          throw new Error('No Analytics properties found')
        }

        // Use first property for now
        const property = propertiesResponse.data.items[0]
        const propertyId = property.id

        // Get Analytics data using GA4 Data API
        const analyticsDataClient = new BetaAnalyticsDataClient({
          auth: oauth2Client
        })

        // Run reports for the last 30 days
        const [sessionsReport] = await analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [
            {
              startDate: '30daysAgo',
              endDate: 'today',
            },
          ],
          metrics: [
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'activeUsers' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' }
          ],
        })

        // Get top pages
        const [pagesReport] = await analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [
            {
              startDate: '30daysAgo',
              endDate: 'today',
            },
          ],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [
            {
              metric: { metricName: 'screenPageViews' },
              desc: true,
            },
          ],
          limit: 10,
        })

        // Get traffic sources
        const [sourcesReport] = await analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [
            {
              startDate: '30daysAgo',
              endDate: 'today',
            },
          ],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [
            {
              metric: { metricName: 'sessions' },
              desc: true,
            },
          ],
        })

        // Format the data
        const sessionMetrics = sessionsReport.rows?.[0]?.metricValues || []
        analyticsData = {
          sessions: parseInt(sessionMetrics[0]?.value || '0'),
          pageviews: parseInt(sessionMetrics[1]?.value || '0'),
          users: parseInt(sessionMetrics[2]?.value || '0'),
          bounceRate: parseFloat(sessionMetrics[3]?.value || '0').toFixed(2),
          avgSessionDuration: parseInt(sessionMetrics[4]?.value || '0'),
          conversionRate: '0.00', // Would need specific conversion goals setup
          topPages: pagesReport.rows?.slice(0, 4).map(row => ({
            page: row.dimensionValues?.[0]?.value || 'Unknown',
            views: parseInt(row.metricValues?.[0]?.value || '0')
          })) || [],
          trafficSources: sourcesReport.rows?.map(row => ({
            source: row.dimensionValues?.[0]?.value || 'Unknown',
            sessions: parseInt(row.metricValues?.[0]?.value || '0')
          })) || []
        }
        
      } catch (oauthError) {
        console.error('OAuth Analytics API error:', oauthError)
        throw oauthError
      }
      
    } else if (config.serviceAccountKey) {
      // Service Account flow
      try {
        const { propertyId } = config
        
        // Decrypt service account key
        const decodedKey = Buffer.from(config.serviceAccountKey, 'base64').toString()
        const serviceAccount = JSON.parse(decodedKey)

        // Initialize Analytics Data client with service account
        const analyticsDataClient = new BetaAnalyticsDataClient({
          credentials: serviceAccount
        })

        // Run the same reports as OAuth flow
        const [sessionsReport] = await analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [
            {
              startDate: '30daysAgo',
              endDate: 'today',
            },
          ],
          metrics: [
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'activeUsers' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' }
          ],
        })

        const [pagesReport] = await analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [
            {
              startDate: '30daysAgo',
              endDate: 'today',
            },
          ],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [
            {
              metric: { metricName: 'screenPageViews' },
              desc: true,
            },
          ],
          limit: 10,
        })

        const [sourcesReport] = await analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [
            {
              startDate: '30daysAgo',
              endDate: 'today',
            },
          ],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [
            {
              metric: { metricName: 'sessions' },
              desc: true,
            },
          ],
        })

        // Format the data
        const sessionMetrics = sessionsReport.rows?.[0]?.metricValues || []
        analyticsData = {
          sessions: parseInt(sessionMetrics[0]?.value || '0'),
          pageviews: parseInt(sessionMetrics[1]?.value || '0'),
          users: parseInt(sessionMetrics[2]?.value || '0'),
          bounceRate: parseFloat(sessionMetrics[3]?.value || '0').toFixed(2),
          avgSessionDuration: parseInt(sessionMetrics[4]?.value || '0'),
          conversionRate: '0.00',
          topPages: pagesReport.rows?.slice(0, 4).map(row => ({
            page: row.dimensionValues?.[0]?.value || 'Unknown',
            views: parseInt(row.metricValues?.[0]?.value || '0')
          })) || [],
          trafficSources: sourcesReport.rows?.map(row => ({
            source: row.dimensionValues?.[0]?.value || 'Unknown',
            sessions: parseInt(row.metricValues?.[0]?.value || '0')
          })) || []
        }
        
      } catch (serviceAccountError) {
        console.error('Service Account Analytics API error:', serviceAccountError)
        throw serviceAccountError
      }
    } else {
      throw new Error('No valid authentication method found in integration config')
    }

    // Store analytics data
    await prisma.dataPoint.create({
      data: {
        organizationId,
        source: 'GOOGLE_ANALYTICS',
        type: 'ANALYTICS',
        value: analyticsData.sessions,
        metadata: JSON.stringify(analyticsData),
        timestamp: new Date()
      }
    })

    // Update integration last sync time
    await prisma.integration.update({
      where: { id: integration.id },
      data: { lastSyncAt: new Date() }
    })

    return NextResponse.json({
      success: true,
      message: 'Google Analytics data synced successfully',
      data: {
        sessions: analyticsData.sessions,
        pageviews: analyticsData.pageviews,
        users: analyticsData.users,
        syncedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Google Analytics sync error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    // Handle specific Google API errors
    if (error && typeof error === 'object') {
      const apiError = error as Record<string, unknown>
      
      // OAuth token expired or invalid
      if (apiError.code === 401 || apiError.message?.includes('invalid_grant')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Google Analytics authentication expired. Please reconnect your account.',
            code: 'AUTH_EXPIRED'
          },
          { status: 401 }
        )
      }
      
      // Insufficient permissions
      if (apiError.code === 403 || apiError.message?.includes('insufficient_permissions')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Insufficient permissions to access Google Analytics data. Please check your account permissions.',
            code: 'INSUFFICIENT_PERMISSIONS'
          },
          { status: 403 }
        )
      }
      
      // Property not found
      if (apiError.message?.includes('property') && apiError.message?.includes('not found')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Google Analytics property not found. Please verify your property ID.',
            code: 'PROPERTY_NOT_FOUND'
          },
          { status: 404 }
        )
      }
      
      // Rate limiting
      if (apiError.code === 429 || apiError.message?.includes('rate limit')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Google Analytics API rate limit exceeded. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED'
          },
          { status: 429 }
        )
      }
      
      // Network errors
      if (apiError.code === 'ENOTFOUND' || apiError.code === 'ECONNREFUSED') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Network error while connecting to Google Analytics. Please check your internet connection.',
            code: 'NETWORK_ERROR'
          },
          { status: 503 }
        )
      }
    }

    // Generic error with more detailed logging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const errorStack = error instanceof Error ? error.stack : 'No stack trace available'
    
    console.error('Detailed sync error:', {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to sync Google Analytics data. Please try again or contact support if the issue persists.',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}