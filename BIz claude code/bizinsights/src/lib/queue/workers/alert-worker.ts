/**
 * Alert Worker
 * Processes alert checking and notification jobs
 */

import { Job } from 'bull';
import { alertQueue } from '../queues';
import { prisma } from '@/lib/prisma';
import { AlertService } from '@/lib/services/alert-service';

export interface AlertJobData {
  organizationId: string;
  checkType: 'inventory' | 'performance' | 'integration' | 'all';
}

// Process alert jobs
alertQueue.process(async (job: Job<AlertJobData>) => {
  const { data } = job;

  console.log(`[Alert Worker] Processing alert job ${job.id}:`, {
    organizationId: data.organizationId,
    checkType: data.checkType,
  });

  try {
    await job.progress(10);

    const alertService = new AlertService(data.organizationId);

    await job.progress(30);

    // Check alerts based on type
    let alerts = [];

    if (data.checkType === 'all' || data.checkType === 'inventory') {
      const inventoryAlerts = await alertService.checkInventoryAlerts();
      alerts.push(...inventoryAlerts);
      await job.progress(50);
    }

    if (data.checkType === 'all' || data.checkType === 'performance') {
      const performanceAlerts = await alertService.checkPerformanceAlerts();
      alerts.push(...performanceAlerts);
      await job.progress(70);
    }

    if (data.checkType === 'all' || data.checkType === 'integration') {
      const integrationAlerts = await alertService.checkIntegrationAlerts();
      alerts.push(...integrationAlerts);
      await job.progress(90);
    }

    await job.progress(100);

    console.log(`[Alert Worker] Created ${alerts.length} alerts for organization ${data.organizationId}`);

    return {
      success: true,
      alertsCreated: alerts.length,
      alerts,
    };
  } catch (error) {
    console.error(`[Alert Worker] Error processing alert job ${job.id}:`, error);
    throw error;
  }
});

console.log('[Alert Worker] Worker initialized and ready');

export default alertQueue;
