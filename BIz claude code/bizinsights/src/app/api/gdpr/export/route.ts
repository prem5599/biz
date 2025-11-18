import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GDPR Data Export API
 * Allows users to export all their personal data
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Fetch all user data
    const [user, organizationMembers, settings, auditLogs, teamInvitations] = await Promise.all([
      // User profile
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      // Organization memberships
      prisma.organizationMember.findMany({
        where: { userId },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              subscriptionTier: true,
              createdAt: true,
            },
          },
        },
      }),

      // User settings
      prisma.userSettings.findUnique({
        where: { userId },
      }),

      // Audit logs
      prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 1000, // Limit to last 1000 entries
      }),

      // Team invitations
      prisma.teamInvitation.findMany({
        where: { invitedBy: userId },
        include: {
          organization: {
            select: {
              name: true,
            },
          },
        },
      }),
    ])

    // Get organization-specific data for organizations the user owns
    const ownedOrganizations = organizationMembers
      .filter((m) => m.role === 'OWNER')
      .map((m) => m.organizationId)

    const [integrations, insights, reports, alerts] = await Promise.all([
      // Integrations (for owned organizations)
      prisma.integration.findMany({
        where: { organizationId: { in: ownedOrganizations } },
        select: {
          id: true,
          platform: true,
          status: true,
          lastSyncAt: true,
          createdAt: true,
          organizationId: true,
          // Exclude sensitive tokens
        },
      }),

      // Insights
      prisma.insight.findMany({
        where: { organizationId: { in: ownedOrganizations } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),

      // Reports
      prisma.report.findMany({
        where: { organizationId: { in: ownedOrganizations } },
        orderBy: { generatedAt: 'desc' },
        take: 100,
        select: {
          id: true,
          type: true,
          title: true,
          generatedAt: true,
          periodStart: true,
          periodEnd: true,
        },
      }),

      // Alerts
      prisma.alert.findMany({
        where: { organizationId: { in: ownedOrganizations } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ])

    // Compile all data
    const exportData = {
      exportMetadata: {
        exportDate: new Date().toISOString(),
        userId,
        dataProtectionRights: 'This export includes all personal data stored in BizInsights as per GDPR Article 15 (Right of Access)',
      },
      personalData: {
        profile: user,
        settings,
      },
      organizations: {
        memberships: organizationMembers.map((m) => ({
          organization: m.organization,
          role: m.role,
          joinedAt: m.createdAt,
        })),
        ownedOrganizations: ownedOrganizations.length,
      },
      businessData: {
        integrations: integrations.length,
        insights: insights.length,
        reports: reports.length,
        alerts: alerts.length,
      },
      detailedData: {
        integrations,
        insights,
        reports,
        alerts,
        teamInvitations,
      },
      activityHistory: {
        auditLogs: auditLogs.slice(0, 100), // Latest 100 activities
        totalActivities: auditLogs.length,
      },
      dataProcessingInformation: {
        purposes: [
          'Provide analytics and business intelligence services',
          'Process and display business data from connected integrations',
          'Generate automated reports and insights',
          'Facilitate team collaboration',
          'Billing and subscription management',
        ],
        legalBasis: 'Contract performance and legitimate business interests',
        dataRetention: 'Data is retained for the duration of your account plus 30 days after deletion',
        dataSharing: 'Data is not shared with third parties except for essential service providers (payment processing, email delivery)',
      },
    }

    // Return the data as JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="bizinsights-data-export-${userId}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('Data export error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
