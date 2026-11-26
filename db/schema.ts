import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const workspaces = sqliteTable('workspaces', {
  owner: text('owner').primaryKey(),
  document: text('document').notNull(),
  revision: integer('revision').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
});
export const feedback = sqliteTable('feedback', {
  id: text('id').primaryKey(),
  owner: text('owner').notNull(),
  message: text('message').notNull(),
  createdAt: text('created_at').notNull(),
});
export const requestLimits = sqliteTable('request_limits', {
  owner: text('owner').primaryKey(),
  window: integer('window').notNull(),
  count: integer('count').notNull(),
});
export const receipts = sqliteTable('receipts', {
  id: text('id').primaryKey(),
  owner: text('owner').notNull(),
  transaction: text('transaction_id').notNull(),
  objectKey: text('object_key').notNull(),
  filename: text('filename').notNull(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  createdAt: text('created_at').notNull(),
},table=>[index('receipts_owner_transaction_idx').on(table.owner,table.transaction)]);
// Durable outbox: metadata deletion and enqueueing object deletion are atomic.
// R2 cleanup is retried separately; failures must never erase the purge manifest.
export const receiptPurges = sqliteTable('receipt_purges', {
  objectKey: text('object_key').primaryKey(),
  owner: text('owner').notNull(),
  requestedAt: text('requested_at').notNull(),
},table=>[index('receipt_purges_owner_idx').on(table.owner)]);
