import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AlertService } from '@/lib/services/alert-service'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const type = searchParams.get('type')
    const severity = searchParams.get('severity')
    const status = searchParams.get('status') || 'active'

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Check user access to organization
    const membershipCheck = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id
      }
    })

    if (!membershipCheck) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Generate fresh alerts based on current data
    await AlertService.processAllAlerts(organizationId)

    // Get alerts from database with filters
    const alerts = await AlertService.getAlerts({
      organizationId,
      type: type as any,
      severity: severity as any,
      status: status as any
    })

    // Get summary statistics
    const summary = await AlertService.getAlertSummary(organizationId)

    return NextResponse.json({
      success: true,
      alerts,
      summary,
      lastUpdated: new Date()
    })

  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, alertId, organizationId } = await request.json()

    if (!alertId || !organizationId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check user access to organization
    const membershipCheck = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id
      }
    })

    if (!membershipCheck) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Handle alert actions using the backend service
    let result
    switch (action) {
      case 'acknowledge':
        result = await AlertService.acknowledgeAlert(alertId, session.user.id)
        break
      case 'resolve':
        result = await AlertService.resolveAlert(alertId, session.user.id)
        break
      case 'dismiss':
        result = await AlertService.dismissAlert(alertId, session.user.id)
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `Alert ${action}d successfully`,
      alert: result
    })

  } catch (error) {
    console.error('Error updating alert:', error)
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    )
  }
}