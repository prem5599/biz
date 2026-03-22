/**
 * Report Generation Job Processor
 *
 * Handles background generation and delivery of reports.
 */

import { Job } from 'bull';
import { ReportGenerationJob } from '../queue-service';
import { prisma } from '@/lib/prisma';
import { ReportService } from '@/lib/report-service';

export async function processReportGeneration(job: Job<ReportGenerationJob>): Promise<any> {
  const { reportId, organizationId, reportType, period, recipientEmails } = job.data;

  console.log(`Generating ${reportType} report for organization ${organizationId}`);

  try {
    await job.progress(10);

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    await job.progress(20);

    // Generate report using ReportService
    const reportService = new ReportService();
    const reportBuffer = await reportService.generateReport(
      organizationId,
      reportType,
      period
    );

    await job.progress(60);

    // Save report to database if reportId provided
    if (reportId) {
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    }

    await job.progress(80);

    // Send email if recipients provided
    if (recipientEmails && recipientEmails.length > 0) {
      const { queueService, QueueName } = await import('../queue-service');

      await queueService.addJob(QueueName.EMAIL_SENDING, {
        to: recipientEmails,
        subject: `${reportType} Report - ${organization.name}`,
        template: 'report-delivery',
        data: {
          organizationName: organization.name,
          reportType,
          period,
          reportId,
        },
        organizationId,
      });
    }

    await job.progress(100);

    console.log(`Report generated successfully for organization ${organizationId}`);

    return {
      success: true,
      reportId,
      reportType,
      period,
      emailsSent: recipientEmails?.length || 0,
      duration: Date.now() - job.timestamp,
    };
  } catch (error: any) {
    console.error(`Report generation failed for organization ${organizationId}:`, error);

    // Update report status to failed
    if (reportId) {
      await prisma.report.update({
        where: { id: reportId },
        data: { status: 'FAILED' },
      });
    }

    throw error;
  }
}
