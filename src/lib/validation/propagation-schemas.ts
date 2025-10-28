import { z } from 'zod';

// Propagation validation schemas
export const propagationSchema = z.object({
  plantId: z.number().int().positive('Plant ID is required'),
  parentInstanceId: z.number().int().positive().optional().nullable(),
  nickname: z.string()
    .min(1, 'Propagation nickname is required')
    .max(100, 'Nickname too long')
    .trim(),
  
  location: z.string()
    .min(1, 'Location is required')
    .max(100, 'Location description too long')
    .trim(),
  
  dateStarted: z.date().optional(),
  
  status: z.enum(['started', 'rooting', 'ready', 'planted']).default('started'),
  
  sourceType: z.enum(['internal', 'external']).default('internal'),
  
  externalSource: z.enum(['gift', 'trade', 'purchase', 'other']).optional().nullable(),
  
  externalSourceDetails: z.string()
    .max(500, 'External source details too long')
    .optional()
    .nullable(),
  
  notes: z.string()
    .max(2000, 'Notes too long')
    .optional()
    .nullable(),
  
  images: z.array(z.string())
    .max(10, 'Maximum 10 images allowed')
    .default([]),
});

export const createPropagationSchema = propagationSchema.extend({
  userId: z.number().int().positive('User ID is required'),
}).refine((data) => {
  // If source type is internal, parent instance ID is required
  if (data.sourceType === 'internal' && !data.parentInstanceId) {
    return false;
  }
  // If source type is external, external source is required
  if (data.sourceType === 'external' && !data.externalSource) {
    return false;
  }
  return true;
}, {
  message: 'Internal propagations require parent instance ID, external propagations require external source',
});

export const updatePropagationSchema = propagationSchema.partial().extend({
  id: z.number().int().positive(),
  userId: z.number().int().positive().optional(),
}).refine((data) => {
  // If source type is being changed to internal, parent instance ID is required
  if (data.sourceType === 'internal' && data.parentInstanceId === undefined) {
    return false;
  }
  // If source type is being changed to external, external source is required
  if (data.sourceType === 'external' && data.externalSource === undefined) {
    return false;
  }
  return true;
}, {
  message: 'Source type changes must include appropriate source information',
});

// Propagation status update schema
export const propagationStatusUpdateSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(['started', 'rooting', 'ready', 'planted']),
  notes: z.string().max(500, 'Status notes too long').optional(),
});

// Propagation search and filter schemas
export const propagationSearchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(200, 'Search query too long')
    .trim(),
  
  userId: z.number().int().positive('User ID is required'),
  
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

export const propagationFilterSchema = z.object({
  userId: z.number().int().positive('User ID is required'),
  
  status: z.enum(['started', 'rooting', 'ready', 'planted']).optional(),
  sourceType: z.enum(['internal', 'external']).optional(),
  externalSource: z.enum(['gift', 'trade', 'purchase', 'other']).optional(),
  plantId: z.number().int().positive().optional(),
  parentInstanceId: z.number().int().positive().optional(),
  location: z.string().optional(),
  
  // Date range filters
  startedAfter: z.date().optional(),
  startedBefore: z.date().optional(),
  
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  
  // Sorting options
  sortBy: z.enum(['nickname', 'location', 'date_started', 'status', 'source_type']).default('date_started'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Propagation conversion to plant instance schema
export const propagationConversionSchema = z.object({
  propagationId: z.number().int().positive('Propagation ID is required'),
  nickname: z.string()
    .min(1, 'Plant nickname is required')
    .max(100, 'Nickname too long')
    .trim()
    .optional(),
  
  location: z.string()
    .min(1, 'Location is required')
    .max(100, 'Location description too long')
    .trim()
    .optional(),
  
  fertilizerSchedule: z.string()
    .min(1, 'Fertilizer schedule is required')
    .max(50, 'Schedule description too long')
    .refine(
      (val) => /^\d+\s*(day|week|month)s?$/i.test(val),
      'Schedule must be in format like "2 weeks", "1 month", "14 days"'
    )
    .default('2 weeks'),
  
  notes: z.string()
    .max(2000, 'Notes too long')
    .optional(),
});

// Bulk propagation operations schema
export const bulkPropagationOperationSchema = z.object({
  propagationIds: z.array(z.number().int().positive())
    .min(1, 'At least one propagation ID is required')
    .max(50, 'Maximum 50 propagations allowed per bulk operation'),
  
  operation: z.enum(['update_status', 'delete', 'convert']),
  
  // Optional data for specific operations
  status: z.enum(['started', 'rooting', 'ready', 'planted']).optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
  
  // For conversion operations
  fertilizerSchedule: z.string().optional(),
});

// Propagation statistics schema
export const propagationStatsSchema = z.object({
  userId: z.number().int().positive('User ID is required'),
  sourceType: z.enum(['internal', 'external', 'all']).default('all'),
  dateRange: z.object({
    start: z.date().optional(),
    end: z.date().optional(),
  }).optional(),
});

// Advanced propagation search schema
export const advancedPropagationSearchSchema = z.object({
  userId: z.number().int().positive('User ID is required'),
  
  // Text search fields
  nickname: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  externalSourceDetails: z.string().optional(),
  
  // Plant taxonomy fields
  plantName: z.string().optional(),
  family: z.string().optional(),
  genus: z.string().optional(),
  species: z.string().optional(),
  cultivar: z.string().optional(),
  
  // Propagation-specific fields
  status: z.array(z.enum(['started', 'rooting', 'ready', 'planted'])).optional(),
  sourceType: z.array(z.enum(['internal', 'external'])).optional(),
  externalSource: z.array(z.enum(['gift', 'trade', 'purchase', 'other'])).optional(),
  
  // Date ranges
  dateStartedRange: z.object({
    start: z.date().optional(),
    end: z.date().optional(),
  }).optional(),
  
  // Search logic
  operator: z.enum(['AND', 'OR']).default('OR'),
  
  // Result options
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['nickname', 'location', 'date_started', 'status', 'source_type', 'plant_name']).default('date_started'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
  includeStats: z.boolean().default(false),
});

// Export types from schemas
export type PropagationData = z.infer<typeof propagationSchema>;
export type CreatePropagation = z.infer<typeof createPropagationSchema>;
export type UpdatePropagation = z.infer<typeof updatePropagationSchema>;
export type PropagationStatusUpdate = z.infer<typeof propagationStatusUpdateSchema>;
export type PropagationSearch = z.infer<typeof propagationSearchSchema>;
export type PropagationFilter = z.infer<typeof propagationFilterSchema>;
export type PropagationConversion = z.infer<typeof propagationConversionSchema>;
export type BulkPropagationOperation = z.infer<typeof bulkPropagationOperationSchema>;
export type PropagationStats = z.infer<typeof propagationStatsSchema>;
export type AdvancedPropagationSearch = z.infer<typeof advancedPropagationSearchSchema>;