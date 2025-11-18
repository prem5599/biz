import { Resend } from 'resend'
import { PDFGenerator } from '../pdf-generator'
import { ReportContent } from '../report-service'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export interface ReportEmailOptions {
  to: string | string[]
  report: ReportContent
  includeAttachment?: boolean
}

export class EmailService {
  private static fromAddress = process.env.EMAIL_FROM || 'reports@bizinsights.app'
  private static fromName = 'BizInsights Reports'

  /**
   * Send a generic email
   */
  static async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn('[EmailService] RESEND_API_KEY not configured, skipping email send')
        return { success: false, error: 'Email service not configured' }
      }

      const recipients = Array.isArray(options.to) ? options.to : [options.to]

      const emailData: any = {
        from: `${EmailService.fromName} <${EmailService.fromAddress}>`,
        to: recipients,
        subject: options.subject,
        html: options.html,
      }

      if (options.text) {
        emailData.text = options.text
      }

      if (options.attachments && options.attachments.length > 0) {
        emailData.attachments = options.attachments.map(att => ({
          filename: att.filename,
          content: att.content,
          type: att.contentType
        }))
      }

      const result = await resend.emails.send(emailData)

      console.log('[EmailService] Email sent successfully:', result)
      return { success: true }
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Send a report via email with optional PDF attachment
   */
  static async sendReport(options: ReportEmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const { report, to, includeAttachment = true } = options

      let pdfBuffer: Buffer | undefined

      // Generate PDF if attachment is requested
      if (includeAttachment) {
        const pdfGenerator = new PDFGenerator()
        pdfBuffer = await pdfGenerator.generateReportPDF(report)
      }

      // Generate HTML email body
      const emailHtml = EmailService.generateReportEmailHTML(report)
      const emailText = EmailService.generateReportEmailText(report)

      const emailOptions: EmailOptions = {
        to,
        subject: `${report.title} - ${new Date(report.generatedAt).toLocaleDateString()}`,
        html: emailHtml,
        text: emailText,
      }

      // Add PDF attachment if available
      if (pdfBuffer) {
        emailOptions.attachments = [
          {
            filename: `${report.title.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      }

      return await EmailService.sendEmail(emailOptions)
    } catch (error) {
      console.error('[EmailService] Failed to send report:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Send weekly digest email
   */
  static async sendWeeklyDigest(
    to: string,
    organizationName: string,
    metrics: {
      revenue: number
      orders: number
      customers: number
      revenueChange: number
    },
    insights: string[]
  ): Promise<{ success: boolean; error?: string }> {
    const html = EmailService.generateWeeklyDigestHTML(organizationName, metrics, insights)
    const text = EmailService.generateWeeklyDigestText(organizationName, metrics, insights)

    return await EmailService.sendEmail({
      to,
      subject: `Weekly Business Summary - ${organizationName}`,
      html,
      text
    })
  }

  /**
   * Send alert notification email
   */
  static async sendAlert(
    to: string | string[],
    alertTitle: string,
    alertDescription: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    actionUrl?: string
  ): Promise<{ success: boolean; error?: string }> {
    const html = EmailService.generateAlertEmailHTML(alertTitle, alertDescription, severity, actionUrl)
    const text = `Alert: ${alertTitle}\n\n${alertDescription}${actionUrl ? `\n\nTake action: ${actionUrl}` : ''}`

    return await EmailService.sendEmail({
      to,
      subject: `${severity} Alert: ${alertTitle}`,
      html,
      text
    })
  }

  /**
   * Send team invitation email
   */
  static async sendTeamInvitation(
    to: string,
    organizationName: string,
    inviterName: string,
    invitationLink: string,
    role: string
  ): Promise<{ success: boolean; error?: string }> {
    const html = EmailService.generateInvitationEmailHTML(
      organizationName,
      inviterName,
      invitationLink,
      role
    )

    return await EmailService.sendEmail({
      to,
      subject: `You've been invited to join ${organizationName} on BizInsights`,
      html
    })
  }

  /**
   * Send welcome email
   */
  static async sendWelcomeEmail(
    to: string,
    userName: string,
    organizationName: string
  ): Promise<{ success: boolean; error?: string }> {
    const html = EmailService.generateWelcomeEmailHTML(userName, organizationName)

    return await EmailService.sendEmail({
      to,
      subject: `Welcome to BizInsights!`,
      html
    })
  }

  // HTML Email Templates

  private static generateReportEmailHTML(report: ReportContent): string {
    const topInsights = report.insights?.slice(0, 5) || []
    const topRecommendations = report.recommendations?.slice(0, 3) || []

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .metric-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 10px 0; }
    .metric-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .metric-value { font-size: 24px; font-weight: bold; color: #1f2937; margin-top: 5px; }
    .insight { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; margin: 10px 0; }
    .recommendation { background: #f0fdf4; border-left: 4px solid #10b981; padding: 12px; margin: 10px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-radius: 0 0 8px 8px; }
    .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">${report.title}</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">${report.organization.name}</p>
      <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 14px;">
        ${new Date(report.period.start).toLocaleDateString()} - ${new Date(report.period.end).toLocaleDateString()}
      </p>
    </div>

    <div class="content">
      <h2>Executive Summary</h2>
      <p>${report.executiveSummary}</p>

      <h2>Key Metrics</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        ${Object.entries(report.keyMetrics).slice(0, 4).map(([key, value]) => `
          <div class="metric-card">
            <div class="metric-label">${key.replace(/([A-Z])/g, ' $1').trim()}</div>
            <div class="metric-value">${typeof value === 'number' ? value.toLocaleString() : value}</div>
          </div>
        `).join('')}
      </div>

      ${topInsights.length > 0 ? `
        <h2>Top Insights</h2>
        ${topInsights.map((insight: any) => `
          <div class="insight">
            <strong>${insight.title}</strong>
            <p style="margin: 5px 0 0 0;">${insight.description}</p>
          </div>
        `).join('')}
      ` : ''}

      ${topRecommendations.length > 0 ? `
        <h2>Recommendations</h2>
        ${topRecommendations.map((rec: string, index: number) => `
          <div class="recommendation">
            <strong>${index + 1}.</strong> ${rec}
          </div>
        `).join('')}
      ` : ''}

      <p style="text-align: center; margin-top: 30px;">
        <a href="${process.env.NEXTAUTH_URL}/dashboard/reports" class="btn">View Full Report</a>
      </p>
    </div>

    <div class="footer">
      <p>This report was automatically generated by BizInsights</p>
      <p>© ${new Date().getFullYear()} BizInsights. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  private static generateReportEmailText(report: ReportContent): string {
    return `
${report.title}
${report.organization.name}
Period: ${new Date(report.period.start).toLocaleDateString()} - ${new Date(report.period.end).toLocaleDateString()}

EXECUTIVE SUMMARY
${report.executiveSummary}

KEY METRICS
${Object.entries(report.keyMetrics).map(([key, value]) => `${key}: ${value}`).join('\n')}

${report.insights && report.insights.length > 0 ? `
TOP INSIGHTS
${report.insights.slice(0, 5).map((insight: any, i: number) => `${i + 1}. ${insight.title}\n   ${insight.description}`).join('\n\n')}
` : ''}

View the full report at: ${process.env.NEXTAUTH_URL}/dashboard/reports
    `.trim()
  }

  private static generateWeeklyDigestHTML(
    organizationName: string,
    metrics: { revenue: number; orders: number; customers: number; revenueChange: number },
    insights: string[]
  ): string {
    const changeColor = metrics.revenueChange >= 0 ? '#10b981' : '#ef4444'
    const changeSymbol = metrics.revenueChange >= 0 ? '↑' : '↓'

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .metric { text-align: center; padding: 20px; border-bottom: 1px solid #e5e7eb; }
    .metric-value { font-size: 32px; font-weight: bold; color: #1f2937; }
    .metric-label { font-size: 14px; color: #6b7280; margin-top: 5px; }
    .insight { background: #eff6ff; padding: 15px; margin: 10px 0; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Weekly Summary</h1>
      <p>${organizationName}</p>
    </div>
    <div style="background: white; border: 1px solid #e5e7eb; border-top: none;">
      <div class="metric">
        <div class="metric-value" style="color: ${changeColor};">
          ${changeSymbol} $${metrics.revenue.toLocaleString()}
        </div>
        <div class="metric-label">Revenue (${Math.abs(metrics.revenueChange)}% vs last week)</div>
      </div>
      <div class="metric">
        <div class="metric-value">${metrics.orders}</div>
        <div class="metric-label">Orders</div>
      </div>
      <div class="metric">
        <div class="metric-value">${metrics.customers}</div>
        <div class="metric-label">Customers</div>
      </div>
      <div style="padding: 20px;">
        <h2>This Week's Insights</h2>
        ${insights.map(insight => `<div class="insight">${insight}</div>`).join('')}
      </div>
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  private static generateWeeklyDigestText(
    organizationName: string,
    metrics: { revenue: number; orders: number; customers: number; revenueChange: number },
    insights: string[]
  ): string {
    return `
Weekly Summary - ${organizationName}

REVENUE: $${metrics.revenue.toLocaleString()} (${metrics.revenueChange >= 0 ? '+' : ''}${metrics.revenueChange}% vs last week)
ORDERS: ${metrics.orders}
CUSTOMERS: ${metrics.customers}

THIS WEEK'S INSIGHTS:
${insights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}
    `.trim()
  }

  private static generateAlertEmailHTML(
    title: string,
    description: string,
    severity: string,
    actionUrl?: string
  ): string {
    const severityColors = {
      CRITICAL: '#dc2626',
      HIGH: '#f59e0b',
      MEDIUM: '#3b82f6',
      LOW: '#10b981'
    }

    const color = severityColors[severity as keyof typeof severityColors] || '#3b82f6'

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert-header { background: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .alert-body { background: white; border: 2px solid ${color}; border-top: none; padding: 20px; border-radius: 0 0 8px 8px; }
    .btn { display: inline-block; background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert-header">
      <h1 style="margin: 0;">${severity} Alert</h1>
    </div>
    <div class="alert-body">
      <h2>${title}</h2>
      <p>${description}</p>
      ${actionUrl ? `<p><a href="${actionUrl}" class="btn">Take Action</a></p>` : ''}
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  private static generateInvitationEmailHTML(
    organizationName: string,
    inviterName: string,
    invitationLink: string,
    role: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>You've been invited to BizInsights!</h1>
    <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> as a <strong>${role}</strong>.</p>
    <p>BizInsights helps you analyze your business data and get AI-powered insights to grow your business.</p>
    <p><a href="${invitationLink}" class="btn">Accept Invitation</a></p>
    <p style="color: #6b7280; font-size: 14px;">This invitation will expire in 7 days.</p>
  </div>
</body>
</html>
    `.trim()
  }

  private static generateWelcomeEmailHTML(userName: string, organizationName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px; }
    .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
    .feature { padding: 15px; margin: 10px 0; background: #f9fafb; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Welcome to BizInsights!</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Your journey to better business insights starts here</p>
    </div>

    <div style="padding: 20px 0;">
      <h2>Hi ${userName},</h2>
      <p>Welcome to <strong>${organizationName}</strong> on BizInsights! We're excited to help you grow your business with data-driven insights.</p>

      <h3>Get Started:</h3>
      <div class="feature">
        <strong>1. Connect Your First Integration</strong>
        <p>Link your Shopify store, Stripe account, or Google Analytics to start seeing insights.</p>
      </div>
      <div class="feature">
        <strong>2. Explore Your Dashboard</strong>
        <p>View real-time metrics, charts, and AI-powered recommendations.</p>
      </div>
      <div class="feature">
        <strong>3. Set Up Automated Reports</strong>
        <p>Schedule weekly or monthly reports delivered right to your inbox.</p>
      </div>

      <p style="text-align: center;">
        <a href="${process.env.NEXTAUTH_URL}/dashboard" class="btn">Go to Dashboard</a>
      </p>

      <p>Need help? Reply to this email or check out our <a href="${process.env.NEXTAUTH_URL}/docs">documentation</a>.</p>

      <p>Happy analyzing!<br>The BizInsights Team</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }
}
