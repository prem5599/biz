/**
 * Job Scheduler Service
 * Helper functions to add jobs to Bull queues
 */

import { reportQueue, integrationSyncQueue, alertQueue } from './queues';
import { ReportJobData } from './workers/report-worker';
import { SyncJobData } from './workers/sync-worker';
import { AlertJobData } from './workers/alert-worker';

export class JobScheduler {
  /**
   * Schedule a report generation job
   */
  static async scheduleReport(data: ReportJobData, options?: { delay?: number; repeat?: any }) {
    const job = await reportQueue.add(data, {
      delay: options?.delay,
      repeat: options?.repeat,
    });

    console.log(`[Job Scheduler] Report job scheduled: ${job.id}`);
    return job;
  }

  /**
   * Schedule an integration sync job
   */
  static async scheduleSync(data: SyncJobData, options?: { delay?: number; repeat?: any }) {
    const job = await integrationSyncQueue.add(data, {
      delay: options?.delay,
      repeat: options?.repeat,
    });

    console.log(`[Job Scheduler] Sync job scheduled: ${job.id} for platform ${data.platform}`);
    return job;
  }

  /**
   * Schedule an alert check job
   */
  static async scheduleAlertCheck(data: AlertJobData, options?: { delay?: number; repeat?: any }) {
    const job = await alertQueue.add(data, {
      delay: options?.delay,
      repeat: options?.repeat,
    });

    console.log(`[Job Scheduler] Alert check job scheduled: ${job.id}`);
    return job;
  }

  /**
   * Schedule recurring integration syncs for all connected integrations
   */
  static async scheduleRecurringSync(organizationId: string) {
    const { prisma } = await import('@/lib/prisma');

    // Get all connected integrations
    const integrations = await prisma.integration.findMany({
      where: {
        organizationId,
        status: 'CONNECTED',
      },
    });

    const jobs = [];

    for (const integration of integrations) {
      // Schedule sync to run every hour
      const job = await this.scheduleSync(
        {
          integrationId: integration.id,
          organizationId,
          platform: integration.platform as any,
        },
        {
          repeat: {
            cron: '0 * * * *', // Every hour
          },
        }
      );

      jobs.push(job);
    }

    console.log(`[Job Scheduler] Scheduled ${jobs.length} recurring sync jobs`);
    return jobs;
  }

  /**
   * Schedule recurring alert checks
   */
  static async scheduleRecurringAlerts(organizationId: string) {
    // Schedule alert checks every 30 minutes
    const job = await this.scheduleAlertCheck(
      {
        organizationId,
        checkType: 'all',
      },
      {
        repeat: {
          cron: '*/30 * * * *', // Every 30 minutes
        },
      }
    );

    console.log(`[Job Scheduler] Scheduled recurring alert checks`);
    return job;
  }

  /**
   * Schedule recurring reports
   */
  static async scheduleRecurringReports() {
    const { prisma } = await import('@/lib/prisma');

    // Get all active scheduled reports
    const scheduledReports = await prisma.scheduledReport.findMany({
      where: {
        enabled: true,
      },
      include: {
        organization: true,
      },
    });

    const jobs = [];

    for (const scheduledReport of scheduledReports) {
      let cronExpression: string;

      switch (scheduledReport.frequency) {
        case 'DAILY':
          cronExpression = '0 9 * * *'; // 9 AM daily
          break;
        case 'WEEKLY':
          cronExpression = '0 9 * * 1'; // 9 AM every Monday
          break;
        case 'MONTHLY':
          cronExpression = '0 9 1 * *'; // 9 AM on 1st of month
          break;
        default:
          continue;
      }

      const job = await this.scheduleReport(
        {
          organizationId: scheduledReport.organizationId,
          reportType: scheduledReport.type.toLowerCase() as any,
          period: scheduledReport.frequency.toLowerCase(),
          currency: 'USD', // TODO: Get from organization settings
          includeInsights: true,
          includeForecast: false,
          format: scheduledReport.format as any,
          scheduledReportId: scheduledReport.id,
        },
        {
          repeat: {
            cron: cronExpression,
          },
        }
      );

      jobs.push(job);
    }

    console.log(`[Job Scheduler] Scheduled ${jobs.length} recurring report jobs`);
    return jobs;
  }

  /**
   * Get job status
   */
  static async getJobStatus(jobId: string, queueName: 'reports' | 'sync' | 'alerts') {
    let queue;

    switch (queueName) {
      case 'reports':
        queue = reportQueue;
        break;
      case 'sync':
        queue = integrationSyncQueue;
        break;
      case 'alerts':
        queue = alertQueue;
        break;
      default:
        throw new Error('Invalid queue name');
    }

    const job = await queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const progress = job.progress();

    return {
      id: job.id,
      state,
      progress,
      data: job.data,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      failedReason: job.failedReason,
    };
  }

  /**
   * Cancel a job
   */
  static async cancelJob(jobId: string, queueName: 'reports' | 'sync' | 'alerts') {
    let queue;

    switch (queueName) {
      case 'reports':
        queue = reportQueue;
        break;
      case 'sync':
        queue = integrationSyncQueue;
        break;
      case 'alerts':
        queue = alertQueue;
        break;
      default:
        throw new Error('Invalid queue name');
    }

    const job = await queue.getJob(jobId);
    if (!job) return false;

    await job.remove();
    console.log(`[Job Scheduler] Job ${jobId} cancelled`);
    return true;
  }
}

export default JobScheduler;
