import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GDPR Account Deletion API
 * Allows users to permanently delete their account and all associated data
 * Implements GDPR Article 17 (Right to Erasure)
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

    const { confirmationPhrase } = await request.json()

    // Require explicit confirmation
    if (confirmationPhrase !== 'DELETE MY ACCOUNT') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid confirmation phrase. Please type "DELETE MY ACCOUNT" to confirm.',
        },
        { status: 400 }
      )
    }

    const userId = session.user.id

    // Check if user is the sole owner of any organization
    const organizationOwnerships = await prisma.organizationMember.findMany({
      where: {
        userId,
        role: 'OWNER',
      },
      include: {
        organization: {
          include: {
            members: true,
          },
        },
      },
    })

    const soleOwnerships = organizationOwnerships.filter(
      (ownership) => ownership.organization.members.filter((m) => m.role === 'OWNER').length === 1
    )

    if (soleOwnerships.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete account while you are the sole owner of organizations',
          details: {
            message:
              'Please transfer ownership or delete the following organizations before deleting your account',
            organizations: soleOwnerships.map((o) => ({
              id: o.organization.id,
              name: o.organization.name,
            })),
          },
        },
        { status: 400 }
      )
    }

    // Start deletion process
    await prisma.$transaction(async (tx) => {
      // 1. Delete user-specific data
      await tx.userSettings.deleteMany({ where: { userId } })

      // 2. Remove from organization memberships (except owned ones)
      const membershipIds = organizationOwnerships.map((o) => o.id)
      await tx.organizationMember.deleteMany({
        where: {
          userId,
          id: { notIn: membershipIds },
        },
      })

      // 3. Delete owned organizations (and cascade delete related data)
      const ownedOrgIds = organizationOwnerships.map((o) => o.organizationId)
      if (ownedOrgIds.length > 0) {
        // Delete organization-related data
        await tx.dataPoint.deleteMany({ where: { organizationId: { in: ownedOrgIds } } })
        await tx.insight.deleteMany({ where: { organizationId: { in: ownedOrgIds } } })
        await tx.report.deleteMany({ where: { organizationId: { in: ownedOrgIds } } })
        await tx.scheduledReport.deleteMany({ where: { organizationId: { in: ownedOrgIds } } })
        await tx.alert.deleteMany({ where: { organizationId: { in: ownedOrgIds } } })
        await tx.alertRule.deleteMany({ where: { organizationId: { in: ownedOrgIds } } })
        await tx.integration.deleteMany({ where: { organizationId: { in: ownedOrgIds } } })
        await tx.teamInvitation.deleteMany({ where: { organizationId: { in: ownedOrgIds } } })
        await tx.organizationSettings.deleteMany({ where: { organizationId: { in: ownedOrgIds } } })
        await tx.organizationMember.deleteMany({ where: { organizationId: { in: ownedOrgIds } } })
        await tx.auditLog.deleteMany({ where: { organizationId: { in: ownedOrgIds } } })

        // Delete organizations
        await tx.organization.deleteMany({ where: { id: { in: ownedOrgIds } } })
      }

      // 4. Delete auth-related data
      await tx.session.deleteMany({ where: { userId } })
      await tx.account.deleteMany({ where: { userId } })

      // 5. Anonymize or delete audit logs
      await tx.auditLog.deleteMany({ where: { userId } })

      // 6. Delete team invitations sent by user
      await tx.teamInvitation.deleteMany({ where: { invitedBy: userId } })

      // 7. Finally, delete the user account
      await tx.user.delete({ where: { id: userId } })
    })

    // Log the deletion for compliance
    console.log(`[GDPR] User account deleted: ${userId} at ${new Date().toISOString()}`)

    return NextResponse.json({
      success: true,
      message:
        'Your account and all associated data have been permanently deleted. This action cannot be undone.',
      deletedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Account deletion error:', error)

    // Check if it's a constraint error
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unable to delete account due to existing dependencies',
          details:
            'Please contact support at support@bizinsights.app to complete your account deletion.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete account',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
