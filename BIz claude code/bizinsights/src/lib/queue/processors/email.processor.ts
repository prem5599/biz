/**
 * Email Sending Job Processor
 *
 * Handles background email delivery using Resend or other email services.
 */

import { Job } from 'bull';
import { EmailSendingJob } from '../queue-service';

export async function processEmailSending(job: Job<EmailSendingJob>): Promise<any> {
  const { to, subject, template, data, organizationId } = job.data;

  console.log(`Sending email: ${subject} to ${Array.isArray(to) ? to.join(', ') : to}`);

  try {
    await job.progress(10);

    // Check if email service is configured
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY not configured, skipping email');
      return {
        success: false,
        skipped: true,
        reason: 'Email service not configured',
      };
    }

    await job.progress(30);

    // Import Resend dynamically
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);

    // Get email template HTML
    const html = await getEmailTemplate(template, data);

    await job.progress(50);

    // Send email
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'BizInsights <noreply@bizinsights.com>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    await job.progress(100);

    console.log(`Email sent successfully: ${result.id}`);

    return {
      success: true,
      emailId: result.id,
      recipients: Array.isArray(to) ? to.length : 1,
      duration: Date.now() - job.timestamp,
    };
  } catch (error: any) {
    console.error(`Email sending failed:`, error);
    throw error;
  }
}

/**
 * Get email template HTML
 */
async function getEmailTemplate(template: string, data: any): Promise<string> {
  // Email templates
  const templates: Record<string, (data: any) => string> = {
    'report-delivery': (data) => `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Your ${data.reportType} Report is Ready</h1>
          <p>Hello,</p>
          <p>Your ${data.reportType} report for ${data.period} has been generated and is ready for download.</p>
          <p>
            <a href="${process.env.APP_URL}/reports/${data.reportId}"
               style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Report
            </a>
          </p>
          <p>This report will be available for download for 7 days.</p>
          <p>Best regards,<br>The BizInsights Team</p>
        </body>
      </html>
    `,

    'team-invitation': (data) => `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>You've been invited to join ${data.organizationName}</h1>
          <p>Hello,</p>
          <p>${data.inviterName} has invited you to join their team on BizInsights.</p>
          <p>
            <a href="${process.env.APP_URL}/accept-invitation?token=${data.token}"
               style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Accept Invitation
            </a>
          </p>
          <p>This invitation will expire in 7 days.</p>
          <p>Best regards,<br>The BizInsights Team</p>
        </body>
      </html>
    `,

    'alert-notification': (data) => `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: ${getSeverityColor(data.severity)};">
            ${data.severity} Alert: ${data.title}
          </h1>
          <p>${data.message}</p>
          <p>
            <a href="${process.env.APP_URL}/dashboard/alerts"
               style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Dashboard
            </a>
          </p>
          <p>Best regards,<br>The BizInsights Team</p>
        </body>
      </html>
    `,

    'welcome': (data) => `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Welcome to BizInsights!</h1>
          <p>Hello ${data.name},</p>
          <p>Thank you for signing up for BizInsights. We're excited to help you gain insights into your business data.</p>
          <h2>Getting Started</h2>
          <ol>
            <li>Connect your first integration (Shopify, Stripe, Google Analytics)</li>
            <li>Wait for data to sync (usually a few minutes)</li>
            <li>Explore your dashboard and insights</li>
          </ol>
          <p>
            <a href="${process.env.APP_URL}/dashboard/integrations"
               style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Connect Integration
            </a>
          </p>
          <p>Best regards,<br>The BizInsights Team</p>
        </body>
      </html>
    `,
  };

  const templateFn = templates[template];
  if (!templateFn) {
    throw new Error(`Email template not found: ${template}`);
  }

  return templateFn(data);
}

/**
 * Get color for severity level
 */
function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
      return '#ef4444';
    case 'HIGH':
      return '#f59e0b';
    case 'MEDIUM':
      return '#3b82f6';
    case 'LOW':
      return '#10b981';
    default:
      return '#6b7280';
  }
}
