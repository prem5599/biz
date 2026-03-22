/**
 * Report Worker
 * Processes report generation jobs in the background
 */

import { Job } from 'bull';
import { reportQueue } from '../queues';
import { ReportService } from '@/lib/report-service';
import { prisma } from '@/lib/prisma';
import { exportToPDF } from '@/lib/export-service';

export interface ReportJobData {
  organizationId: string;
  reportType: 'weekly' | 'monthly' | 'quarterly' | 'custom' | 'customer' | 'revenue' | 'executive' | 'performance';
  period: string;
  currency: string;
  customDateRange?: {
    startDate: string;
    endDate: string;
  };
  includeInsights?: boolean;
  includeForecast?: boolean;
  format?: 'json' | 'pdf';
  scheduledReportId?: string;
}

// Process report generation jobs
reportQueue.process(async (job: Job<ReportJobData>) => {
  const { data } = job;

  console.log(`[Report Worker] Processing report job ${job.id}:`, {
    organizationId: data.organizationId,
    type: data.reportType,
    period: data.period,
  });

  try {
    // Update job progress
    await job.progress(10);

    // Generate the report
    const reportService = new ReportService(data.organizationId);
    await job.progress(30);

    const reportContent = await reportService.generateReport({
      organizationId: data.organizationId,
      reportType: data.reportType,
      period: data.period,
      currency: data.currency,
      customDateRange: data.customDateRange,
      includeInsights: data.includeInsights ?? true,
      includeForecast: data.includeForecast ?? false,
      format: data.format ?? 'json',
    });

    await job.progress(70);

    // Generate PDF if requested
    let pdfUrl: string | null = null;
    if (data.format === 'pdf') {
      try {
        pdfUrl = await exportToPDF(reportContent);
        console.log(`[Report Worker] PDF generated: ${pdfUrl}`);
      } catch (pdfError) {
        console.error('[Report Worker] PDF generation failed:', pdfError);
        // Continue without PDF
      }
    }

    await job.progress(80);

    // Save report to database
    const report = await prisma.report.create({
      data: {
        organizationId: data.organizationId,
        type: data.reportType.toUpperCase() as any,
        content: reportContent as any,
        pdfUrl,
        period: data.period,
        startDate: reportContent.period.start,
        endDate: reportContent.period.end,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      },
    });

    await job.progress(90);

    // Update scheduled report if this was from a schedule
    if (data.scheduledReportId) {
      await prisma.scheduledReport.update({
        where: { id: data.scheduledReportId },
        data: {
          lastRunAt: new Date(),
          nextRunAt: calculateNextRun(data.period),
        },
      });
    }

    await job.progress(100);

    console.log(`[Report Worker] Report ${report.id} generated successfully`);

    return {
      success: true,
      reportId: report.id,
      pdfUrl,
    };
  } catch (error) {
    console.error(`[Report Worker] Error processing job ${job.id}:`, error);
    throw error; // Bull will handle retries
  }
});

// Calculate next run time for scheduled reports
function calculateNextRun(period: string): Date {
  const now = new Date();

  switch (period) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth;
    case 'quarterly':
      const nextQuarter = new Date(now);
      nextQuarter.setMonth(nextQuarter.getMonth() + 3);
      return nextQuarter;
    default:
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Default to weekly
  }
}

console.log('[Report Worker] Worker initialized and ready');

export default reportQueue;
