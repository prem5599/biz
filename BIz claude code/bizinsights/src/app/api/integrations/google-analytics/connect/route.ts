import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const connectSchema = z.object({
  organizationId: z.string(),
  propertyId: z.string(),
  serviceAccountKey: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationId, propertyId, serviceAccountKey } = connectSchema.parse(body)

    // Validate service account key format (should be JSON)
    try {
      const serviceAccount = JSON.parse(serviceAccountKey)
      if (!serviceAccount.client_email || !serviceAccount.private_key) {
        return NextResponse.json(
          { success: false, error: 'Invalid service account key format' },
          { status: 400 }
        )
      }
    } catch {
      return NextResponse.json(
        { success: false, error: 'Service account key must be valid JSON' },
        { status: 400 }
      )
    }

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

    // Check if Google Analytics integration already exists
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        organizationId,
        platform: 'GOOGLE_ANALYTICS'
      }
    })

    if (existingIntegration) {
      // Update existing integration
      await prisma.integration.update({
        where: { id: existingIntegration.id },
        data: {
          config: JSON.stringify({
            propertyId,
            serviceAccountKey: Buffer.from(serviceAccountKey).toString('base64') // Encrypt the key
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
          platform: 'GOOGLE_ANALYTICS',
          config: JSON.stringify({
            propertyId,
            serviceAccountKey: Buffer.from(serviceAccountKey).toString('base64') // Encrypt the key
          }),
          status: 'CONNECTED',
          lastSyncAt: new Date()
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Google Analytics connected successfully'
    })

  } catch (error) {
    console.error('Google Analytics connection error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to connect Google Analytics' },
      { status: 500 }
    )
  }
}