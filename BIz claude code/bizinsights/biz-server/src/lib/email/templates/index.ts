// Email template base styles
const baseStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    margin: 0;
    padding: 0;
    background-color: #f4f4f4;
  }
  .container {
    max-width: 600px;
    margin: 40px auto;
    background: #ffffff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  .header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #ffffff;
    padding: 40px 30px;
    text-align: center;
  }
  .header h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 600;
  }
  .content {
    padding: 40px 30px;
  }
  .button {
    display: inline-block;
    padding: 14px 32px;
    background-color: #667eea;
    color: #ffffff !important;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 600;
    margin: 20px 0;
    transition: background-color 0.3s;
  }
  .button:hover {
    background-color: #5568d3;
  }
  .footer {
    background-color: #f8f9fa;
    padding: 30px;
    text-align: center;
    color: #6c757d;
    font-size: 14px;
  }
  .alert {
    padding: 16px;
    border-radius: 6px;
    margin: 20px 0;
  }
  .alert-info { background-color: #d1ecf1; border-left: 4px solid #0c5460; color: #0c5460; }
  .alert-warning { background-color: #fff3cd; border-left: 4px solid #856404; color: #856404; }
  .alert-error { background-color: #f8d7da; border-left: 4px solid #721c24; color: #721c24; }
  .alert-success { background-color: #d4edda; border-left: 4px solid #155724; color: #155724; }
  .divider {
    border: 0;
    border-top: 1px solid #e9ecef;
    margin: 30px 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  td {
    padding: 12px 0;
  }
  .label {
    font-weight: 600;
    color: #6c757d;
    font-size: 14px;
  }
  .value {
    font-weight: 500;
    color: #333;
  }
`

function emailTemplate(content: string, title?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'BizInsights'}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>
`
}

export function renderTeamInvitationEmail(params: {
  inviterName: string
  organizationName: string
  role: string
  invitationUrl: string
  expiryDays: number
}): string {
  const content = `
    <div class="header">
      <h1>🎉 You're Invited!</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>

      <p><strong>${params.inviterName}</strong> has invited you to join <strong>${params.organizationName}</strong> on BizInsights.</p>

      <div class="alert alert-info">
        <strong>Your Role:</strong> ${params.role}<br>
        <small>You'll have access to powerful business analytics and insights.</small>
      </div>

      <p>Click the button below to accept the invitation:</p>

      <div style="text-align: center;">
        <a href="${params.invitationUrl}" class="button">Accept Invitation</a>
      </div>

      <hr class="divider">

      <p style="font-size: 14px; color: #6c757d;">
        <strong>Note:</strong> This invitation will expire in ${params.expiryDays} days. If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${params.invitationUrl}" style="color: #667eea; word-break: break-all;">${params.invitationUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0;">You received this email because someone invited you to BizInsights.</p>
      <p style="margin: 10px 0 0 0;">© ${new Date().getFullYear()} BizInsights. All rights reserved.</p>
    </div>
  `
  return emailTemplate(content, 'Team Invitation')
}

export function renderWelcomeEmail(params: {
  userName: string
  dashboardUrl: string
}): string {
  const content = `
    <div class="header">
      <h1>Welcome to BizInsights! 🚀</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px;">Hi ${params.userName},</p>

      <p>We're excited to have you on board! BizInsights helps you unlock powerful insights from your business data.</p>

      <h3 style="margin-top: 30px;">Get Started:</h3>
      <ul style="line-height: 2;">
        <li>Connect your first integration (Shopify, Stripe, etc.)</li>
        <li>Explore AI-powered insights on your dashboard</li>
        <li>Set up automated reports</li>
        <li>Invite your team members</li>
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${params.dashboardUrl}" class="button">Go to Dashboard</a>
      </div>

      <div class="alert alert-success">
        <strong>Pro Tip:</strong> Connect multiple integrations to get comprehensive cross-platform analytics!
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0;">Need help? Reply to this email or visit our <a href="${params.dashboardUrl}/help" style="color: #667eea;">Help Center</a>.</p>
      <p style="margin: 10px 0 0 0;">© ${new Date().getFullYear()} BizInsights. All rights reserved.</p>
    </div>
  `
  return emailTemplate(content, 'Welcome to BizInsights')
}

export function renderReportEmail(params: {
  reportName: string
  reportPeriod: string
  reportUrl?: string
  downloadUrl?: string
}): string {
  const content = `
    <div class="header">
      <h1>📊 Your Report is Ready</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px;">Hi there,</p>

      <p>Your <strong>${params.reportName}</strong> for <strong>${params.reportPeriod}</strong> has been generated and is ready to view.</p>

      <table style="margin: 30px 0;">
        <tr>
          <td class="label">Report Name:</td>
          <td class="value">${params.reportName}</td>
        </tr>
        <tr>
          <td class="label">Period:</td>
          <td class="value">${params.reportPeriod}</td>
        </tr>
        <tr>
          <td class="label">Generated:</td>
          <td class="value">${new Date().toLocaleString()}</td>
        </tr>
      </table>

      ${params.reportUrl || params.downloadUrl ? `
        <div style="text-align: center;">
          ${params.reportUrl ? `<a href="${params.reportUrl}" class="button">View Report</a>` : ''}
          ${params.downloadUrl ? `<a href="${params.downloadUrl}" class="button" style="background-color: #28a745;">Download PDF</a>` : ''}
        </div>
      ` : '<p><em>Your report is attached to this email.</em></p>'}

      <hr class="divider">

      <p style="font-size: 14px; color: #6c757d;">
        This is an automated report delivery. You can manage your report settings in the dashboard.
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0;">© ${new Date().getFullYear()} BizInsights. All rights reserved.</p>
    </div>
  `
  return emailTemplate(content, `${params.reportName} - ${params.reportPeriod}`)
}

export function renderAlertEmail(params: {
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  actionUrl?: string
  actionLabel?: string
}): string {
  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '🚨',
    success: '✅'
  }

  const content = `
    <div class="header">
      <h1>${icons[params.type]} Alert Notification</h1>
    </div>
    <div class="content">
      <h2 style="margin-top: 0;">${params.title}</h2>

      <div class="alert alert-${params.type}">
        ${params.message}
      </div>

      ${params.actionUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${params.actionUrl}" class="button">${params.actionLabel || 'View Details'}</a>
        </div>
      ` : ''}

      <hr class="divider">

      <p style="font-size: 14px; color: #6c757d;">
        You received this alert based on your notification preferences. You can manage alerts in your dashboard settings.
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0;">© ${new Date().getFullYear()} BizInsights. All rights reserved.</p>
    </div>
  `
  return emailTemplate(content, `Alert: ${params.title}`)
}

export function renderPasswordResetEmail(params: {
  userName: string
  resetUrl: string
  expiryHours: number
}): string {
  const content = `
    <div class="header">
      <h1>🔐 Reset Your Password</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px;">Hi ${params.userName},</p>

      <p>We received a request to reset your password for your BizInsights account.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${params.resetUrl}" class="button">Reset Password</a>
      </div>

      <div class="alert alert-warning">
        <strong>Security Notice:</strong> This link will expire in ${params.expiryHours} hour${params.expiryHours > 1 ? 's' : ''}.
      </div>

      <p style="font-size: 14px; color: #6c757d;">
        If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>

      <hr class="divider">

      <p style="font-size: 14px; color: #6c757d;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${params.resetUrl}" style="color: #667eea; word-break: break-all;">${params.resetUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0;">© ${new Date().getFullYear()} BizInsights. All rights reserved.</p>
    </div>
  `
  return emailTemplate(content, 'Password Reset Request')
}
