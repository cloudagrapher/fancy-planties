import { z } from 'zod';

// Plant taxonomy validation schemas
export const plantTaxonomySchema = z.object({
  family: z.string()
    .min(1, 'Family is required')
    .max(100, 'Family name too long')
    .trim()
    .transform(val => val.charAt(0).toUpperCase() + val.slice(1).toLowerCase()),
  
  genus: z.string()
    .min(1, 'Genus is required')
    .max(100, 'Genus name too long')
    .trim()
    .transform(val => val.charAt(0).toUpperCase() + val.slice(1).toLowerCase()),
  
  species: z.string()
    .min(1, 'Species is required')
    .max(100, 'Species name too long')
    .trim()
    .toLowerCase(),
  
  cultivar: z.string()
    .max(100, 'Cultivar name too long')
    .trim()
    .optional()
    .nullable(),
  
  commonName: z.string()
    .min(1, 'Common name is required')
    .max(200, 'Common name too long')
    .trim(),
  
  careInstructions: z.string()
    .max(2000, 'Care instructions too long')
    .optional()
    .nullable(),
  
  defaultImage: z.string()
    .url('Invalid image URL')
    .optional()
    .nullable(),
});

export const createPlantSchema = plantTaxonomySchema.extend({
  createdBy: z.number().int().positive().optional(),
  isVerified: z.boolean().default(false),
});

export const updatePlantSchema = plantTaxonomySchema.partial().extend({
  id: z.number().int().positive(),
});

// Plant search and filter schemas
export const plantSearchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(200, 'Search query too long')
    .trim(),
  
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20),
  
  offset: z.number()
    .int()
    .min(0)
    .default(0),
  
  includeUnverified: z.boolean().default(true),
  
  familyFilter: z.string().optional(),
  genusFilter: z.string().optional(),
});

export const plantFilterSchema = z.object({
  family: z.string().optional(),
  genus: z.string().optional(),
  isVerified: z.boolean().optional(),
  createdBy: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// Fuzzy search configuration schema
export const fuzzySearchConfigSchema = z.object({
  threshold: z.number().min(0).max(1).default(0.6),
  includeScore: z.boolean().default(true),
  keys: z.array(z.string()).default(['family', 'genus', 'species', 'cultivar', 'commonName']),
});

// Plant taxonomy suggestion schema for autocomplete
export const plantSuggestionSchema = z.object({
  id: z.number().int().positive(),
  family: z.string(),
  genus: z.string(),
  species: z.string(),
  cultivar: z.string().optional().nullable(),
  commonName: z.string(),
  isVerified: z.boolean(),
  score: z.number().optional(), // For fuzzy search scoring
  matchedFields: z.array(z.string()).optional(), // Which fields matched the search
});

// Plant instance validation schemas
export const fertilizerScheduleSchema = z.string()
  .min(1, 'Fertilizer schedule is required')
  .max(50, 'Schedule description too long')
  .refine(
    (val) => /^\d+\s*(day|week|month)s?$/i.test(val),
    'Schedule must be in format like "2 weeks", "1 month", "14 days"'
  );

export const plantInstanceSchema = z.object({
  plantId: z.number().int().positive('Plant ID is required'),
  nickname: z.string()
    .min(1, 'Plant nickname is required')
    .max(100, 'Nickname too long')
    .trim(),
  
  location: z.string()
    .min(1, 'Location is required')
    .max(100, 'Location description too long')
    .trim(),
  
  fertilizerSchedule: fertilizerScheduleSchema,
  
  lastFertilized: z.date().optional().nullable(),
  fertilizerDue: z.date().optional().nullable(),
  lastRepot: z.date().optional().nullable(),
  lastFlush: z.date().optional().nullable(),
  
  notes: z.string()
    .max(2000, 'Notes too long')
    .optional()
    .nullable(),

  images: z.array(z.string())
    .max(10, 'Maximum 10 images allowed')
    .default([]),

  s3ImageKeys: z.array(z.string())
    .max(10, 'Maximum 10 images allowed')
    .default([]),

  isActive: z.boolean().default(true),
});

export const createPlantInstanceSchema = plantInstanceSchema.extend({
  userId: z.number().int().positive('User ID is required'),
});

export const updatePlantInstanceSchema = plantInstanceSchema.partial().extend({
  id: z.number().int().positive(),
  userId: z.number().int().positive().optional(),
});

// Plant instance search and filter schemas
export const plantInstanceSearchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(200, 'Search query too long')
    .trim(),
  
  userId: z.number().int().positive('User ID is required'),
  
  activeOnly: z.boolean().default(true),
  
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20),
  
  offset: z.number()
    .int()
    .min(0)
    .default(0),
});

export const plantInstanceFilterSchema = z.object({
  userId: z.number().int().positive('User ID is required'),
  
  location: z.string().optional(),
  plantId: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  
  // Care status filters
  overdueOnly: z.boolean().default(false),
  dueSoonDays: z.number().int().min(1).max(30).optional(),
  
  // Date range filters
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  lastFertilizedAfter: z.date().optional(),
  lastFertilizedBefore: z.date().optional(),
  
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// Care logging schemas
export const logFertilizerSchema = z.object({
  plantInstanceId: z.number().int().positive('Plant instance ID is required'),
  fertilizerDate: z.date().optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
});

export const logRepotSchema = z.object({
  plantInstanceId: z.number().int().positive('Plant instance ID is required'),
  repotDate: z.date().optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
  potSize: z.string().max(50, 'Pot size description too long').optional(),
  soilType: z.string().max(100, 'Soil type description too long').optional(),
});

// Plant instance status management
export const plantInstanceStatusSchema = z.object({
  id: z.number().int().positive(),
  isActive: z.boolean(),
});

// Bulk operations schema
export const bulkPlantInstanceOperationSchema = z.object({
  plantInstanceIds: z.array(z.number().int().positive())
    .min(1, 'At least one plant instance ID is required')
    .max(50, 'Maximum 50 plant instances allowed per bulk operation'),
  
  operation: z.enum(['activate', 'deactivate', 'delete', 'fertilize']),
  
  // Optional data for specific operations
  fertilizerDate: z.date().optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
});

// Advanced search schemas
export const multiFieldSearchSchema = z.object({
  // Text search fields
  nickname: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  plantName: z.string().optional(),
  
  // Plant taxonomy fields
  family: z.string().optional(),
  genus: z.string().optional(),
  species: z.string().optional(),
  cultivar: z.string().optional(),
  commonName: z.string().optional(),
  
  // Care-related fields
  fertilizerSchedule: z.string().optional(),
  
  // Search logic
  operator: z.enum(['AND', 'OR']).default('OR'),
  
  // Field weights for relevance scoring
  fieldWeights: z.record(z.string(), z.number().min(0).max(1)).optional(),
});

export const searchPresetSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Preset name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  filters: plantInstanceFilterSchema,
  sortBy: z.enum(['nickname', 'location', 'created_at', 'last_fertilized', 'fertilizer_due', 'care_urgency', 'plant_name']),
  sortOrder: z.enum(['asc', 'desc']),
  userId: z.number().int().positive(),
  isDefault: z.boolean().default(false),
});

export const searchHistorySchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  filters: plantInstanceFilterSchema.partial(),
  timestamp: z.date().default(() => new Date()),
  userId: z.number().int().positive(),
});

export const advancedSearchConfigSchema = z.object({
  enableFuzzySearch: z.boolean().default(true),
  fuzzyThreshold: z.number().min(0).max(1).default(0.6),
  maxSuggestions: z.number().int().min(1).max(20).default(10),
  searchTimeout: z.number().int().min(1000).max(30000).default(5000),
  cacheResults: z.boolean().default(true),
  cacheDuration: z.number().int().min(60000).default(300000), // 5 minutes
  highlightMatches: z.boolean().default(true),
  maxHighlights: z.number().int().min(1).max(10).default(3),
});

export const smartSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(200, 'Query too long'),
  userId: z.number().int().positive(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  autoCorrect: z.boolean().default(true),
  includeInactive: z.boolean().default(false),
});

// Enhanced plant instance filter with additional search options
export const enhancedPlantInstanceFilterSchema = plantInstanceFilterSchema.extend({
  // Text search
  searchQuery: z.string().optional(),
  searchFields: z.array(z.enum(['nickname', 'location', 'notes', 'plant_name'])).optional(),
  
  // Advanced filters
  hasImages: z.boolean().optional(),
  imageCount: z.object({
    min: z.number().int().min(0).optional(),
    max: z.number().int().min(0).optional(),
  }).optional(),
  
  // Care frequency filters
  fertilizerFrequency: z.object({
    unit: z.enum(['days', 'weeks', 'months']),
    min: z.number().int().min(1).optional(),
    max: z.number().int().min(1).optional(),
  }).optional(),
  
  // Date range presets
  datePreset: z.enum(['today', 'this_week', 'this_month', 'last_month', 'last_3_months']).optional(),
  
  // Sorting options
  sortBy: z.enum(['nickname', 'location', 'created_at', 'last_fertilized', 'fertilizer_due', 'care_urgency', 'plant_name']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
  // Result options
  includeStats: z.boolean().default(false),
  includeFacets: z.boolean().default(false),
});

// Search suggestion schema
export const searchSuggestionSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  userId: z.number().int().positive(),
  limit: z.number().int().min(1).max(20).default(5),
  includeHistory: z.boolean().default(true),
  includeTaxonomy: z.boolean().default(true),
  includeInstances: z.boolean().default(true),
});

// Export types from schemas
export type PlantTaxonomy = z.infer<typeof plantTaxonomySchema>;
export type CreatePlant = z.infer<typeof createPlantSchema>;
export type UpdatePlant = z.infer<typeof updatePlantSchema>;
export type PlantSearch = z.infer<typeof plantSearchSchema>;
export type PlantFilter = z.infer<typeof plantFilterSchema>;
export type FuzzySearchConfig = z.infer<typeof fuzzySearchConfigSchema>;
export type PlantSuggestion = z.infer<typeof plantSuggestionSchema>;

export type PlantInstanceData = z.infer<typeof plantInstanceSchema>;
export type CreatePlantInstance = z.infer<typeof createPlantInstanceSchema>;
export type UpdatePlantInstance = z.infer<typeof updatePlantInstanceSchema>;
export type PlantInstanceSearch = z.infer<typeof plantInstanceSearchSchema>;
export type PlantInstanceFilter = z.infer<typeof plantInstanceFilterSchema>;
export type LogFertilizer = z.infer<typeof logFertilizerSchema>;
export type LogRepot = z.infer<typeof logRepotSchema>;
export type PlantInstanceStatus = z.infer<typeof plantInstanceStatusSchema>;
export type BulkPlantInstanceOperation = z.infer<typeof bulkPlantInstanceOperationSchema>;

// Advanced search types
export type MultiFieldSearch = z.infer<typeof multiFieldSearchSchema>;
export type SearchPreset = z.infer<typeof searchPresetSchema>;
export type SearchHistory = z.infer<typeof searchHistorySchema>;
export type AdvancedSearchConfig = z.infer<typeof advancedSearchConfigSchema>;
export type SmartSearch = z.infer<typeof smartSearchSchema>;
export type EnhancedPlantInstanceFilter = z.infer<typeof enhancedPlantInstanceFilterSchema>;
export type SearchSuggestion = z.infer<typeof searchSuggestionSchema>;