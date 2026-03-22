/**
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
    console.log('Initializing recurring jobs...');

    try {
      await this.scheduleDataSyncJobs();
      await this.scheduleInsightsJobs();
      await this.scheduleReportJobs();
      await this.scheduleCleanupJobs();

      console.log('All recurring jobs initialized');
    } catch (error) {
      console.error('Failed to initialize recurring jobs:', error);
      throw error;
    }
  }

  /**
   * Schedule data sync jobs for all connected integrations
   */
  private async scheduleDataSyncJobs(): Promise<void> {
    console.log('  Scheduling data sync jobs...');

    const integrations = await prisma.integration.findMany({
      where: { status: 'CONNECTED' },
      include: { organization: true },
    });

    console.log(`    Found ${integrations.length} connected integrations`);

    for (const integration of integrations) {
      try {
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
          `    Scheduled ${integration.platform} sync for org ${integration.organizationId}`
        );
      } catch (error) {
        console.error(`    Failed to schedule sync for ${integration.id}:`, error);
      }
    }
  }

  /**
   * Schedule insights generation jobs for all organizations
   */
  private async scheduleInsightsJobs(): Promise<void> {
    console.log('  Scheduling insights generation jobs...');

    const organizations = await prisma.organization.findMany({
      where: {
        integrations: {
          some: { status: 'CONNECTED' },
        },
      },
    });

    console.log(`    Found ${organizations.length} organizations`);

    for (const organization of organizations) {
      try {
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

        console.log(`    Scheduled insights for ${organization.name}`);
      } catch (error) {
        console.error(`    Failed to schedule insights for ${organization.id}:`, error);
      }
    }
  }

  /**
   * Schedule automated report generation jobs
   */
  private async scheduleReportJobs(): Promise<void> {
    console.log('  Scheduling report generation jobs...');

    const scheduledReports = await prisma.reportSchedule.findMany({
      where: { isActive: true },
      include: { organization: true },
    });

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
          },
          cronExpression
        );

        console.log(
          `    Scheduled ${scheduledReport.frequency} report for org ${scheduledReport.organizationId}`
        );
      } catch (error) {
        console.error(`    Failed to schedule report ${scheduledReport.id}:`, error);
      }
    }
  }

  /**
   * Schedule cleanup jobs
   */
  private async scheduleCleanupJobs(): Promise<void> {
    console.log('  Scheduling cleanup jobs...');

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
    console.log('    Scheduled daily report cleanup');
  }

  /**
   * Get cron expression for data sync based on platform
   */
  private getSyncCronExpression(platform: string): string {
    switch (platform.toLowerCase()) {
      case 'shopify':
      case 'woocommerce':
        return '0 */2 * * *';
      case 'stripe':
        return '0 */3 * * *';
      case 'google-analytics':
      case 'google_analytics':
        return '0 */4 * * *';
      case 'facebook-ads':
      case 'facebook_ads':
        return '0 0 * * *';
      default:
        return '0 */6 * * *';
    }
  }

  /**
   * Get cron expression for report frequency
   */
  private getReportCronExpression(frequency: string): string {
    switch (frequency.toLowerCase()) {
      case 'daily':
        return '0 8 * * *';
      case 'weekly':
        return '0 8 * * 1';
      case 'monthly':
        return '0 8 1 * *';
      case 'quarterly':
        return '0 8 1 */3 *';
      default:
        return '0 8 * * 1';
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

export const jobScheduler = JobScheduler.getInstance();
