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
  keys: z.array(z.string()).default(['family', 'genus', 'species', 'commonName']),
});

// Plant taxonomy suggestion schema for autocomplete
export const plantSuggestionSchema = z.object({
  id: z.number().int().positive(),
  family: z.string(),
  genus: z.string(),
  species: z.string(),
  commonName: z.string(),
  isVerified: z.boolean(),
  score: z.number().optional(), // For fuzzy search scoring
  matchedFields: z.array(z.string()).optional(), // Which fields matched the search
});

// Export types from schemas
export type PlantTaxonomy = z.infer<typeof plantTaxonomySchema>;
export type CreatePlant = z.infer<typeof createPlantSchema>;
export type UpdatePlant = z.infer<typeof updatePlantSchema>;
export type PlantSearch = z.infer<typeof plantSearchSchema>;
export type PlantFilter = z.infer<typeof plantFilterSchema>;
export type FuzzySearchConfig = z.infer<typeof fuzzySearchConfigSchema>;
export type PlantSuggestion = z.infer<typeof plantSuggestionSchema>;