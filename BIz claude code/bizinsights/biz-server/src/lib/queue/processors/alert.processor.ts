/**
 * Alert Job Processor
 *
 * Handles creation and delivery of alerts to users.
 */

import { Job } from 'bull';
import { AlertJob } from '../queue-service';
import { prisma } from '@/lib/prisma';

export async function processAlert(job: Job<AlertJob>): Promise<any> {
  const { organizationId, alertType, severity, message, metadata } = job.data;

  console.log(`Processing ${severity} alert for organization ${organizationId}`);

  try {
    await job.progress(10);

    // Create alert in database
    const alert = await prisma.alert.create({
      data: {
        organizationId,
        type: alertType,
        severity,
        title: `${alertType} Alert`,
        message,
        isRead: false,
        metadata: metadata || {},
      },
    });

    await job.progress(50);

    // Send email notification for high/critical alerts
    if (severity === 'HIGH' || severity === 'CRITICAL') {
      await sendAlertEmail(organizationId, alert);
    }

    await job.progress(100);

    console.log(`Alert created successfully: ${alert.id}`);

    return {
      success: true,
      alertId: alert.id,
      severity,
      emailSent: severity === 'HIGH' || severity === 'CRITICAL',
      duration: Date.now() - job.timestamp,
    };
  } catch (error: any) {
    console.error(`Alert processing failed for organization ${organizationId}:`, error);
    throw error;
  }
}

/**
 * Send alert email to organization members
 */
async function sendAlertEmail(organizationId: string, alert: any): Promise<void> {
  try {
    // Get organization members with email notification enabled
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        members: {
          include: {
            user: true,
          },
          where: {
            role: {
              in: ['OWNER', 'ADMIN'], // Only notify owners and admins
            },
          },
        },
      },
    });

    if (!organization || organization.members.length === 0) {
      console.log('No members to notify for alert');
      return;
    }

    // Get user emails
    const emails = organization.members
      .map((member) => member.user.email)
      .filter((email): email is string => email !== null);

    if (emails.length === 0) {
      console.log('No email addresses found for alert notification');
      return;
    }

    // Queue email sending job
    const { queueService, QueueName } = await import('../queue-service');

    await queueService.addJob(QueueName.EMAIL_SENDING, {
      to: emails,
      subject: `${alert.severity} Alert: ${alert.title}`,
      template: 'alert-notification',
      data: {
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        organizationName: organization.name,
      },
      organizationId,
    });

    console.log(`Alert email queued for ${emails.length} recipients`);
  } catch (error) {
    console.error('Failed to send alert email:', error);
  }
}
