import 'server-only';

// Note: Care guides functionality temporarily simplified until database types are fully configured
// The care_guides table has been created in the database, but TypeScript integration needs refinement

export interface CareGuideFilters {
  taxonomyLevel?: 'family' | 'genus' | 'species' | 'cultivar';
  family?: string;
  genus?: string;
  species?: string;
  cultivar?: string;
  commonName?: string;
  tags?: string[];
  isPublic?: boolean;
  searchQuery?: string;
}

/**
 * Get care guides for a specific user
 * Temporarily returning empty array until database types are configured
 */
export async function getUserCareGuides(_userId: number, _filters?: CareGuideFilters) {
  return [];
}

/**
 * Get public care guides (for browsing community guides)
 */
export async function getPublicCareGuides(_filters?: CareGuideFilters) {
  return [];
}

/**
 * Get care guide by ID
 */
export async function getCareGuideById(_id: number, _userId?: number) {
  return null;
}

/**
 * Find care guides matching plant taxonomy
 */
export async function findCareGuidesForPlant(
  _family: string,
  _genus: string,
  _species: string,
  _cultivar?: string,
  _userId?: number
) {
  return [];
}

/**
 * Create a new care guide
 */
export async function createCareGuide(_careGuide: Record<string, unknown>) {
  throw new Error('Care guides feature temporarily disabled - database types being configured');
}

/**
 * Update a care guide
 */
export async function updateCareGuide(
  _id: number, 
  _userId: number, 
  _updates: Record<string, unknown>
) {
  throw new Error('Care guides feature temporarily disabled - database types being configured');
}

/**
 * Delete a care guide
 */
export async function deleteCareGuide(_id: number, _userId: number) {
  return false;
}

/**
 * Get care guide statistics for user
 */
export async function getUserCareGuideStats(_userId: number) {
  return {
    total: 0,
    public: 0,
    private: 0,
    byLevel: {
      family: 0,
      genus: 0,
      species: 0,
      cultivar: 0,
    }
  };
}

/**
 * Get unique taxonomy values for search/filtering
 */
export async function getCareGuideTaxonomyValues(_userId?: number) {
  return {
    families: [],
    genera: [],
    species: [],
    cultivars: [],
    commonNames: []
  };
}
