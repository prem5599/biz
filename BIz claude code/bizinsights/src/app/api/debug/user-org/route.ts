import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Debug endpoint to check user's organization status
 * GET /api/debug/user-org
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({
        error: 'Not authenticated',
        solution: 'Please sign in first'
      }, { status: 401 })
    }

    // Get user with organizations
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        organizationMembers: {
          include: {
            organization: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({
        error: 'User not found in database',
        userId: session.user.id
      })
    }

    const orgs = user.organizationMembers.map(member => ({
      id: member.organization.id,
      name: member.organization.name,
      role: member.role,
      subscriptionTier: member.organization.subscriptionTier
    }))

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      organizationCount: orgs.length,
      organizations: orgs,
      hasOrganization: orgs.length > 0,
      canConnectIntegrations: orgs.length > 0,
      solution: orgs.length === 0
        ? 'Sign up for a new account or contact admin to add you to an organization'
        : 'You can now connect integrations!'
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({
      error: 'Failed to check user organization',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
