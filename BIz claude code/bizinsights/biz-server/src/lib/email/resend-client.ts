import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set. Email functionality will be disabled.')
}

// Create Resend client singleton
export const resend = new Resend(process.env.RESEND_API_KEY || 'dummy-key')

// Email configuration
export const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'BizInsights <noreply@bizinsights.com>',
  replyTo: process.env.EMAIL_REPLY_TO,
  defaultDomain: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'
}

// Check if email is enabled
export function isEmailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY
}
