import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ReportScheduler, ScheduledReportConfig } from '@/lib/report-scheduler'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config: ScheduledReportConfig = await request.json()

    if (!config.organizationId || !config.reportType || !config.frequency || !config.format) {
      return NextResponse.json({ 
        error: 'Missing required fields: organizationId, reportType, frequency, format' 
      }, { status: 400 })
    }

    // Check user access to organization
    const membershipCheck = await prisma.organizationMember.findFirst({
      where: {
        organizationId: config.organizationId,
        userId: session.user.id
      }
    })

    if (!membershipCheck) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const scheduledReport = await ReportScheduler.createScheduledReport(config)

    return NextResponse.json({
      success: true,
      data: scheduledReport
    })

  } catch (error) {
    console.error('Error creating scheduled report:', error)
    return NextResponse.json(
      { error: 'Failed to create scheduled report' },
      { status: 500 }
    )
  }
}

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
        userId: session.user.id
      }
    })

    if (!membershipCheck) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const scheduledReports = await ReportScheduler.getScheduledReports(organizationId)

    return NextResponse.json({
      success: true,
      data: scheduledReports
    })

  } catch (error) {
    console.error('Error fetching scheduled reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduled reports' },
      { status: 500 }
    )
  }
}