import { pgTable, serial, text, timestamp, integer, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  hashedPassword: text('hashed_password').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Sessions table for Lucia auth
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
}, (table) => ({
  // Indexes for session management
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
  expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
}));

// Plants table (taxonomy)
export const plants = pgTable('plants', {
  id: serial('id').primaryKey(),
  family: text('family').notNull(),
  genus: text('genus').notNull(),
  species: text('species').notNull(),
  commonName: text('common_name').notNull(),
  careInstructions: text('care_instructions'),
  defaultImage: text('default_image'),
  createdBy: integer('created_by').references(() => users.id),
  isVerified: boolean('is_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for plant taxonomy search
  familyIdx: index('plants_family_idx').on(table.family),
  genusIdx: index('plants_genus_idx').on(table.genus),
  speciesIdx: index('plants_species_idx').on(table.species),
  commonNameIdx: index('plants_common_name_idx').on(table.commonName),
  // Unique constraint for taxonomy combination
  taxonomyUnique: uniqueIndex('plants_taxonomy_unique').on(table.family, table.genus, table.species),
  // Index for verified plants
  verifiedIdx: index('plants_verified_idx').on(table.isVerified),
}));

// Plant instances table
export const plantInstances = pgTable('plant_instances', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  plantId: integer('plant_id').notNull().references(() => plants.id),
  nickname: text('nickname').notNull(),
  location: text('location').notNull(),
  lastFertilized: timestamp('last_fertilized'),
  fertilizerSchedule: text('fertilizer_schedule').notNull(),
  fertilizerDue: timestamp('fertilizer_due'),
  lastRepot: timestamp('last_repot'),
  notes: text('notes'),
  images: jsonb('images').$type<string[]>().default([]).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for performance optimization
  userIdIdx: index('plant_instances_user_id_idx').on(table.userId),
  plantIdIdx: index('plant_instances_plant_id_idx').on(table.plantId),
  fertilizerDueIdx: index('plant_instances_fertilizer_due_idx').on(table.fertilizerDue),
  isActiveIdx: index('plant_instances_is_active_idx').on(table.isActive),
  userActiveIdx: index('plant_instances_user_active_idx').on(table.userId, table.isActive),
  locationIdx: index('plant_instances_location_idx').on(table.location),
}));

// Propagations table
export const propagations = pgTable('propagations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  plantId: integer('plant_id').notNull().references(() => plants.id),
  parentInstanceId: integer('parent_instance_id').references(() => plantInstances.id),
  nickname: text('nickname').notNull(),
  location: text('location').notNull(),
  dateStarted: timestamp('date_started').defaultNow().notNull(),
  status: text('status', { enum: ['started', 'rooting', 'planted', 'established'] }).default('started').notNull(),
  notes: text('notes'),
  images: jsonb('images').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for propagation queries
  userIdIdx: index('propagations_user_id_idx').on(table.userId),
  plantIdIdx: index('propagations_plant_id_idx').on(table.plantId),
  parentInstanceIdIdx: index('propagations_parent_instance_id_idx').on(table.parentInstanceId),
  statusIdx: index('propagations_status_idx').on(table.status),
  dateStartedIdx: index('propagations_date_started_idx').on(table.dateStarted),
  userStatusIdx: index('propagations_user_status_idx').on(table.userId, table.status),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  plantInstances: many(plantInstances),
  propagations: many(propagations),
  sessions: many(sessions),
  createdPlants: many(plants),
}));

export const plantsRelations = relations(plants, ({ many, one }) => ({
  instances: many(plantInstances),
  propagations: many(propagations),
  createdBy: one(users, {
    fields: [plants.createdBy],
    references: [users.id],
  }),
}));

export const plantInstancesRelations = relations(plantInstances, ({ one, many }) => ({
  user: one(users, {
    fields: [plantInstances.userId],
    references: [users.id],
  }),
  plant: one(plants, {
    fields: [plantInstances.plantId],
    references: [plants.id],
  }),
  propagations: many(propagations),
}));

export const propagationsRelations = relations(propagations, ({ one }) => ({
  user: one(users, {
    fields: [propagations.userId],
    references: [users.id],
  }),
  plant: one(plants, {
    fields: [propagations.plantId],
    references: [plants.id],
  }),
  parentInstance: one(plantInstances, {
    fields: [propagations.parentInstanceId],
    references: [plantInstances.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Plant = typeof plants.$inferSelect;
export type NewPlant = typeof plants.$inferInsert;
export type PlantInstance = typeof plantInstances.$inferSelect;
export type NewPlantInstance = typeof plantInstances.$inferInsert;
export type Propagation = typeof propagations.$inferSelect;
export type NewPropagation = typeof propagations.$inferInsert;