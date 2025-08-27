import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// User Settings Schema
const userSettingsSchema = z.object({
  // Notification preferences
  emailReports: z.boolean().optional(),
  dailyDigest: z.boolean().optional(),
  alertsEnabled: z.boolean().optional(),
  weeklyReports: z.boolean().optional(),
  monthlyReports: z.boolean().optional(),
  
  // Personal preferences
  timezone: z.string().optional(),
  currency: z.string().optional(),
  language: z.string().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  
  // Privacy settings
  shareUsageData: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  
  // Dashboard preferences
  defaultDashboard: z.string().optional(),
  chartType: z.enum(['line', 'bar', 'area']).optional(),
  metricsToShow: z.array(z.string()).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id }
    })

    // Return default settings if none exist
    const defaultSettings = {
      emailReports: true,
      dailyDigest: false,
      alertsEnabled: true,
      weeklyReports: true,
      monthlyReports: true,
      timezone: 'UTC',
      currency: 'USD',
      language: 'en',
      theme: 'light',
      shareUsageData: false,
      marketingEmails: false,
      defaultDashboard: 'overview',
      chartType: 'line',
      metricsToShow: ['revenue', 'orders', 'customers']
    }

    const settings = userSettings ? { ...defaultSettings, ...userSettings.settings } : defaultSettings

    return NextResponse.json({
      success: true,
      data: settings
    })

  } catch (error) {
    console.error('Error fetching user settings:', error)
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
    
    // Validate the settings
    const validatedSettings = userSettingsSchema.parse(body)

    // Get current settings or create new one
    const currentSettings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id }
    })

    const updatedSettings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: {
        settings: {
          ...currentSettings?.settings,
          ...validatedSettings
        }
      },
      create: {
        userId: session.user.id,
        settings: validatedSettings
      }
    })

    // Log the settings change
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entityType: 'USER_SETTINGS',
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
      message: 'Settings updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid settings data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating user settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const settingKey = searchParams.get('key')

    if (!settingKey) {
      // Delete all user settings
      await prisma.userSettings.deleteMany({
        where: { userId: session.user.id }
      })

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'DELETE',
          entityType: 'USER_SETTINGS',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      })

      return NextResponse.json({
        success: true,
        message: 'All settings reset to defaults'
      })
    } else {
      // Delete specific setting
      const currentSettings = await prisma.userSettings.findUnique({
        where: { userId: session.user.id }
      })

      if (currentSettings) {
        const updatedSettings = { ...currentSettings.settings }
        delete updatedSettings[settingKey]

        await prisma.userSettings.update({
          where: { userId: session.user.id },
          data: { settings: updatedSettings }
        })

        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: 'DELETE',
            entityType: 'USER_SETTINGS',
            entityId: currentSettings.id,
            oldValues: { [settingKey]: currentSettings.settings[settingKey] },
            newValues: {},
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown'
          }
        })
      }

      return NextResponse.json({
        success: true,
        message: `Setting '${settingKey}' reset to default`
      })
    }

  } catch (error) {
    console.error('Error deleting user settings:', error)
    return NextResponse.json(
      { error: 'Failed to reset settings' },
      { status: 500 }
    )
  }
}