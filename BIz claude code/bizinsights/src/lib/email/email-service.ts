import { resend, EMAIL_CONFIG, isEmailEnabled } from './resend-client'
import {
  renderTeamInvitationEmail,
  renderWelcomeEmail,
  renderReportEmail,
  renderAlertEmail,
  renderPasswordResetEmail
} from './templates'

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export class EmailService {
  /**
   * Send a generic email
   */
  static async send(options: EmailOptions): Promise<{ success: boolean; error?: string; messageId?: string }> {
    if (!isEmailEnabled()) {
      console.warn('[Email] Resend not configured. Email not sent:', options.subject)
      return { success: false, error: 'Email service not configured' }
    }

    try {
      const response = await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo || EMAIL_CONFIG.replyTo,
        attachments: options.attachments
      })

      if (response.error) {
        console.error('[Email] Failed to send email:', response.error)
        return { success: false, error: response.error.message }
      }

      console.log('[Email] Email sent successfully:', response.data?.id)
      return { success: true, messageId: response.data?.id }
    } catch (error) {
      console.error('[Email] Error sending email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Send team invitation email
   */
  static async sendTeamInvitation(params: {
    to: string
    inviterName: string
    organizationName: string
    role: string
    invitationToken: string
  }): Promise<{ success: boolean; error?: string }> {
    const invitationUrl = `${EMAIL_CONFIG.defaultDomain}/team/accept-invitation?token=${params.invitationToken}`

    const html = renderTeamInvitationEmail({
      inviterName: params.inviterName,
      organizationName: params.organizationName,
      role: params.role,
      invitationUrl,
      expiryDays: 7
    })

    return this.send({
      to: params.to,
      subject: `You've been invited to join ${params.organizationName} on BizInsights`,
      html
    })
  }

  /**
   * Send welcome email to new users
   */
  static async sendWelcomeEmail(params: {
    to: string
    userName: string
  }): Promise<{ success: boolean; error?: string }> {
    const html = renderWelcomeEmail({
      userName: params.userName,
      dashboardUrl: `${EMAIL_CONFIG.defaultDomain}/dashboard`
    })

    return this.send({
      to: params.to,
      subject: 'Welcome to BizInsights!',
      html
    })
  }

  /**
   * Send report via email
   */
  static async sendReport(params: {
    to: string | string[]
    reportName: string
    reportPeriod: string
    reportUrl?: string
    pdfAttachment?: Buffer
  }): Promise<{ success: boolean; error?: string }> {
    const html = renderReportEmail({
      reportName: params.reportName,
      reportPeriod: params.reportPeriod,
      reportUrl: params.reportUrl,
      downloadUrl: params.reportUrl
    })

    const attachments = params.pdfAttachment ? [{
      filename: `${params.reportName.replace(/\s+/g, '_')}.pdf`,
      content: params.pdfAttachment,
      contentType: 'application/pdf'
    }] : undefined

    return this.send({
      to: params.to,
      subject: `Your ${params.reportName} - ${params.reportPeriod}`,
      html,
      attachments
    })
  }

  /**
   * Send alert notification
   */
  static async sendAlert(params: {
    to: string | string[]
    alertTitle: string
    alertMessage: string
    alertType: 'info' | 'warning' | 'error' | 'success'
    actionUrl?: string
  }): Promise<{ success: boolean; error?: string }> {
    const html = renderAlertEmail({
      title: params.alertTitle,
      message: params.alertMessage,
      type: params.alertType,
      actionUrl: params.actionUrl,
      actionLabel: params.actionUrl ? 'View Details' : undefined
    })

    return this.send({
      to: params.to,
      subject: `Alert: ${params.alertTitle}`,
      html
    })
  }

  /**
   * Send password reset email
   */
  static async sendPasswordReset(params: {
    to: string
    userName: string
    resetToken: string
  }): Promise<{ success: boolean; error?: string }> {
    const resetUrl = `${EMAIL_CONFIG.defaultDomain}/auth/reset-password?token=${params.resetToken}`

    const html = renderPasswordResetEmail({
      userName: params.userName,
      resetUrl,
      expiryHours: 1
    })

    return this.send({
      to: params.to,
      subject: 'Reset your BizInsights password',
      html
    })
  }

  /**
   * Send bulk emails (for newsletters, announcements, etc.)
   */
  static async sendBulk(params: {
    recipients: Array<{ email: string; name?: string }>
    subject: string
    html: string
  }): Promise<{ success: boolean; error?: string; sentCount: number }> {
    const results = await Promise.all(
      params.recipients.map(recipient =>
        this.send({
          to: recipient.email,
          subject: params.subject,
          html: params.html
        })
      )
    )

    const sentCount = results.filter(r => r.success).length
    const hasErrors = results.some(r => !r.success)

    return {
      success: !hasErrors,
      sentCount,
      error: hasErrors ? 'Some emails failed to send' : undefined
    }
  }
}
