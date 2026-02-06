import { Resend } from 'resend'
import { db } from '@/config/database'
import { notifications, users, type NewNotification } from '@/db/schema/index'
import { eq } from 'drizzle-orm'
import { env } from '@/config/env'
import { logger } from '@/config/logger'
import {
  welcomeEmailTemplate,
  subscriptionConfirmationEmailTemplate,
  trialEndingEmailTemplate,
  paymentFailedEmailTemplate,
  teamInviteEmailTemplate,
  resourceSharedEmailTemplate,
  jobCompletedEmailTemplate,
  jobFailedEmailTemplate,
} from './email-templates'

// Initialize Resend
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

export type NotificationType =
  | 'welcome'
  | 'subscription_confirmed'
  | 'subscription_trial_ending'
  | 'subscription_payment_failed'
  | 'team_invite'
  | 'resource_shared'
  | 'job_complete'
  | 'job_failed'

export interface NotificationData {
  // Common
  userEmail?: string
  userName?: string | null

  // Subscription
  subscriptionType?: string
  billingPeriod?: string
  amount?: string | null
  currency?: string
  trialEndDate?: Date

  // Team
  inviterName?: string | null
  teamName?: string
  role?: string

  // Resource sharing
  sharerName?: string | null
  resourceType?: string
  resourceName?: string

  // Job
  jobType?: string
  jobName?: string | null
  errorMessage?: string
}

/**
 * Unified notification service
 * Creates in-app notification AND sends email
 */
export async function notify(
  userId: string,
  type: NotificationType,
  data: NotificationData
): Promise<void> {
  try {
    // Get user email if not provided
    let userEmail = data.userEmail
    if (!userEmail) {
      const [user] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      if (!user) {
        logger.warn({ userId }, 'User not found for notification')
        return
      }
      userEmail = user.email
    }

    // Create in-app notification
    const notification = await createInAppNotification(userId, type, data)

    // Send email notification if Resend is configured
    if (resend && env.RESEND_FROM_EMAIL) {
      sendEmail(userEmail, type, data).catch((error) => {
        logger.error({ error, userId, type }, 'Failed to send notification email')
      })
    }

    logger.info({ userId, type, notificationId: notification.id }, 'Notification sent')
  } catch (error) {
    logger.error({ error, userId, type }, 'Failed to send notification')
    throw error
  }
}

/**
 * Create in-app notification in database
 */
async function createInAppNotification(
  userId: string,
  type: NotificationType,
  data: NotificationData
): Promise<{ id: string }> {
  const { title, message } = getNotificationContent(type, data)

  const newNotification: NewNotification = {
    userId,
    type,
    title,
    message,
    metadata: data,
    isRead: false,
  }

  const [notification] = await db
    .insert(notifications)
    .values(newNotification)
    .returning({ id: notifications.id })

  if (!notification) {
    throw new Error('Failed to create notification')
  }

  return notification
}

/**
 * Send email notification using Resend
 */
async function sendEmail(
  userEmail: string,
  type: NotificationType,
  data: NotificationData
): Promise<void> {
  if (!resend) {
    logger.warn('Resend not configured, skipping email')
    return
  }

  const { subject, html } = getEmailContent(type, data)

  const { error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL!,
    to: userEmail,
    subject,
    html,
  })

  if (error) {
    throw new Error(`Resend error: ${error.message}`)
  }
}

/**
 * Get notification title and message for in-app notification
 */
function getNotificationContent(
  type: NotificationType,
  data: NotificationData
): { title: string; message: string } {
  switch (type) {
    case 'welcome':
      return {
        title: 'Welcome to ThinkDoc!',
        message: 'Thank you for signing up. Get started by reviewing a document or generating a playbook.',
      }

    case 'subscription_confirmed':
      return {
        title: 'Subscription Confirmed',
        message: `Your ${data.subscriptionType || 'subscription'} has been activated. You now have full access to all features.`,
      }

    case 'subscription_trial_ending':
      const endDate = data.trialEndDate?.toLocaleDateString() || 'soon'
      return {
        title: 'Trial Ending Soon',
        message: `Your trial ends on ${endDate}. Subscribe now to continue using ThinkDoc.`,
      }

    case 'subscription_payment_failed':
      return {
        title: 'Payment Failed',
        message: 'We were unable to process your payment. Please update your payment method.',
      }

    case 'team_invite':
      return {
        title: 'Team Invitation',
        message: `${data.inviterName || 'Someone'} invited you to join ${data.teamName || 'a team'}.`,
      }

    case 'resource_shared':
      return {
        title: 'Resource Shared',
        message: `${data.sharerName || 'Someone'} shared ${data.resourceName || 'a resource'} with you.`,
      }

    case 'job_complete': {
      const jobTypeLabels: Record<string, string> = {
        'contract-review': 'Contract Review',
        'playbook-generation': 'Playbook Generation',
        'vault-extraction': 'Vault Extraction',
        'vault-ask': 'Vault Query',
        'redomicile': 'Redomicile',
        'review-with-precedents': 'Review with Precedents',
        'redraft': 'Redraft',
      }
      const jobLabel = jobTypeLabels[data.jobType || ''] || data.jobType || 'Job'
      return {
        title: `${jobLabel} Complete`,
        message: `Your ${data.jobName || jobLabel.toLowerCase()} has finished processing and is ready for review.`,
      }
    }

    case 'job_failed': {
      const jobTypeLabels: Record<string, string> = {
        'contract-review': 'Contract Review',
        'playbook-generation': 'Playbook Generation',
        'vault-extraction': 'Vault Extraction',
        'vault-ask': 'Vault Query',
        'redomicile': 'Redomicile',
        'review-with-precedents': 'Review with Precedents',
        'redraft': 'Redraft',
      }
      const jobLabel = jobTypeLabels[data.jobType || ''] || data.jobType || 'Job'
      return {
        title: `${jobLabel} Failed`,
        message: `Your ${data.jobName || jobLabel.toLowerCase()} encountered an error. ${data.errorMessage || 'Please try again.'}`,
      }
    }

    default:
      return {
        title: 'Notification',
        message: 'You have a new notification.',
      }
  }
}

/**
 * Get email subject and HTML content
 */
function getEmailContent(
  type: NotificationType,
  data: NotificationData
): { subject: string; html: string } {
  switch (type) {
    case 'welcome':
      return {
        subject: 'Welcome to ThinkDoc!',
        html: welcomeEmailTemplate(data.userName || null, data.userEmail || ''),
      }

    case 'subscription_confirmed':
      return {
        subject: 'Subscription Confirmed',
        html: subscriptionConfirmationEmailTemplate(
          data.subscriptionType || 'subscription',
          data.billingPeriod || 'monthly',
          data.amount || null,
          data.currency || 'USD'
        ),
      }

    case 'subscription_trial_ending':
      return {
        subject: 'Your Trial Ends Soon',
        html: trialEndingEmailTemplate(data.trialEndDate || new Date()),
      }

    case 'subscription_payment_failed':
      return {
        subject: 'Payment Failed',
        html: paymentFailedEmailTemplate(),
      }

    case 'team_invite':
      return {
        subject: 'You\'ve Been Invited to a Team',
        html: teamInviteEmailTemplate(
          data.inviterName || null,
          data.teamName || 'Team',
          data.role || 'member'
        ),
      }

    case 'resource_shared':
      return {
        subject: 'Resource Shared with You',
        html: resourceSharedEmailTemplate(
          data.sharerName || null,
          data.resourceType || 'resource',
          data.resourceName || 'Resource'
        ),
      }

    case 'job_complete':
      return {
        subject: 'Your Job is Complete',
        html: jobCompletedEmailTemplate(
          data.jobType || 'job',
          data.jobName || null
        ),
      }

    case 'job_failed':
      return {
        subject: 'Job Failed',
        html: jobFailedEmailTemplate(
          data.jobType || 'job',
          data.jobName || null,
          data.errorMessage
        ),
      }

    default:
      return {
        subject: 'Notification from ThinkDoc',
        html: '<p>You have a new notification.</p>',
      }
  }
}
