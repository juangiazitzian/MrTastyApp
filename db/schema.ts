import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records', {
    id: text('id').primaryKey(), kind: text('kind').notNull(), payload: text('payload').notNull(),
    dedupe: text('dedupe'), version: integer('version').notNull().default(1),
    createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
}, t => [uniqueIndex('records_unique_dedupe').on(t.kind, t.dedupe)]);
export const audit = sqliteTable('audit', { id: text('id').primaryKey(), recordId: text('record_id').notNull(), action: text('action').notNull(), actor: text('actor').notNull(), at: text('at').notNull() });
export const salesPeriods = sqliteTable('sales_periods', { id: text('id').primaryKey(), mode: text('mode').notNull() });
