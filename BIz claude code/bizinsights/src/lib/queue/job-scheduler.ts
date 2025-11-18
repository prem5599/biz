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
 * Job Scheduler
 *
 * Manages recurring jobs and scheduled tasks.
 * Sets up automatic data sync and insights generation schedules.
 */

import { queueService, QueueName, DataSyncJob, InsightsGenerationJob } from './queue-service';
import { prisma } from '@/lib/prisma';

export class JobScheduler {
  private static instance: JobScheduler;

  private constructor() {}

  public static getInstance(): JobScheduler {
    if (!JobScheduler.instance) {
      JobScheduler.instance = new JobScheduler();
    }
    return JobScheduler.instance;
  }

  /**
   * Initialize all recurring jobs
   * Should be called on application startup
   */
  public async initializeRecurringJobs(): Promise<void> {
    console.log('🕐 Initializing recurring jobs...');

    try {
      // Schedule data sync jobs for all connected integrations
      await this.scheduleDataSyncJobs();

      // Schedule insights generation jobs for all organizations
      await this.scheduleInsightsJobs();

      // Schedule report generation jobs
      await this.scheduleReportJobs();

      // Schedule cleanup jobs
      await this.scheduleCleanupJobs();

      console.log('✅ All recurring jobs initialized');
    } catch (error) {
      console.error('❌ Failed to initialize recurring jobs:', error);
      throw error;
    }
  }

  /**
   * Schedule data sync jobs for all connected integrations
   */
  private async scheduleDataSyncJobs(): Promise<void> {
    console.log('  📊 Scheduling data sync jobs...');

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
        status: 'CONNECTED',
      },
      include: {
        organization: true,
      },
    });

    console.log(`    Found ${integrations.length} connected integrations`);

    for (const integration of integrations) {
      try {
        // Different sync frequencies based on platform
        const cronExpression = this.getSyncCronExpression(integration.platform);

        await queueService.addRecurringJob<DataSyncJob>(
          QueueName.DATA_SYNC,
          `sync-${integration.id}`,
          {
            integrationId: integration.id,
            organizationId: integration.organizationId,
            platform: integration.platform,
            syncType: 'incremental',
          },
          cronExpression
        );

        console.log(
          `    ✓ Scheduled ${integration.platform} sync for ${integration.organization.name}`
        );
      } catch (error) {
        console.error(`    ✗ Failed to schedule sync for ${integration.id}:`, error);
      }
    }
  }

  /**
   * Schedule insights generation jobs for all organizations
   */
  private async scheduleInsightsJobs(): Promise<void> {
    console.log('  🧠 Scheduling insights generation jobs...');

    // Get all organizations with at least one connected integration
    const organizations = await prisma.organization.findMany({
      where: {
        integrations: {
          some: {
            status: 'CONNECTED',
          },
        },
      },
      include: {
        integrations: {
          where: { status: 'CONNECTED' },
        },
      },
    });

    console.log(`    Found ${organizations.length} organizations`);

    for (const organization of organizations) {
      try {
        // Generate insights every 6 hours
        await queueService.addRecurringJob<InsightsGenerationJob>(
          QueueName.INSIGHTS_GENERATION,
          `insights-${organization.id}`,
          {
            organizationId: organization.id,
            period: '30d',
            forceRegenerate: false,
          },
          '0 */6 * * *' // Every 6 hours
        );

        console.log(`    ✓ Scheduled insights for ${organization.name}`);
      } catch (error) {
        console.error(`    ✗ Failed to schedule insights for ${organization.id}:`, error);
      }
    }
  }

  /**
   * Schedule automated report generation jobs
   */
  private async scheduleReportJobs(): Promise<void> {
    console.log('  📄 Scheduling report generation jobs...');

    // Get all scheduled reports
    const scheduledReports = await prisma.scheduledReport.findMany({
      where: {
        isActive: true,
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
    console.log(`    Found ${scheduledReports.length} scheduled reports`);

    for (const scheduledReport of scheduledReports) {
      try {
        const cronExpression = this.getReportCronExpression(scheduledReport.frequency);

        await queueService.addRecurringJob(
          QueueName.REPORT_GENERATION,
          `report-${scheduledReport.id}`,
          {
            reportId: scheduledReport.id,
            organizationId: scheduledReport.organizationId,
            reportType: scheduledReport.reportType,
            period: scheduledReport.period,
            recipientEmails: scheduledReport.recipientEmails as string[],
          },
          cronExpression
        );

        console.log(
          `    ✓ Scheduled ${scheduledReport.frequency} ${scheduledReport.reportType} report for ${scheduledReport.organization.name}`
        );
      } catch (error) {
        console.error(`    ✗ Failed to schedule report ${scheduledReport.id}:`, error);
      }
    }
  }

  /**
   * Schedule cleanup jobs
   */
  private async scheduleCleanupJobs(): Promise<void> {
    console.log('  🧹 Scheduling cleanup jobs...');

    // Clean expired reports daily at 2 AM
    await queueService.addRecurringJob(
      QueueName.REPORT_GENERATION,
      'cleanup-expired-reports',
      {
        reportId: 'cleanup',
        organizationId: 'system',
        reportType: 'cleanup',
        period: 'daily',
      },
      '0 2 * * *'
    );
    console.log('    ✓ Scheduled daily report cleanup');

    // Clean old completed jobs weekly
    await queueService.addRecurringJob(
      QueueName.DATA_SYNC,
      'cleanup-completed-jobs',
      {
        integrationId: 'cleanup',
        organizationId: 'system',
        platform: 'system',
        syncType: 'full',
      },
      '0 3 * * 0' // Sunday at 3 AM
    );
    console.log('    ✓ Scheduled weekly job cleanup');
  }

  /**
   * Get cron expression for data sync based on platform
   */
  private getSyncCronExpression(platform: string): string {
    switch (platform.toLowerCase()) {
      case 'shopify':
      case 'woocommerce':
        return '0 */2 * * *'; // Every 2 hours for e-commerce

      case 'stripe':
        return '0 */3 * * *'; // Every 3 hours for payments

      case 'google-analytics':
      case 'google_analytics':
        return '0 */4 * * *'; // Every 4 hours for analytics

      case 'facebook-ads':
      case 'facebook_ads':
        return '0 0 * * *'; // Daily for ads (less frequent due to rate limits)

      default:
        return '0 */6 * * *'; // Every 6 hours default
    }
  }

  /**
   * Get cron expression for report frequency
   */
  private getReportCronExpression(frequency: string): string {
    switch (frequency.toLowerCase()) {
      case 'daily':
        return '0 8 * * *'; // Daily at 8 AM

      case 'weekly':
        return '0 8 * * 1'; // Monday at 8 AM

      case 'monthly':
        return '0 8 1 * *'; // 1st of month at 8 AM

      case 'quarterly':
        return '0 8 1 */3 *'; // 1st of every 3 months at 8 AM

      default:
        return '0 8 * * 1'; // Default to weekly
    }
  }

  /**
   * Schedule one-time job for immediate data sync
   */
  public async scheduleImmediateSync(integrationId: string): Promise<void> {
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    await queueService.addJob<DataSyncJob>(QueueName.DATA_SYNC, {
      integrationId: integration.id,
      organizationId: integration.organizationId,
      platform: integration.platform,
      syncType: 'full',
    });

    console.log(`Scheduled immediate sync for integration ${integrationId}`);
  }

  /**
   * Schedule one-time insights generation
   */
  public async scheduleImmediateInsights(
    organizationId: string,
    period: string = '30d'
  ): Promise<void> {
    await queueService.addJob<InsightsGenerationJob>(QueueName.INSIGHTS_GENERATION, {
      organizationId,
      period,
      forceRegenerate: true,
    });

    console.log(`Scheduled immediate insights generation for organization ${organizationId}`);
  }

  /**
   * Remove scheduled jobs for an integration
   */
  public async removeIntegrationJobs(integrationId: string): Promise<void> {
    const jobId = `sync-${integrationId}`;
    await queueService.removeJob(QueueName.DATA_SYNC, jobId);

    console.log(`Removed scheduled jobs for integration ${integrationId}`);
  }

  /**
   * Remove scheduled jobs for an organization
   */
  public async removeOrganizationJobs(organizationId: string): Promise<void> {
    const jobId = `insights-${organizationId}`;
    await queueService.removeJob(QueueName.INSIGHTS_GENERATION, jobId);

    console.log(`Removed scheduled jobs for organization ${organizationId}`);
  }
}

// Export singleton instance
export const jobScheduler = JobScheduler.getInstance();
