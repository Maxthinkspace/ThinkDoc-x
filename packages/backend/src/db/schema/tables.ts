import { pgTable, text, timestamp, uuid, jsonb, boolean, index, integer } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash'),
  organizationId: uuid('organization_id'), // Will reference organizations table - FK added in migration
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  organizationIdIdx: index('users_organization_id_idx').on(table.organizationId),
}))

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
  tokenIdx: index('sessions_token_idx').on(table.token),
}))

export const playbooks = pgTable('playbooks', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  playbookName: text('playbook_name').notNull(),
  description: text('description'),
  playbookType: text('playbook_type'), // 'review', 'edit', etc.
  userPosition: text('user_position'), // 'Neutral', 'Buyer', 'Seller', etc.
  jurisdiction: text('jurisdiction'), // 'Singapore', 'New York', etc.
  tags: text('tags'),
  rules: jsonb('rules').notNull(), // Store complete rules structure as JSON
  metadata: jsonb('metadata'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('playbooks_user_id_idx').on(table.userId),
  playbookNameIdx: index('playbooks_playbook_name_idx').on(table.playbookName),
  playbookTypeIdx: index('playbooks_playbook_type_idx').on(table.playbookType),
  createdAtIdx: index('playbooks_created_at_idx').on(table.createdAt),
}))

export const playbookShares = pgTable('playbook_shares', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  playbookId: uuid('playbook_id').notNull().references(() => playbooks.id, { onDelete: 'cascade' }),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sharedWithUserId: uuid('shared_with_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  shareType: text('share_type').notNull(), // 'view' | 'remix'
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  playbookIdIdx: index('playbook_shares_playbook_id_idx').on(table.playbookId),
  ownerIdIdx: index('playbook_shares_owner_id_idx').on(table.ownerId),
  sharedWithUserIdIdx: index('playbook_shares_shared_with_user_id_idx').on(table.sharedWithUserId),
  uniqueShare: index('playbook_shares_unique_idx').on(table.playbookId, table.sharedWithUserId),
}))

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content'),
  metadata: jsonb('metadata'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('documents_user_id_idx').on(table.userId),
  titleIdx: index('documents_title_idx').on(table.title),
}))

export const paragraphs = pgTable('paragraphs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),

  // Word paragraph specific fields
  text: text('text').notNull(), // Paragraph text content
  paragraphIndex: integer('paragraph_index').notNull(), // 0-based index within document
  styleId: text('style_id'), // Word style identifier (e.g., 'Heading1', 'Normal')
  styleName: text('style_name'), // Human-readable style name
  alignment: text('alignment'), // 'left', 'center', 'right', 'justify'
  indentLeft: integer('indent_left'), // Left indent in points
  indentRight: integer('indent_right'), // Right indent in points
  indentFirstLine: integer('indent_first_line'), // First line indent in points
  spaceBefore: integer('space_before'), // Space before paragraph in points
  spaceAfter: integer('space_after'), // Space after paragraph in points
  lineSpacing: text('line_spacing'), // Line spacing value
  lineSpacingRule: text('line_spacing_rule'), // 'atLeast', 'exactly', 'multiple'

  // Office.js integration
  wordParagraphId: text('word_paragraph_id'), // Office.js paragraph ID for tracking
  range: jsonb('range'), // Store Word range information

  // Common fields following existing pattern
  metadata: jsonb('metadata'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  documentIdIdx: index('paragraphs_document_id_idx').on(table.documentId),
  paragraphIndexIdx: index('paragraphs_paragraph_index_idx').on(table.paragraphIndex),
  wordParagraphIdIdx: index('paragraphs_word_paragraph_id_idx').on(table.wordParagraphId),
  uniqueDocumentIndex: index('paragraphs_unique_document_index').on(table.documentId, table.paragraphIndex),
}))

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  paragraphId: uuid('paragraph_id').references(() => paragraphs.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  position: jsonb('position'), // Store position data for Office.js integration
  isResolved: boolean('is_resolved').notNull().default(false),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  documentIdIdx: index('comments_document_id_idx').on(table.documentId),
  paragraphIdIdx: index('comments_paragraph_id_idx').on(table.paragraphId),
}))

export const highlights = pgTable('highlights', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  paragraphId: uuid('paragraph_id').references(() => paragraphs.id, { onDelete: 'set null' }),
  text: text('text').notNull(),
  position: jsonb('position'), // Store range/position data
  color: text('color').notNull().default('#FFFF00'),
  note: text('note'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  documentIdIdx: index('highlights_document_id_idx').on(table.documentId),
  paragraphIdIdx: index('highlights_paragraph_id_idx').on(table.paragraphId),
}))

export const trackedChanges = pgTable('tracked_changes', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  paragraphId: uuid('paragraph_id').references(() => paragraphs.id, { onDelete: 'set null' }),
  changeType: text('change_type').notNull(), // 'insert', 'delete', 'format'
  text: text('text'), // The changed text content
  position: jsonb('position'), // Store range/position data
  author: text('author'), // Author of the change
  timestamp: timestamp('timestamp'), // When the change was made
  isAccepted: boolean('is_accepted').notNull().default(false),
  isRejected: boolean('is_rejected').notNull().default(false),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  documentIdIdx: index('tracked_changes_document_id_idx').on(table.documentId),
  paragraphIdIdx: index('tracked_changes_paragraph_id_idx').on(table.paragraphId),
  changeTypeIdx: index('tracked_changes_change_type_idx').on(table.changeType),
}))

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  key: text('key').notNull().unique(),
  permissions: jsonb('permissions').notNull().default('[]'),
  expiresAt: timestamp('expires_at'),
  lastUsedAt: timestamp('last_used_at'),
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('api_keys_user_id_idx').on(table.userId),
  keyIdx: index('api_keys_key_idx').on(table.key),
}))

export const llmRequests = pgTable('llm_requests', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // 'openai', 'anthropic', 'google', etc.
  model: text('model').notNull(),
  requestType: text('request_type').notNull().default('generate'), // 'generate', 'stream'
  status: text('status').notNull(), // 'success', 'error', 'timeout', 'rate_limited'

  // Request details
  messages: jsonb('messages').notNull(),
  temperature: text('temperature'),
  maxTokens: text('max_tokens'),

  // Response details
  responseContent: text('response_content'),
  promptTokens: text('prompt_tokens'),
  completionTokens: text('completion_tokens'),
  totalTokens: text('total_tokens'),

  // Timing and performance
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  durationMs: text('duration_ms'),

  // Retry and fallback tracking
  attemptNumber: text('attempt_number').notNull().default('1'),
  totalAttempts: text('total_attempts').notNull().default('1'),
  fallbackUsed: boolean('fallback_used').notNull().default(false),
  fallbackProvider: text('fallback_provider'),
  fallbackModel: text('fallback_model'),

  // Circuit breaker state
  circuitBreakerState: text('circuit_breaker_state'), // 'CLOSED', 'OPEN', 'HALF_OPEN'

  // Error details
  errorMessage: text('error_message'),
  errorCode: text('error_code'),
  statusCode: text('status_code'),
  isRetryable: boolean('is_retryable'),

  // Cost tracking (can be calculated from tokens)
  estimatedCost: text('estimated_cost'),

  // Additional metadata
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('llm_requests_user_id_idx').on(table.userId),
  providerIdx: index('llm_requests_provider_idx').on(table.provider),
  statusIdx: index('llm_requests_status_idx').on(table.status),
  startTimeIdx: index('llm_requests_start_time_idx').on(table.startTime),
  createdAtIdx: index('llm_requests_created_at_idx').on(table.createdAt),
}))

// Subscription management for users
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Subscription type and status
  subscriptionType: text('subscription_type').notNull(), // 'free', 'basic', 'professional', 'enterprise'
  status: text('status').notNull(), // 'active', 'cancelled', 'expired', 'pending', 'trialing'
  
  // Time period
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  trialEndDate: timestamp('trial_end_date'), // Optional trial period end date
  
  // Renewal and cancellation
  autoRenew: boolean('auto_renew').notNull().default(true),
  cancelledAt: timestamp('cancelled_at'),
  cancelReason: text('cancel_reason'),
  
  // Payment information
  paymentProvider: text('payment_provider'), // 'stripe', 'paypal', 'alipay', etc.
  paymentId: text('payment_id'), // External subscription/payment ID
  paymentStatus: text('payment_status'), // 'paid', 'pending', 'failed', 'refunded'
  
  // Pricing
  amount: text('amount'), // Subscription amount
  currency: text('currency').notNull().default('USD'), // 'USD', 'CNY', 'EUR', etc.
  billingPeriod: text('billing_period').notNull().default('monthly'), // 'monthly', 'yearly', 'quarterly'
  
  // Additional metadata
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('subscriptions_user_id_idx').on(table.userId),
  statusIdx: index('subscriptions_status_idx').on(table.status),
  subscriptionTypeIdx: index('subscriptions_subscription_type_idx').on(table.subscriptionType),
  endDateIdx: index('subscriptions_end_date_idx').on(table.endDate),
  paymentIdIdx: index('subscriptions_payment_id_idx').on(table.paymentId),
}))

export const reviewSessions = pgTable('review_sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  documentName: text('document_name').notNull(),
  playbookId: uuid('playbook_id').references(() => playbooks.id, { onDelete: 'set null' }),
  playbookName: text('playbook_name'),
  status: text('status').notNull().default('completed'), // 'completed', 'in_progress', 'failed'
  resultsCount: integer('results_count').notNull().default(0),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('review_sessions_user_id_idx').on(table.userId),
  createdAtIdx: index('review_sessions_created_at_idx').on(table.createdAt),
  playbookIdIdx: index('review_sessions_playbook_id_idx').on(table.playbookId),
}))

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
export type Comment = typeof comments.$inferSelect
export type NewComment = typeof comments.$inferInsert
export type Highlight = typeof highlights.$inferSelect
export type NewHighlight = typeof highlights.$inferInsert
export type TrackChange = typeof trackedChanges.$inferSelect
export type NewTrackChange = typeof trackedChanges.$inferInsert
export type ApiKey = typeof apiKeys.$inferSelect
export type NewApiKey = typeof apiKeys.$inferInsert
export type LLMRequest = typeof llmRequests.$inferSelect
export type NewLLMRequest = typeof llmRequests.$inferInsert
export type Playbook = typeof playbooks.$inferSelect
export type NewPlaybook = typeof playbooks.$inferInsert
export type PlaybookShare = typeof playbookShares.$inferSelect
export type NewPlaybookShare = typeof playbookShares.$inferInsert
export type Paragraph = typeof paragraphs.$inferSelect
export type NewParagraph = typeof paragraphs.$inferInsert
export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert
export type ReviewSession = typeof reviewSessions.$inferSelect
export type NewReviewSession = typeof reviewSessions.$inferInsert

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'welcome', 'subscription', 'team_invite', 'share', 'job_complete', 'job_failed'
  title: text('title').notNull(),
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('notifications_user_id_idx').on(table.userId),
  isReadIdx: index('notifications_is_read_idx').on(table.userId, table.isRead),
  createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
}))

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('password_reset_tokens_user_id_idx').on(table.userId),
  tokenIdx: index('password_reset_tokens_token_idx').on(table.token),
  expiresAtIdx: index('password_reset_tokens_expires_at_idx').on(table.expiresAt),
}))

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert
