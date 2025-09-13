import { z } from 'zod';

// User management validation schemas
export const userFiltersSchema = z.object({
  search: z.string().optional(),
  curatorStatus: z.enum(['all', 'curators', 'users']).default('all'),
  emailVerified: z.boolean().optional(),
});

export const userSortSchema = z.object({
  field: z.enum(['name', 'email', 'createdAt', 'plantCount', 'lastActive']).default('createdAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

export const curatorActionSchema = z.object({
  action: z.enum(['promote', 'demote']),
  userId: z.number().positive(),
  reason: z.string().min(1).max(500).optional(),
});

// Plant management validation schemas
export const plantFiltersSchema = z.object({
  search: z.string().optional(),
  family: z.string().optional(),
  genus: z.string().optional(),
  species: z.string().optional(),
  isVerified: z.boolean().optional(),
  createdBy: z.number().positive().optional(),
});

export const plantSortSchema = z.object({
  field: z.enum(['name', 'family', 'genus', 'species', 'createdAt', 'updatedAt']).default('updatedAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

export const plantEditSchema = z.object({
  family: z.string().min(1, 'Family is required').max(100),
  genus: z.string().min(1, 'Genus is required').max(100),
  species: z.string().min(1, 'Species is required').max(100),
  cultivar: z.string().max(100).optional(),
  commonName: z.string().min(1, 'Common name is required').max(200),
  careInstructions: z.string().max(2000).optional(),
  isVerified: z.boolean().default(false),
});

export const plantApprovalSchema = z.object({
  plantId: z.number().positive(),
  action: z.enum(['approve', 'reject', 'request_changes']),
  notes: z.string().max(1000).optional(),
  modifications: plantEditSchema.partial().optional(),
});

// Bulk operations validation schemas
export const bulkOperationSchema = z.object({
  operation: z.enum(['promote', 'demote', 'approve', 'reject', 'delete', 'export']),
  itemIds: z.array(z.number().positive()).min(1, 'At least one item must be selected').max(100, 'Too many items selected'),
  options: z.record(z.string(), z.any()).optional(),
});

export const bulkUserOperationSchema = bulkOperationSchema.extend({
  operation: z.enum(['promote', 'demote', 'export']),
  userIds: z.array(z.number().positive()).min(1).max(50),
});

export const bulkPlantOperationSchema = bulkOperationSchema.extend({
  operation: z.enum(['approve', 'reject', 'delete', 'export']),
  plantIds: z.array(z.number().positive()).min(1).max(100),
});

// Audit log validation schemas
export const auditFiltersSchema = z.object({
  action: z.string().optional(),
  entityType: z.enum(['user', 'plant', 'system']).optional(),
  performedBy: z.number().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const auditSortSchema = z.object({
  field: z.enum(['timestamp', 'action', 'entityType', 'performedBy']).default('timestamp'),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

// Export validation schemas
export const exportSchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  itemIds: z.array(z.number().positive()).optional(),
  filters: z.record(z.string(), z.any()).optional(),
  includeRelated: z.boolean().default(false),
});

// Taxonomy management validation schemas
export const taxonomyMergeSchema = z.object({
  sourceId: z.number().positive(),
  targetId: z.number().positive(),
  preserveInstances: z.boolean().default(true),
  reason: z.string().min(1).max(500),
});

export const taxonomyValidationSchema = z.object({
  family: z.string().min(1).max(100),
  genus: z.string().min(1).max(100),
  species: z.string().min(1).max(100),
  cultivar: z.string().max(100).optional(),
}).refine(
  (data) => {
    // Custom validation for taxonomy uniqueness
    // This would typically check against the database
    return true;
  },
  {
    message: 'This taxonomy combination already exists',
    path: ['species'],
  }
);

// Form validation helpers
export type UserFilters = z.infer<typeof userFiltersSchema>;
export type UserSort = z.infer<typeof userSortSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type CuratorAction = z.infer<typeof curatorActionSchema>;
export type PlantFilters = z.infer<typeof plantFiltersSchema>;
export type PlantSort = z.infer<typeof plantSortSchema>;
export type PlantEdit = z.infer<typeof plantEditSchema>;
export type PlantApproval = z.infer<typeof plantApprovalSchema>;
export type BulkOperation = z.infer<typeof bulkOperationSchema>;
export type BulkUserOperation = z.infer<typeof bulkUserOperationSchema>;
export type BulkPlantOperation = z.infer<typeof bulkPlantOperationSchema>;
export type AuditFilters = z.infer<typeof auditFiltersSchema>;
export type AuditSort = z.infer<typeof auditSortSchema>;
export type ExportOptions = z.infer<typeof exportSchema>;
export type TaxonomyMerge = z.infer<typeof taxonomyMergeSchema>;
export type TaxonomyValidation = z.infer<typeof taxonomyValidationSchema>;

// Validation error formatter
export function formatValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  
  error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  });
  
  return errors;
}

// Safe validation wrapper
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: formatValidationErrors(error) };
    }
    return { success: false, errors: { general: 'Validation failed' } };
  }
}