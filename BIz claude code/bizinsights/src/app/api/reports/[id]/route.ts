import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ExportService } from '@/lib/export-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'

    // Fetch the report (only if not expired)
    const report = await prisma.report.findFirst({
      where: { 
        id: params.id,
        expiresAt: {
          gt: new Date() // Only show non-expired reports
        }
      },
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

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Check user access
    if (report.organization.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Return JSON format
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: {
          id: report.id,
          title: report.title,
          type: report.type,
          content: report.content,
          periodStart: report.periodStart,
          periodEnd: report.periodEnd,
          generatedAt: report.generatedAt,
          organization: {
            id: report.organization.id,
            name: report.organization.name
          }
        }
      })
    }

    // Export as file
    const exportBuffer = await ExportService.exportReport(report.content as any, {
      format: format as 'csv' | 'excel' | 'pdf',
      watermark: 'BizInsights'
    })

    const contentType = {
      'pdf': 'application/pdf',
      'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'csv': 'text/csv'
    }[format] || 'application/octet-stream'

    const fileExtension = {
      'pdf': 'pdf',
      'excel': 'xlsx',
      'csv': 'csv'
    }[format] || 'bin'

    const fileName = `${report.title.replace(/\s+/g, '_')}.${fileExtension}`

    return new NextResponse(exportBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': exportBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('Error fetching report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report' },
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

    // Check if report exists and user has access (only non-expired reports)
    const report = await prisma.report.findFirst({
      where: { 
        id: params.id,
        expiresAt: {
          gt: new Date() // Only allow deletion of non-expired reports
        }
      },
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

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    if (report.organization.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete the report
    await prisma.report.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting report:', error)
    return NextResponse.json(
      { error: 'Failed to delete report' },
      { status: 500 }
    )
  }
}