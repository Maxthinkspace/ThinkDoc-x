import { relations } from 'drizzle-orm'
import {
  users,
  sessions,
  documents,
  apiKeys,
  llmRequests,
  playbooks,
  playbookShares,
  subscriptions,
  reviewSessions
} from './tables'

// User relations - One-to-Many
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  documents: many(documents),
  playbooks: many(playbooks),
  ownedShares: many(playbookShares, { relationName: 'owner' }),
  receivedShares: many(playbookShares, { relationName: 'sharedWith' }),
  apiKeys: many(apiKeys),
  llmRequests: many(llmRequests),
  subscriptions: many(subscriptions),
  reviewSessions: many(reviewSessions),
}))

// Session relations - Many-to-One
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

// Document relations - Many-to-One and One-to-Many
export const documentsRelations = relations(documents, ({ one, many }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
}))

// API Key relations - Many-to-One
export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}))

// LLM Request relations - Many-to-One
export const llmRequestsRelations = relations(llmRequests, ({ one }) => ({
  user: one(users, {
    fields: [llmRequests.userId],
    references: [users.id],
  }),
}))

// Playbook relations - Many-to-One and One-to-Many
export const playbooksRelations = relations(playbooks, ({ one, many }) => ({
  user: one(users, {
    fields: [playbooks.userId],
    references: [users.id],
  }),
  shares: many(playbookShares),
}))

// Playbook Share relations - Many-to-One
export const playbookSharesRelations = relations(playbookShares, ({ one }) => ({
  playbook: one(playbooks, {
    fields: [playbookShares.playbookId],
    references: [playbooks.id],
  }),
  owner: one(users, {
    fields: [playbookShares.ownerId],
    references: [users.id],
    relationName: 'owner',
  }),
  sharedWithUser: one(users, {
    fields: [playbookShares.sharedWithUserId],
    references: [users.id],
    relationName: 'sharedWith',
  }),
}))

// Subscription relations - Many-to-One
export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}))

// Review Session relations - Many-to-One
export const reviewSessionsRelations = relations(reviewSessions, ({ one }) => ({
  user: one(users, {
    fields: [reviewSessions.userId],
    references: [users.id],
  }),
  playbook: one(playbooks, {
    fields: [reviewSessions.playbookId],
    references: [playbooks.id],
  }),
}))