import type { Plant } from '@/lib/db/schema';
import type { PlantSuggestion, FuzzySearchConfig } from '@/lib/validation/plant-schemas';

// Enhanced Plant interface with computed properties
export interface EnhancedPlant extends Plant {
  // Computed display name
  displayName: string;
  // Scientific name (Genus species)
  scientificName: string;
  // Full taxonomy string
  fullTaxonomy: string;
  // Search relevance score (for search results)
  relevanceScore?: number;
  // Matched search terms (for highlighting)
  matchedTerms?: string[];
}

// Plant with usage statistics
export interface PlantWithStats extends EnhancedPlant {
  instanceCount: number;
  propagationCount: number;
  popularityScore: number;
  lastUsed?: Date;
}

// Plant search result interface
export interface PlantSearchResult {
  plants: PlantSuggestion[];
  totalCount: number;
  hasMore: boolean;
  searchTime: number;
  suggestions?: string[]; // Alternative search suggestions
}

// Plant taxonomy hierarchy for browsing
export interface TaxonomyHierarchy {
  families: Array<{
    name: string;
    count: number;
    genera: Array<{
      name: string;
      count: number;
      species: Array<{
        name: string;
        count: number;
        plants: PlantSuggestion[];
      }>;
    }>;
  }>;
}

// Recent and popular plants for quick selection
export interface QuickSelectPlants {
  recent: PlantSuggestion[];
  popular: PlantSuggestion[];
  verified: PlantSuggestion[];
}

// Plant creation context for tracking user contributions
export interface PlantCreationContext {
  userId: number;
  source: 'manual' | 'csv_import' | 'api_import';
  confidence: number; // 0-1 scale for data quality
  needsVerification: boolean;
}

// Fuzzy search match result
export interface FuzzyMatchResult {
  item: PlantSuggestion;
  score: number;
  matches: Array<{
    field: string;
    value: string;
    indices: number[][];
  }>;
}

// Plant lookup options
export interface PlantLookupOptions {
  fuzzyConfig?: Partial<FuzzySearchConfig>;
  includeStats?: boolean;
  userContext?: {
    userId: number;
    includeUserPlants?: boolean;
  };
  filters?: {
    family?: string;
    genus?: string;
    isVerified?: boolean;
    minPopularity?: number;
  };
}

// Plant taxonomy validation result
export interface TaxonomyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: {
    family?: string[];
    genus?: string[];
    species?: string[];
    commonName?: string[];
  };
  duplicates: PlantSuggestion[];
}

// Plant import/export interfaces
export interface PlantImportData {
  family: string;
  genus: string;
  species: string;
  commonName: string;
  careInstructions?: string;
  source: string;
  confidence: number;
}

export interface PlantExportData extends Plant {
  instanceCount: number;
  propagationCount: number;
  createdByName?: string;
}

// Utility type for plant operations
export type PlantOperation = 'create' | 'update' | 'delete' | 'search' | 'import';

// Plant service response wrapper
export interface PlantServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    operation: PlantOperation;
    timestamp: Date;
    userId?: number;
    performance?: {
      queryTime: number;
      cacheHit: boolean;
    };
  };
}

// Helper functions for plant data manipulation
export const plantHelpers = {
  // Create display name from plant data
  createDisplayName: (plant: Pick<Plant, 'commonName' | 'genus' | 'species'>): string => {
    return plant.commonName || `${plant.genus} ${plant.species}`;
  },

  // Create scientific name
  createScientificName: (plant: Pick<Plant, 'genus' | 'species'>): string => {
    return `${plant.genus} ${plant.species}`;
  },

  // Create full taxonomy string
  createFullTaxonomy: (plant: Pick<Plant, 'family' | 'genus' | 'species'>): string => {
    return `${plant.family} > ${plant.genus} > ${plant.species}`;
  },

  // Enhance plant with computed properties
  enhancePlant: (plant: Plant): EnhancedPlant => ({
    ...plant,
    displayName: plantHelpers.createDisplayName(plant),
    scientificName: plantHelpers.createScientificName(plant),
    fullTaxonomy: plantHelpers.createFullTaxonomy(plant),
  }),

  // Check if two plants are taxonomically identical
  areTaxonomicallyEqual: (
    plant1: Pick<Plant, 'family' | 'genus' | 'species'>,
    plant2: Pick<Plant, 'family' | 'genus' | 'species'>
  ): boolean => {
    return (
      plant1.family.toLowerCase() === plant2.family.toLowerCase() &&
      plant1.genus.toLowerCase() === plant2.genus.toLowerCase() &&
      plant1.species.toLowerCase() === plant2.species.toLowerCase()
    );
  },

  // Generate search keywords for a plant
  generateSearchKeywords: (plant: Plant): string[] => {
    const keywords = [
      plant.family.toLowerCase(),
      plant.genus.toLowerCase(),
      plant.species.toLowerCase(),
      plant.commonName.toLowerCase(),
      plantHelpers.createScientificName(plant).toLowerCase(),
    ];

    // Add common name variations (split by spaces, commas, etc.)
    const commonNameParts = plant.commonName
      .toLowerCase()
      .split(/[\s,\-_]+/)
      .filter(part => part.length > 2);
    
    keywords.push(...commonNameParts);

    return [...new Set(keywords)]; // Remove duplicates
  },
};