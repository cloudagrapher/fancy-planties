import { z } from 'zod';

// Raw CSV row schemas (before processing)
export const rawPlantTaxonomyRowSchema = z.object({
  'Family': z.string().optional().default(''),
  'Genus': z.string().optional().default(''),
  'Species': z.string().optional().default(''),
  'Cultivar': z.string().optional().default(''), // New cultivar field
  'Common Name': z.string().optional().default(''), // Separated from cultivar
  // Legacy support for combined field
  'Common Name/Variety': z.string().optional().default(''),
});

export const rawFertilizerScheduleRowSchema = z.object({
  'Family': z.string().optional().default(''),
  'Genus': z.string().optional().default(''),
  'Species': z.string().optional().default(''),
  'Cultivar': z.string().optional().default(''), // New cultivar field
  'Common Name': z.string().optional().default(''), // Separated from cultivar
  // Legacy support for combined field
  'Common Name/Variety': z.string().optional().default(''),
  'Location': z.string().optional().default(''),
  'Last Fertilized': z.string().optional().default(''),
  'Fertilizer Schedule': z.string().optional().default(''),
  'Fertilizer Due': z.string().optional().default(''),
  'Last Repot': z.string().optional().default(''),
});

export const rawPropagationRowSchema = z.object({
  'Family': z.string().optional().default(''),
  'Genus': z.string().optional().default(''),
  'Species': z.string().optional().default(''),
  'Cultivar': z.string().optional().default(''), // New cultivar field
  'Common Name': z.string().optional().default(''), // Separated from cultivar
  // Legacy support for combined field
  'Common Name/Variety': z.string().optional().default(''),
  'Location': z.string().optional().default(''),
  'Date Started': z.string().optional().default(''),
  // New fields for external source detection
  'Source': z.string().optional().default(''), // gift, trade, purchase, etc.
  'Source Details': z.string().optional().default(''), // Additional details about source
  'Parent Plant': z.string().optional().default(''), // For internal propagations
});

// Processed CSV data schemas (after validation and transformation)
export const processedPlantTaxonomySchema = z.object({
  family: z.string().min(1, 'Family is required'),
  genus: z.string().min(1, 'Genus is required'),
  species: z.string().min(1, 'Species is required'),
  cultivar: z.string().optional().nullable(), // New cultivar field
  commonName: z.string().min(1, 'Common name is required'),
  rowIndex: z.number().int().min(0),
});

export const processedPlantInstanceSchema = z.object({
  family: z.string().optional(),
  genus: z.string().optional(),
  species: z.string().optional(),
  cultivar: z.string().optional().nullable(), // New cultivar field
  commonName: z.string().min(1, 'Common name is required'),
  nickname: z.string().min(1, 'Nickname is required'),
  location: z.string().optional().default('Unknown'),
  lastFertilized: z.date().nullable(),
  fertilizerSchedule: z.string(),
  fertilizerDue: z.date().nullable(),
  lastRepot: z.date().nullable(),
  rowIndex: z.number().int().min(0),
});

export const processedPropagationSchema = z.object({
  family: z.string().optional(),
  genus: z.string().optional(),
  species: z.string().optional(),
  cultivar: z.string().optional().nullable(), // New cultivar field
  commonName: z.string().min(1, 'Common name is required'),
  nickname: z.string().min(1, 'Nickname is required'),
  location: z.string().optional().default('Unknown'),
  dateStarted: z.date(),
  sourceType: z.enum(['internal', 'external']).default('external'), // Default to external for CSV imports
  externalSource: z.enum(['gift', 'trade', 'purchase', 'other']).optional().nullable(),
  externalSourceDetails: z.string().optional().nullable(),
  parentPlantName: z.string().optional().nullable(), // For matching internal propagations
  rowIndex: z.number().int().min(0),
});

// Import result schemas
export const importErrorSchema = z.object({
  rowIndex: z.number().int().min(0),
  field: z.string().optional(),
  message: z.string(),
  severity: z.enum(['error', 'warning']),
  originalValue: z.string().optional(),
});

export const importConflictSchema = z.object({
  type: z.enum(['duplicate_plant', 'missing_parent', 'invalid_taxonomy']),
  rowIndex: z.number().int().min(0),
  message: z.string(),
  existingRecord: z.any().optional(),
  suggestedAction: z.enum(['skip', 'merge', 'create_new', 'manual_review']),
});

export const importSummarySchema = z.object({
  totalRows: z.number().int().min(0),
  processedRows: z.number().int().min(0),
  successfulImports: z.number().int().min(0),
  errors: z.array(importErrorSchema),
  conflicts: z.array(importConflictSchema),
  warnings: z.array(importErrorSchema),
  skippedRows: z.number().int().min(0),
  importType: z.enum(['plant_taxonomy', 'plant_instances', 'propagations']),
  startTime: z.date(),
  endTime: z.date().optional(),
  userId: z.number().int().positive(),
});

// Plant matching schemas for linking CSV data to existing plants
export const plantMatchSchema = z.object({
  plantId: z.number().int().positive(),
  confidence: z.number().min(0).max(1),
  matchedFields: z.array(z.string()),
  plant: z.object({
    id: z.number().int().positive(),
    family: z.string(),
    genus: z.string(),
    species: z.string(),
    cultivar: z.string().optional().nullable(), // New cultivar field
    commonName: z.string(),
  }),
});

export const plantMatchResultSchema = z.object({
  rowIndex: z.number().int().min(0),
  originalData: z.record(z.string(), z.string()),
  matches: z.array(plantMatchSchema),
  bestMatch: plantMatchSchema.optional(),
  requiresManualReview: z.boolean(),
  confidence: z.number().min(0).max(1),
});

// CSV import configuration schema
export const csvImportConfigSchema = z.object({
  skipEmptyRows: z.boolean().default(true),
  skipHeaderRow: z.boolean().default(true),
  matchingThreshold: z.number().min(0).max(1).default(0.7),
  createMissingPlants: z.boolean().default(true),
  handleDuplicates: z.enum(['skip', 'merge', 'create_new']).default('skip'),
  dateFormat: z.enum(['auto', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).default('auto'),
  userId: z.number().int().positive(),
});

// File upload schema
export const csvFileSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  size: z.number().int().min(1, 'File must not be empty').max(5 * 1024 * 1024, 'File too large (max 5MB)'),
  type: z.string().refine(
    (type) => type === 'text/csv' || type === 'application/vnd.ms-excel' || type === 'text/plain',
    'File must be a CSV file'
  ),
  content: z.string().min(1, 'File content is required'),
});

// Import progress tracking schema
export const importProgressSchema = z.object({
  id: z.string().uuid(),
  userId: z.number().int().positive(),
  fileName: z.string(),
  importType: z.enum(['plant_taxonomy', 'plant_instances', 'propagations']),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  progress: z.number().min(0).max(100),
  totalRows: z.number().int().min(0),
  processedRows: z.number().int().min(0),
  errors: z.array(importErrorSchema),
  conflicts: z.array(importConflictSchema),
  startTime: z.date(),
  endTime: z.date().optional(),
  summary: importSummarySchema.optional(),
});

// Export types
export type RawPlantTaxonomyRow = z.infer<typeof rawPlantTaxonomyRowSchema>;
export type RawFertilizerScheduleRow = z.infer<typeof rawFertilizerScheduleRowSchema>;
export type RawPropagationRow = z.infer<typeof rawPropagationRowSchema>;
export type ProcessedPlantTaxonomy = z.infer<typeof processedPlantTaxonomySchema>;
export type ProcessedPlantInstance = z.infer<typeof processedPlantInstanceSchema>;
export type ProcessedPropagation = z.infer<typeof processedPropagationSchema>;
export type ImportError = z.infer<typeof importErrorSchema>;
export type ImportConflict = z.infer<typeof importConflictSchema>;
export type ImportSummary = z.infer<typeof importSummarySchema>;
export type PlantMatch = z.infer<typeof plantMatchSchema>;
export type PlantMatchResult = z.infer<typeof plantMatchResultSchema>;
export type CSVImportConfig = z.infer<typeof csvImportConfigSchema>;
export type CSVFile = z.infer<typeof csvFileSchema>;
export type ImportProgress = z.infer<typeof importProgressSchema>;