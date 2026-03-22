/**
 * Email Sending Job Processor
 *
 * Handles background email delivery using Resend or other email services.
 */

import { Job } from 'bull';
import { EmailService } from '@/lib/email/email-service';

export interface EmailSendingJob {
  type: 'team-invitation' | 'welcome' | 'report' | 'alert' | 'password-reset'
  to: string | string[]
  organizationId?: string

  // Team invitation specific
  inviterName?: string
  organizationName?: string
  role?: string
  invitationToken?: string

  // Welcome email specific
  userName?: string

  // Report email specific
  reportName?: string
  reportPeriod?: string
  reportUrl?: string
  pdfAttachment?: Buffer

  // Alert email specific
  alertTitle?: string
  alertMessage?: string
  alertType?: 'info' | 'warning' | 'error' | 'success'
  actionUrl?: string

  // Password reset specific
  resetToken?: string
}

export async function processEmailSending(job: Job<EmailSendingJob>): Promise<any> {
  const { data } = job

  console.log('[Email Processor] Processing email job:', data.type, 'to:', data.to)

  try {
    await job.progress(10)

    let result: { success: boolean; error?: string; messageId?: string }

    switch (data.type) {
      case 'team-invitation':
        if (!data.inviterName || !data.organizationName || !data.role || !data.invitationToken) {
          throw new Error('Missing required fields for team invitation email')
        }
        await job.progress(30)
        result = await EmailService.sendTeamInvitation({
          to: data.to as string,
          inviterName: data.inviterName,
          organizationName: data.organizationName,
          role: data.role,
          invitationToken: data.invitationToken
        })
        break

      case 'welcome':
        if (!data.userName) {
          throw new Error('Missing required fields for welcome email')
        }
        await job.progress(30)
        result = await EmailService.sendWelcomeEmail({
          to: data.to as string,
          userName: data.userName
        })
        break

      case 'report':
        if (!data.reportName || !data.reportPeriod) {
          throw new Error('Missing required fields for report email')
        }
        await job.progress(30)
        result = await EmailService.sendReport({
          to: data.to,
          reportName: data.reportName,
          reportPeriod: data.reportPeriod,
          reportUrl: data.reportUrl,
          pdfAttachment: data.pdfAttachment
        })
        break

      case 'alert':
        if (!data.alertTitle || !data.alertMessage || !data.alertType) {
          throw new Error('Missing required fields for alert email')
        }
        await job.progress(30)
        result = await EmailService.sendAlert({
          to: data.to,
          alertTitle: data.alertTitle,
          alertMessage: data.alertMessage,
          alertType: data.alertType,
          actionUrl: data.actionUrl
        })
        break

      case 'password-reset':
        if (!data.userName || !data.resetToken) {
          throw new Error('Missing required fields for password reset email')
        }
        await job.progress(30)
        result = await EmailService.sendPasswordReset({
          to: data.to as string,
          userName: data.userName,
          resetToken: data.resetToken
        })
        break

      default:
        throw new Error(`Unknown email type: ${(data as any).type}`)
    }

    await job.progress(80)

    if (!result.success) {
      throw new Error(result.error || 'Email sending failed')
    }

    await job.progress(100)

    console.log('[Email Processor] Email sent successfully:', data.type, 'ID:', result.messageId)

    return {
      success: true,
      emailId: result.messageId,
      recipients: Array.isArray(data.to) ? data.to.length : 1,
      duration: Date.now() - job.timestamp,
    }
  } catch (error) {
    console.error('[Email Processor] Error sending email:', error)
    throw error // Re-throw to mark job as failed
  }
}
