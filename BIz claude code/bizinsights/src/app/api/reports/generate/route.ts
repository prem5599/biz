import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
// import { formatCurrency } from '@/lib/currency' // Removed unused import
import { ReportService, ReportRequest } from '@/lib/report-service'
import { ExportService } from '@/lib/export-service'

export async function POST(request: NextRequest) {
  try {
    console.log('[Reports API] Starting report generation...')
    
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.log('[Reports API] Unauthorized - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId, reportType, period, currency = 'USD', format = 'pdf' } = await request.json()
    console.log('[Reports API] Request params:', { organizationId, reportType, period, currency, format })

    if (!organizationId || !reportType) {
      console.log('[Reports API] Missing required params')
      return NextResponse.json({ error: 'Organization ID and report type required' }, { status: 400 })
    }

    // Check user access to organization
    const membershipCheck = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id
      }
    })

    if (!membershipCheck) {
      console.log('[Reports API] Access denied - no membership')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log('[Reports API] Access granted, initializing ReportService...')

    // Use ReportService to generate comprehensive report
    const reportService = new ReportService(organizationId)
    
    const reportRequest: ReportRequest = {
      organizationId,
      reportType: reportType as 'weekly' | 'monthly' | 'quarterly' | 'customer' | 'revenue' | 'executive' | 'performance',
      period,
      currency,
      includeInsights: true,
      includeForecast: false,
      format: format as 'json' | 'pdf'
    }

    console.log('[Reports API] Generating report with service...')
    const reportContent = await reportService.generateReport(reportRequest)
    console.log('[Reports API] Report generated successfully')

    // Save report to database with 7-day expiration
    console.log('[Reports API] Saving report to database...')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

    // Map report type to valid database enum values
    const getReportTypeEnum = (type: string): string => {
      switch (type) {
        case 'weekly': return 'WEEKLY'
        case 'monthly': return 'MONTHLY'
        case 'quarterly': return 'QUARTERLY'
        case 'customer':
        case 'revenue':
        case 'executive':
        case 'performance':
        default: return 'CUSTOM'
      }
    }

    const savedReport = await prisma.report.create({
      data: {
        organizationId,
        type: getReportTypeEnum(reportType),
        title: reportContent.title,
        content: reportContent,
        periodStart: new Date(reportContent.period.start),
        periodEnd: new Date(reportContent.period.end),
        format: format.toUpperCase(),
        expiresAt
      }
    })
    console.log('[Reports API] Report saved to database:', savedReport.id)

    // Export as file (PDF, Excel, CSV)
    console.log('[Reports API] Exporting report as', format)
    const exportBuffer = await ExportService.exportReport(reportContent, {
      format: format as 'csv' | 'excel' | 'pdf',
      watermark: 'BizInsights'
    })
    console.log('[Reports API] Export completed, buffer size:', exportBuffer.length)

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

    const fileName = `${reportContent.title.replace(/\s+/g, '_')}.${fileExtension}`
    console.log('[Reports API] Returning file:', fileName)

    return new NextResponse(exportBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': exportBuffer.length.toString(),
        'X-Report-ID': savedReport.id // Include report ID in headers for reference
      }
    })

  } catch (error) {
    console.error('Error generating report:', error)
    
    // Return specific error message to help debug the issue
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.log('[Reports API] Returning error:', errorMessage)
    
    return NextResponse.json(
      { error: `Failed to generate report: ${errorMessage}` },
      { status: 500 }
    )
  }
}

// Legacy functions removed - now using ReportService