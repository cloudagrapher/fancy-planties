import Fuse, { type IFuseOptions } from 'fuse.js';
import type { 
  PlantSuggestion, 
  FuzzySearchConfig,
  PlantSearch 
} from '@/lib/validation/plant-schemas';
import type { 
  FuzzyMatchResult, 
  PlantSearchResult,
  PlantLookupOptions 
} from '@/lib/types/plant-types';
import { searchPlants as dbSearchPlants } from '@/lib/db/queries/plant-taxonomy';

// Default fuzzy search configuration
const DEFAULT_FUSE_CONFIG: IFuseOptions<PlantSuggestion> = {
  threshold: 0.4, // Lower = more strict matching
  location: 0,
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true,
  includeMatches: true,
  keys: [
    {
      name: 'commonName',
      weight: 0.4, // Highest priority for common names
    },
    {
      name: 'genus',
      weight: 0.3,
    },
    {
      name: 'species',
      weight: 0.2,
    },
    {
      name: 'family',
      weight: 0.1, // Lowest priority for family
    },
  ],
};

export class PlantSearchService {
  private fuseInstance: Fuse<PlantSuggestion> | null = null;
  private plantData: PlantSuggestion[] = [];
  private lastUpdate: Date | null = null;
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(private config: Partial<FuzzySearchConfig> = {}) {}

  // Initialize or update the search index
  async initializeIndex(plants: PlantSuggestion[]): Promise<void> {
    this.plantData = plants;
    this.fuseInstance = new Fuse(plants, {
      ...DEFAULT_FUSE_CONFIG,
      threshold: this.config.threshold ?? DEFAULT_FUSE_CONFIG.threshold,
      keys: this.config.keys ? this.config.keys.map(key => ({ name: key, weight: 1 })) : DEFAULT_FUSE_CONFIG.keys,
    });
    this.lastUpdate = new Date();
  }

  // Check if index needs refresh
  private needsRefresh(): boolean {
    if (!this.lastUpdate || !this.fuseInstance) return true;
    return Date.now() - this.lastUpdate.getTime() > this.cacheTimeout;
  }

  // Perform fuzzy search on cached data
  fuzzySearch(query: string, limit: number = 20): FuzzyMatchResult[] {
    if (!this.fuseInstance || this.plantData.length === 0) {
      return [];
    }

    const results = this.fuseInstance.search(query, { limit });
    
    return results.map(result => ({
      item: result.item,
      score: result.score || 0,
      matches: result.matches?.map(match => ({
        field: match.key || '',
        value: match.value || '',
        indices: (match.indices || []).map(tuple => [tuple[0], tuple[1]]),
      })) || [],
    }));
  }

  // Hybrid search: combines database search with fuzzy matching
  async hybridSearch(
    searchParams: PlantSearch,
    options: PlantLookupOptions = {}
  ): Promise<PlantSearchResult> {
    const startTime = Date.now();

    // First, get results from database (handles complex filtering, pagination)
    const dbResults = await dbSearchPlants(searchParams, options);

    // If we have a small result set, enhance with fuzzy search
    if (dbResults.plants.length < 50 && searchParams.query.length >= 2) {
      // Initialize fuzzy search if needed
      if (this.needsRefresh()) {
        await this.initializeIndex(dbResults.plants);
      }

      // Perform fuzzy search on the database results
      const fuzzyResults = this.fuzzySearch(searchParams.query, searchParams.limit);
      
      // Merge and re-rank results
      const mergedResults = this.mergeSearchResults(dbResults.plants, fuzzyResults);
      
      return {
        ...dbResults,
        plants: mergedResults.slice(searchParams.offset || 0, (searchParams.offset || 0) + searchParams.limit),
        searchTime: Date.now() - startTime,
      };
    }

    return {
      ...dbResults,
      searchTime: Date.now() - startTime,
    };
  }

  // Merge database and fuzzy search results with intelligent ranking
  private mergeSearchResults(
    dbResults: PlantSuggestion[],
    fuzzyResults: FuzzyMatchResult[]
  ): PlantSuggestion[] {
    const resultMap = new Map<number, PlantSuggestion & { combinedScore: number }>();

    // Add database results with their scores
    dbResults.forEach(plant => {
      resultMap.set(plant.id, {
        ...plant,
        combinedScore: plant.score || 0,
      });
    });

    // Enhance with fuzzy search scores
    fuzzyResults.forEach(fuzzyResult => {
      const existing = resultMap.get(fuzzyResult.item.id);
      if (existing) {
        // Combine scores: database score (0-100) + fuzzy score (0-1) * 50
        existing.combinedScore = (existing.combinedScore || 0) + (1 - fuzzyResult.score) * 50;
        existing.matchedFields = fuzzyResult.matches.map(m => m.field);
      } else {
        // Add new fuzzy result
        resultMap.set(fuzzyResult.item.id, {
          ...fuzzyResult.item,
          combinedScore: (1 - fuzzyResult.score) * 50,
          matchedFields: fuzzyResult.matches.map(m => m.field),
        });
      }
    });

    // Sort by combined score and return
    return Array.from(resultMap.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .map(({ combinedScore, ...plant }) => ({
        ...plant,
        score: Math.round(combinedScore),
      }));
  }

  // Get search suggestions based on partial input
  async getSearchSuggestions(
    partialQuery: string,
    limit: number = 5
  ): Promise<string[]> {
    if (partialQuery.length < 2) return [];

    const suggestions = new Set<string>();
    
    // Get fuzzy matches
    const fuzzyResults = this.fuzzySearch(partialQuery, limit * 2);
    
    fuzzyResults.forEach(result => {
      // Add common name
      if (result.item.commonName.toLowerCase().includes(partialQuery.toLowerCase())) {
        suggestions.add(result.item.commonName);
      }
      
      // Add scientific name
      const scientificName = `${result.item.genus} ${result.item.species}`;
      if (scientificName.toLowerCase().includes(partialQuery.toLowerCase())) {
        suggestions.add(scientificName);
      }
      
      // Add genus if it matches
      if (result.item.genus.toLowerCase().includes(partialQuery.toLowerCase())) {
        suggestions.add(result.item.genus);
      }
    });

    return Array.from(suggestions).slice(0, limit);
  }

  // Advanced search with multiple criteria
  async advancedSearch(criteria: {
    query?: string;
    family?: string;
    genus?: string;
    species?: string;
    commonName?: string;
    isVerified?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PlantSearchResult> {
    const searchParams: PlantSearch = {
      query: criteria.query || '',
      limit: criteria.limit || 20,
      offset: criteria.offset || 0,
      includeUnverified: criteria.isVerified === undefined ? true : !criteria.isVerified,
    };

    const options: PlantLookupOptions = {
      filters: {
        family: criteria.family,
        genus: criteria.genus,
        isVerified: criteria.isVerified,
      },
    };

    // If we have specific field criteria, use exact matching
    if (criteria.family || criteria.genus || criteria.species || criteria.commonName) {
      return await dbSearchPlants(searchParams, options);
    }

    // Otherwise use hybrid search
    return await this.hybridSearch(searchParams, options);
  }

  // Clear the search cache
  clearCache(): void {
    this.fuseInstance = null;
    this.plantData = [];
    this.lastUpdate = null;
  }

  // Get cache statistics
  getCacheStats() {
    return {
      isInitialized: !!this.fuseInstance,
      plantCount: this.plantData.length,
      lastUpdate: this.lastUpdate,
      needsRefresh: this.needsRefresh(),
    };
  }
}

// Export a singleton instance
export const plantSearchService = new PlantSearchService();

// Utility functions for search result processing
export const searchUtils = {
  // Highlight matched terms in text
  highlightMatches(text: string, matches: string[]): string {
    if (!matches.length) return text;
    
    let highlightedText = text;
    matches.forEach(match => {
      const regex = new RegExp(`(${match})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });
    
    return highlightedText;
  },

  // Extract search keywords from query
  extractKeywords(query: string): string[] {
    return query
      .toLowerCase()
      .split(/[\s,\-_]+/)
      .filter(keyword => keyword.length > 1)
      .slice(0, 5); // Limit to 5 keywords
  },

  // Generate search suggestions based on common patterns
  generateQuerySuggestions(query: string): string[] {
    const suggestions: string[] = [];
    
    // If query looks like scientific name (two words)
    const words = query.trim().split(/\s+/);
    if (words.length === 2) {
      suggestions.push(`${words[0]} ${words[1]}`); // Exact scientific name
      suggestions.push(words[0]); // Just genus
      suggestions.push(words[1]); // Just species
    }
    
    // Add partial matches
    if (query.length >= 3) {
      suggestions.push(`${query}*`); // Prefix search
    }
    
    return suggestions.filter(s => s !== query).slice(0, 3);
  },

  // Score search result relevance
  calculateRelevanceScore(
    plant: PlantSuggestion,
    query: string,
    matchedFields: string[] = []
  ): number {
    let score = 0;
    const lowerQuery = query.toLowerCase();
    
    // Exact matches get highest scores
    if (plant.commonName.toLowerCase() === lowerQuery) score += 100;
    else if (plant.commonName.toLowerCase().startsWith(lowerQuery)) score += 80;
    else if (plant.commonName.toLowerCase().includes(lowerQuery)) score += 60;
    
    const scientificName = `${plant.genus} ${plant.species}`.toLowerCase();
    if (scientificName === lowerQuery) score += 90;
    else if (scientificName.startsWith(lowerQuery)) score += 70;
    else if (scientificName.includes(lowerQuery)) score += 50;
    
    if (plant.genus.toLowerCase() === lowerQuery) score += 75;
    if (plant.species.toLowerCase() === lowerQuery) score += 65;
    if (plant.family.toLowerCase() === lowerQuery) score += 55;
    
    // Boost verified plants
    if (plant.isVerified) score += 10;
    
    // Boost based on matched fields
    matchedFields.forEach(field => {
      if (field === 'commonName') score += 5;
      if (field === 'genus') score += 3;
      if (field === 'species') score += 2;
    });
    
    return Math.min(score, 100); // Cap at 100
  },
};