import { env } from '@/config/env'

/**
 * Base HTML template for all emails
 */
function baseTemplate(content: string, title: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 10px;
    }
    .content {
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 20px;
      font-weight: 600;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .logo-img {
      width: 48px;
      height: 48px;
      margin-bottom: 8px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
    .footer a {
      color: #2563eb;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="data:image/png;base64,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AAAC" alt="ThinkDoc" class="logo-img" style="width: 64px; height: 64px; margin-bottom: 8px;" />
      <div class="logo">ThinkDoc</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>This email was sent by ThinkDoc. If you have any questions, please contact our support team.</p>
      <p><a href="${env.APP_URL}">Visit ThinkDoc</a></p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Welcome email template
 */
export function welcomeEmailTemplate(userName: string | null, userEmail: string): string {
  const name = userName || 'there'
  const content = `
    <h1>Welcome to ThinkDoc!</h1>
    <p>Hi ${name},</p>
    <p>Thank you for signing up for ThinkDoc. We're excited to have you on board!</p>
    <p>ThinkDoc helps you review, draft, and manage legal documents with AI-powered assistance.</p>
    <h2>Getting Started</h2>
    <ul>
      <li>Open the ThinkDoc add-in in Microsoft Word</li>
      <li>Start by reviewing a document or generating a playbook</li>
      <li>Explore our library of clauses and playbooks</li>
    </ul>
    <p><a href="${env.APP_URL}" class="button" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600;">Get Started</a></p>
    <p>If you have any questions, feel free to reach out to our support team.</p>
    <p>Best regards,<br>The ThinkDoc Team</p>
  `
  return baseTemplate(content, 'Welcome to ThinkDoc')
}

/**
 * Subscription confirmation email template
 */
export function subscriptionConfirmationEmailTemplate(
  subscriptionType: string,
  billingPeriod: string,
  amount: string | null,
  currency: string
): string {
  const amountText = amount ? `${currency} ${amount}` : 'your subscription'
  const content = `
    <h1>Subscription Confirmed</h1>
    <p>Your ThinkDoc subscription has been successfully activated!</p>
    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <p><strong>Plan:</strong> ${subscriptionType}</p>
      <p><strong>Billing Period:</strong> ${billingPeriod}</p>
      ${amount ? `<p><strong>Amount:</strong> ${amountText}</p>` : ''}
    </div>
    <p>You now have full access to all ThinkDoc features.</p>
    <p><a href="${env.APP_URL}" class="button" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600;">Access ThinkDoc</a></p>
    <p>Best regards,<br>The ThinkDoc Team</p>
  `
  return baseTemplate(content, 'Subscription Confirmed')
}

/**
 * Trial ending reminder email template
 */
export function trialEndingEmailTemplate(trialEndDate: Date): string {
  const endDate = trialEndDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const content = `
    <h1>Your Trial Ends Soon</h1>
    <p>Your ThinkDoc trial will end on <strong>${endDate}</strong>.</p>
    <p>To continue using ThinkDoc after your trial ends, please subscribe to one of our plans.</p>
    <p><a href="${env.APP_URL}" class="button" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600;">Subscribe Now</a></p>
    <p>If you have any questions about our plans, feel free to contact our support team.</p>
    <p>Best regards,<br>The ThinkDoc Team</p>
  `
  return baseTemplate(content, 'Trial Ending Soon')
}

/**
 * Payment failed email template
 */
export function paymentFailedEmailTemplate(): string {
  const content = `
    <h1>Payment Failed</h1>
    <p>We were unable to process your payment for your ThinkDoc subscription.</p>
    <p>Please update your payment method to continue using ThinkDoc without interruption.</p>
    <p><a href="${env.APP_URL}" class="button" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600;">Update Payment Method</a></p>
    <p>If you continue to experience issues, please contact our support team.</p>
    <p>Best regards,<br>The ThinkDoc Team</p>
  `
  return baseTemplate(content, 'Payment Failed')
}

/**
 * Team invitation email template
 */
export function teamInviteEmailTemplate(
  inviterName: string | null,
  teamName: string,
  role: string
): string {
  const inviter = inviterName || 'A team member'
  const content = `
    <h1>You've Been Invited to a Team</h1>
    <p>${inviter} has invited you to join the <strong>${teamName}</strong> team on ThinkDoc.</p>
    <p><strong>Role:</strong> ${role}</p>
    <p>As a team member, you'll be able to collaborate on documents, share playbooks, and work together more efficiently.</p>
    <p><a href="${env.APP_URL}" class="button" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600;">Accept Invitation</a></p>
    <p>Best regards,<br>The ThinkDoc Team</p>
  `
  return baseTemplate(content, 'Team Invitation')
}

/**
 * Resource shared email template
 */
export function resourceSharedEmailTemplate(
  sharerName: string | null,
  resourceType: string,
  resourceName: string
): string {
  const sharer = sharerName || 'Someone'
  const resourceTypeLabel = resourceType === 'playbook' ? 'playbook' : resourceType === 'clause' ? 'clause' : 'resource'
  const content = `
    <h1>${sharer} Shared a ${resourceTypeLabel.charAt(0).toUpperCase() + resourceTypeLabel.slice(1)} with You</h1>
    <p>${sharer} has shared the <strong>${resourceName}</strong> ${resourceTypeLabel} with you.</p>
    <p>You can now access this ${resourceTypeLabel} in your ThinkDoc library.</p>
    <p><a href="${env.APP_URL}" class="button" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600;">View ${resourceTypeLabel.charAt(0).toUpperCase() + resourceTypeLabel.slice(1)}</a></p>
    <p>Best regards,<br>The ThinkDoc Team</p>
  `
  return baseTemplate(content, 'Resource Shared')
}

/**
 * Job completed email template
 */
export function jobCompletedEmailTemplate(
  jobType: string,
  jobName: string | null
): string {
  const jobTypeLabels: Record<string, string> = {
    'contract-review': 'Contract Review',
    'playbook-generation': 'Playbook Generation',
    'vault-extraction': 'Vault Extraction',
    'vault-ask': 'Vault Query',
    'redomicile': 'Redomicile',
    'review-with-precedents': 'Review with Precedents',
    'redraft': 'Redraft',
  }
  const jobLabel = jobTypeLabels[jobType] || jobType
  const displayName = jobName || jobLabel
  const content = `
    <h1>Your ${jobLabel} is Complete</h1>
    <p>Your ${displayName} has finished processing and is ready for review.</p>
    <p>You can now view the results in the ThinkDoc add-in.</p>
    <p><a href="${env.APP_URL}" class="button" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600;">View Results</a></p>
    <p>Best regards,<br>The ThinkDoc Team</p>
  `
  return baseTemplate(content, `${jobLabel} Complete`)
}

/**
 * Job failed email template
 */
export function jobFailedEmailTemplate(
  jobType: string,
  jobName: string | null,
  errorMessage?: string
): string {
  const jobTypeLabels: Record<string, string> = {
    'contract-review': 'Contract Review',
    'playbook-generation': 'Playbook Generation',
    'vault-extraction': 'Vault Extraction',
    'vault-ask': 'Vault Query',
    'redomicile': 'Redomicile',
    'review-with-precedents': 'Review with Precedents',
    'redraft': 'Redraft',
  }
  const jobLabel = jobTypeLabels[jobType] || jobType
  const displayName = jobName || jobLabel
  const content = `
    <h1>${jobLabel} Failed</h1>
    <p>Unfortunately, your ${displayName} encountered an error and could not be completed.</p>
    ${errorMessage ? `<p><strong>Error:</strong> ${errorMessage}</p>` : ''}
    <p>Please try again, or contact our support team if the issue persists.</p>
    <p><a href="${env.APP_URL}" class="button" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600;">Try Again</a></p>
    <p>Best regards,<br>The ThinkDoc Team</p>
  `
  return baseTemplate(content, `${jobLabel} Failed`)
}

/**
 * Password reset email template
 */
export function passwordResetEmailTemplate(resetToken: string, userName: string | null): string {
  const name = userName || 'there'
  const resetUrl = `${env.APP_URL}/reset-password?token=${encodeURIComponent(resetToken)}`
  const content = `
    <h1>Reset Your Password</h1>
    <p>Hi ${name},</p>
    <p>We received a request to reset your password for your ThinkDoc account.</p>
    <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
    <p><a href="${resetUrl}" class="button" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset Password</a></p>
    <p>If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #6b7280; font-size: 12px;">${resetUrl}</p>
    <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
    <p>Best regards,<br>The ThinkDoc Team</p>
  `
  return baseTemplate(content, 'Reset Your Password')
}

