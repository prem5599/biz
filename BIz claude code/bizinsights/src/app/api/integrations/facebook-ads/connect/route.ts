import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const connectSchema = z.object({
  organizationId: z.string(),
  accessToken: z.string(),
  adAccountId: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationId, accessToken, adAccountId } = connectSchema.parse(body)

    // Basic validation of access token format
    if (!accessToken.startsWith('EAA') && !accessToken.startsWith('EAAG')) {
      return NextResponse.json(
        { success: false, error: 'Invalid Facebook access token format' },
        { status: 400 }
      )
    }

    // Validate ad account ID format (should start with 'act_' or be numeric)
    const cleanAdAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    })

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Check if Facebook Ads integration already exists
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        organizationId,
        platform: 'FACEBOOK_ADS'
      }
    })

    if (existingIntegration) {
      // Update existing integration
      await prisma.integration.update({
        where: { id: existingIntegration.id },
        data: {
          config: JSON.stringify({
            accessToken: Buffer.from(accessToken).toString('base64'), // Encrypt the token
            adAccountId: cleanAdAccountId
          }),
          status: 'CONNECTED',
          lastSyncAt: new Date()
        }
      })
    } else {
      // Create new integration
      await prisma.integration.create({
        data: {
          organizationId,
          platform: 'FACEBOOK_ADS',
          config: JSON.stringify({
            accessToken: Buffer.from(accessToken).toString('base64'), // Encrypt the token
            adAccountId: cleanAdAccountId
          }),
          status: 'CONNECTED',
          lastSyncAt: new Date()
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Facebook Ads connected successfully'
    })

  } catch (error) {
    console.error('Facebook Ads connection error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to connect Facebook Ads' },
      { status: 500 }
    )
  }
}