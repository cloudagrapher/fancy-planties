import { pgTable, serial, text, timestamp, integer, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  hashedPassword: text('hashed_password').notNull(),
  name: text('name').notNull(),
  isCurator: boolean('is_curator').default(false).notNull(),
  isEmailVerified: boolean('is_email_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Index for email verification status
  emailVerifiedIdx: index('users_email_verified_idx').on(table.isEmailVerified),
}));

// Email verification codes table
export const emailVerificationCodes = pgTable('email_verification_codes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  attemptsUsed: integer('attempts_used').default(0).notNull(),
}, (table) => ({
  // Indexes for email verification code queries
  userIdIdx: index('email_verification_codes_user_id_idx').on(table.userId),
  expiresAtIdx: index('email_verification_codes_expires_at_idx').on(table.expiresAt),
  // Unique constraint to ensure one active code per user
  userActiveCodeUnique: uniqueIndex('email_verification_codes_user_active_unique').on(table.userId, table.expiresAt),
}));

// Password reset tokens table
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  usedAt: timestamp('used_at'),
}, (table) => ({
  // Indexes for password reset token queries
  userIdIdx: index('password_reset_tokens_user_id_idx').on(table.userId),
  tokenIdx: index('password_reset_tokens_token_idx').on(table.token),
  expiresAtIdx: index('password_reset_tokens_expires_at_idx').on(table.expiresAt),
  // Unique constraint to ensure one active token per user
  userActiveTokenUnique: uniqueIndex('password_reset_tokens_user_active_unique').on(table.userId, table.expiresAt),
}));

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
  cultivar: text('cultivar'), // New separate cultivar field
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
  cultivarIdx: index('plants_cultivar_idx').on(table.cultivar), // New index for cultivar search
  commonNameIdx: index('plants_common_name_idx').on(table.commonName),
  // Unique constraint for taxonomy combination (including cultivar)
  taxonomyUnique: uniqueIndex('plants_taxonomy_unique').on(table.family, table.genus, table.species, table.cultivar),
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
  parentInstanceId: integer('parent_instance_id').references(() => plantInstances.id), // Now nullable for external sources
  nickname: text('nickname').notNull(),
  location: text('location').notNull(),
  dateStarted: timestamp('date_started').defaultNow().notNull(),
  status: text('status', { enum: ['started', 'rooting', 'planted', 'established'] }).default('started').notNull(),
  sourceType: text('source_type', { enum: ['internal', 'external'] }).default('internal').notNull(), // New field
  externalSource: text('external_source', { enum: ['gift', 'trade', 'purchase', 'other'] }), // New field, nullable
  externalSourceDetails: text('external_source_details'), // New field for additional details
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
  sourceTypeIdx: index('propagations_source_type_idx').on(table.sourceType), // New index
  externalSourceIdx: index('propagations_external_source_idx').on(table.externalSource), // New index
  dateStartedIdx: index('propagations_date_started_idx').on(table.dateStarted),
  userStatusIdx: index('propagations_user_status_idx').on(table.userId, table.status),
  userSourceTypeIdx: index('propagations_user_source_type_idx').on(table.userId, table.sourceType), // New index
}));

// Care history table for tracking all care activities
export const careHistory = pgTable('care_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  plantInstanceId: integer('plant_instance_id').notNull().references(() => plantInstances.id),
  careType: text('care_type', { 
    enum: ['fertilizer', 'water', 'repot', 'prune', 'inspect', 'other'] 
  }).notNull(),
  careDate: timestamp('care_date').notNull(),
  notes: text('notes'),
  fertilizerType: text('fertilizer_type'), // For fertilizer care type
  potSize: text('pot_size'), // For repot care type
  soilType: text('soil_type'), // For repot care type
  images: jsonb('images').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for care history queries
  userIdIdx: index('care_history_user_id_idx').on(table.userId),
  plantInstanceIdIdx: index('care_history_plant_instance_id_idx').on(table.plantInstanceId),
  careTypeIdx: index('care_history_care_type_idx').on(table.careType),
  careDateIdx: index('care_history_care_date_idx').on(table.careDate),
  userPlantIdx: index('care_history_user_plant_idx').on(table.userId, table.plantInstanceId),
  userCareTypeIdx: index('care_history_user_care_type_idx').on(table.userId, table.careType),
  plantCareDateIdx: index('care_history_plant_care_date_idx').on(table.plantInstanceId, table.careDate),
}));

// Care guides table for plant care instructions
export const careGuides = pgTable('care_guides', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  
  // Taxonomy level - determines which level this guide applies to
  taxonomyLevel: text('taxonomy_level', { 
    enum: ['family', 'genus', 'species', 'cultivar'] 
  }).notNull(),
  
  // Taxonomy identifiers
  family: text('family'),
  genus: text('genus'),
  species: text('species'),
  cultivar: text('cultivar'),
  commonName: text('common_name'),
  
  // Care guide content
  title: text('title').notNull(),
  description: text('description'),
  
  // Care categories
  watering: jsonb('watering').$type<{
    frequency?: string;
    method?: string;
    tips?: string;
  }>(),
  
  fertilizing: jsonb('fertilizing').$type<{
    frequency?: string;
    type?: string;
    schedule?: string;
    tips?: string;
  }>(),
  
  lighting: jsonb('lighting').$type<{
    requirements?: string;
    intensity?: string;
    duration?: string;
    tips?: string;
  }>(),
  
  humidity: jsonb('humidity').$type<{
    requirements?: string;
    range?: string;
    tips?: string;
  }>(),
  
  temperature: jsonb('temperature').$type<{
    range?: string;
    seasonal?: string;
    tips?: string;
  }>(),
  
  soil: jsonb('soil').$type<{
    type?: string;
    recipe?: string;
    drainage?: string;
    ph?: string;
    tips?: string;
  }>(),
  
  repotting: jsonb('repotting').$type<{
    frequency?: string;
    season?: string;
    potSize?: string;
    tips?: string;
  }>(),
  
  pruning: jsonb('pruning').$type<{
    frequency?: string;
    method?: string;
    season?: string;
    tips?: string;
  }>(),
  
  propagation: jsonb('propagation').$type<{
    methods?: string;
    season?: string;
    difficulty?: string;
    tips?: string;
  }>(),
  
  commonIssues: jsonb('common_issues').$type<{
    pests?: string[];
    diseases?: string[];
    problems?: string[];
    solutions?: Record<string, string>;
  }>(),
  
  generalTips: text('general_tips'),
  additionalNotes: text('additional_notes'),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  images: jsonb('images').$type<string[]>().default([]).notNull(),
  
  // Metadata
  isPublic: boolean('is_public').default(false).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for care guide queries
  userIdIdx: index('care_guides_user_id_idx').on(table.userId),
  taxonomyLevelIdx: index('care_guides_taxonomy_level_idx').on(table.taxonomyLevel),
  familyIdx: index('care_guides_family_idx').on(table.family),
  genusIdx: index('care_guides_genus_idx').on(table.genus),
  speciesIdx: index('care_guides_species_idx').on(table.species),
  cultivarIdx: index('care_guides_cultivar_idx').on(table.cultivar),
  commonNameIdx: index('care_guides_common_name_idx').on(table.commonName),
  isPublicIdx: index('care_guides_is_public_idx').on(table.isPublic),
  isVerifiedIdx: index('care_guides_is_verified_idx').on(table.isVerified),
  // Composite indexes for taxonomy matching
  familyGenusIdx: index('care_guides_family_genus_idx').on(table.family, table.genus),
  genusSpeciesIdx: index('care_guides_genus_species_idx').on(table.genus, table.species),
  speciesCultivarIdx: index('care_guides_species_cultivar_idx').on(table.species, table.cultivar),
  // Unique constraint for user + taxonomy combination
  userTaxonomyUnique: uniqueIndex('care_guides_user_taxonomy_unique').on(
    table.userId, table.taxonomyLevel, table.family, table.genus, table.species, table.cultivar
  ),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  plantInstances: many(plantInstances),
  propagations: many(propagations),
  sessions: many(sessions),
  createdPlants: many(plants),
  careHistory: many(careHistory),
  careGuides: many(careGuides),
  emailVerificationCodes: many(emailVerificationCodes),
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
  careHistory: many(careHistory),
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

export const careHistoryRelations = relations(careHistory, ({ one }) => ({
  user: one(users, {
    fields: [careHistory.userId],
    references: [users.id],
  }),
  plantInstance: one(plantInstances, {
    fields: [careHistory.plantInstanceId],
    references: [plantInstances.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const emailVerificationCodesRelations = relations(emailVerificationCodes, ({ one }) => ({
  user: one(users, {
    fields: [emailVerificationCodes.userId],
    references: [users.id],
  }),
}));

export const careGuidesRelations = relations(careGuides, ({ one }) => ({
  user: one(users, {
    fields: [careGuides.userId],
    references: [users.id],
  }),
}));

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type EmailVerificationCode = typeof emailVerificationCodes.$inferSelect;
export type NewEmailVerificationCode = typeof emailVerificationCodes.$inferInsert;
export type Plant = typeof plants.$inferSelect;
export type NewPlant = typeof plants.$inferInsert;
export type PlantInstance = typeof plantInstances.$inferSelect;
export type NewPlantInstance = typeof plantInstances.$inferInsert;
export type Propagation = typeof propagations.$inferSelect;
export type NewPropagation = typeof propagations.$inferInsert;
export type CareHistory = typeof careHistory.$inferSelect;
export type NewCareHistory = typeof careHistory.$inferInsert;
export type CareGuide = typeof careGuides.$inferSelect;
export type NewCareGuide = typeof careGuides.$inferInsert;