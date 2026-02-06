import { pgTable, text, timestamp, uuid, boolean, index, jsonb } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { relations } from 'drizzle-orm'
import { users } from './tables'

// ============================================
// CHAT SESSIONS
// ============================================

export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title'), // Auto-generated from first message or user-defined
  shareToken: text('share_token').unique(), // For public link sharing (like ChatGPT)
  isPublic: boolean('is_public').default(false), // Anyone with link can view
  sourceConfig: jsonb('source_config'), // AskSourceConfig snapshot
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('chat_sessions_user_id_idx').on(table.userId),
  shareTokenIdx: index('chat_sessions_share_token_idx').on(table.shareToken),
}))

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  citations: jsonb('citations'), // SourceCitation[]
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sessionIdIdx: index('chat_messages_session_id_idx').on(table.sessionId),
  createdAtIdx: index('chat_messages_created_at_idx').on(table.createdAt),
}))

// ============================================
// RELATIONS
// ============================================

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}))

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}))

// ============================================
// TYPE EXPORTS
// ============================================

export type ChatSession = typeof chatSessions.$inferSelect
export type NewChatSession = typeof chatSessions.$inferInsert

export type ChatMessage = typeof chatMessages.$inferSelect
export type NewChatMessage = typeof chatMessages.$inferInsert

