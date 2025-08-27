import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Organization Settings Schema
const organizationSettingsSchema = z.object({
  // General Settings
  organizationName: z.string().min(1).max(100).optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  language: z.string().optional(),
  
  // Notifications
  emailReports: z.boolean().optional(),
  dailyDigest: z.boolean().optional(),
  alertsEnabled: z.boolean().optional(),
  weeklyReports: z.boolean().optional(),
  monthlyReports: z.boolean().optional(),
  
  // Analytics
  dataRetention: z.string().optional(),
  autoSync: z.boolean().optional(),
  syncFrequency: z.string().optional(),
  
  // Security
  twoFactorAuth: z.boolean().optional(),
  sessionTimeout: z.string().optional(),
  ipWhitelist: z.string().optional(),
  
  // Advanced
  apiAccess: z.boolean().optional(),
  webhooksEnabled: z.boolean().optional(),
  customDomain: z.string().optional(),
  whiteLabel: z.boolean().optional(),
  
  // Data Export
  autoBackup: z.boolean().optional(),
  backupFrequency: z.string().optional(),
  exportFormat: z.string().optional(),
  
  // Billing
  billingEmail: z.string().email().optional(),
  subscriptionTier: z.enum(['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE']).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Check user access to organization
    const membershipCheck = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN'] }
      }
    })

    if (!membershipCheck) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const [organizationSettings, organization] = await Promise.all([
      prisma.organizationSettings.findUnique({
        where: { organizationId }
      }),
      prisma.organization.findUnique({
        where: { id: organizationId }
      })
    ])

    // Return default settings if none exist
    const defaultSettings = {
      organizationName: organization?.name || 'My Business',
      timezone: 'UTC',
      currency: 'USD',
      language: 'en',
      emailReports: true,
      dailyDigest: false,
      alertsEnabled: true,
      weeklyReports: true,
      monthlyReports: true,
      dataRetention: '365',
      autoSync: true,
      syncFrequency: '1',
      twoFactorAuth: false,
      sessionTimeout: '24',
      ipWhitelist: '',
      apiAccess: false,
      webhooksEnabled: false,
      customDomain: '',
      whiteLabel: false,
      autoBackup: true,
      backupFrequency: 'weekly',
      exportFormat: 'json',
      billingEmail: organization?.billingEmail || '',
      subscriptionTier: organization?.subscriptionTier || 'FREE'
    }

    const settings = organizationSettings 
      ? { ...defaultSettings, ...organizationSettings.settings }
      : defaultSettings

    return NextResponse.json({
      success: true,
      data: settings
    })

  } catch (error) {
    console.error('Error fetching organization settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { organizationId, ...settingsData } = body
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Check user access to organization
    const membershipCheck = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN'] }
      }
    })

    if (!membershipCheck) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Validate the settings
    const validatedSettings = organizationSettingsSchema.parse(settingsData)

    // Get current settings
    const currentSettings = await prisma.organizationSettings.findUnique({
      where: { organizationId }
    })

    // Update organization basic info if provided
    if (validatedSettings.organizationName || validatedSettings.billingEmail || validatedSettings.subscriptionTier) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          ...(validatedSettings.organizationName && { name: validatedSettings.organizationName }),
          ...(validatedSettings.billingEmail && { billingEmail: validatedSettings.billingEmail }),
          ...(validatedSettings.subscriptionTier && { subscriptionTier: validatedSettings.subscriptionTier })
        }
      })
    }

    // Update organization settings
    const updatedSettings = await prisma.organizationSettings.upsert({
      where: { organizationId },
      update: {
        settings: {
          ...currentSettings?.settings,
          ...validatedSettings
        }
      },
      create: {
        organizationId,
        settings: validatedSettings
      }
    })

    // Log the settings change
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        organizationId,
        action: 'UPDATE',
        entityType: 'ORGANIZATION_SETTINGS',
        entityId: updatedSettings.id,
        oldValues: currentSettings?.settings || {},
        newValues: validatedSettings,
        ipAddress: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedSettings.settings,
      message: 'Organization settings updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid settings data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating organization settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}