import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ReportScheduler, ScheduledReportConfig } from '@/lib/report-scheduler'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates: Partial<ScheduledReportConfig> = await request.json()

    // Check if scheduled report exists and user has access
    const scheduledReport = await prisma.scheduledReport.findUnique({
      where: { id: params.id },
      include: {
        organization: {
          include: {
            members: {
              where: { userId: session.user.id }
            }
          }
        }
      }
    })

    if (!scheduledReport) {
      return NextResponse.json({ error: 'Scheduled report not found' }, { status: 404 })
    }

    if (scheduledReport.organization.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const updatedReport = await ReportScheduler.updateScheduledReport(params.id, updates)

    return NextResponse.json({
      success: true,
      data: updatedReport
    })

  } catch (error) {
    console.error('Error updating scheduled report:', error)
    return NextResponse.json(
      { error: 'Failed to update scheduled report' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if scheduled report exists and user has access
    const scheduledReport = await prisma.scheduledReport.findUnique({
      where: { id: params.id },
      include: {
        organization: {
          include: {
            members: {
              where: { userId: session.user.id }
            }
          }
        }
      }
    })

    if (!scheduledReport) {
      return NextResponse.json({ error: 'Scheduled report not found' }, { status: 404 })
    }

    if (scheduledReport.organization.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await ReportScheduler.deleteScheduledReport(params.id)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting scheduled report:', error)
    return NextResponse.json(
      { error: 'Failed to delete scheduled report' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if scheduled report exists and user has access
    const scheduledReport = await prisma.scheduledReport.findUnique({
      where: { id: params.id },
      include: {
        organization: {
          include: {
            members: {
              where: { userId: session.user.id }
            }
          }
        }
      }
    })

    if (!scheduledReport) {
      return NextResponse.json({ error: 'Scheduled report not found' }, { status: 404 })
    }

    if (scheduledReport.organization.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Execute the scheduled report immediately
    const result = await ReportScheduler.executeScheduledReport(scheduledReport)

    if (result.exportBuffer && result.fileName) {
      // Return file download
      const contentType = {
        'pdf': 'application/pdf',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'csv': 'text/csv'
      }[result.fileName.split('.').pop() || ''] || 'application/octet-stream'

      return new NextResponse(result.exportBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${result.fileName}"`,
          'Content-Length': result.exportBuffer.length.toString()
        }
      })
    } else {
      // Return JSON response
      return NextResponse.json({
        success: true,
        data: result.reportContent
      })
    }

  } catch (error) {
    console.error('Error executing scheduled report:', error)
    return NextResponse.json(
      { error: 'Failed to execute scheduled report' },
      { status: 500 }
    )
  }
}