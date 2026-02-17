import 'server-only';

import { plantSearchService } from './plant-search';
import { PlantInstanceQueries } from '@/lib/db/queries/plant-instances';
import type { 
  PlantInstanceFilter, 
  PlantInstanceSearch,
  PlantSuggestion 
} from '@/lib/validation/plant-schemas';
import type { 
  EnhancedPlantInstance, 
  PlantInstanceSearchResult,
  PlantInstanceSortField 
} from '@/lib/types/plant-instance-types';

// Advanced search configuration
export interface AdvancedSearchConfig {
  // Search behavior
  enableFuzzySearch: boolean;
  fuzzyThreshold: number;
  maxSuggestions: number;
  
  // Performance settings
  searchTimeout: number;
  cacheResults: boolean;
  cacheDuration: number;
  
  // Result highlighting
  highlightMatches: boolean;
  maxHighlights: number;
}

// Search preset interface
export interface SearchPreset {
  id: string;
  name: string;
  description?: string;
  filters: PlantInstanceFilter;
  sortBy: PlantInstanceSortField;
  sortOrder: 'asc' | 'desc';
  userId: number;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Search history entry
export interface SearchHistoryEntry {
  id: string;
  query: string;
  filters: Partial<PlantInstanceFilter>;
  resultCount: number;
  searchTime: number;
  userId: number;
  timestamp: Date;
}

// Advanced search result with metadata
export interface AdvancedSearchResult extends Omit<PlantInstanceSearchResult, 'facets'> {
  // Search metadata
  searchId: string;
  searchType: 'basic' | 'advanced' | 'fuzzy' | 'preset';
  suggestions: string[];
  relatedSearches: string[];
  
  // Performance metrics
  databaseTime: number;
  processingTime: number;
  
  // Result enhancements
  highlightedResults?: EnhancedPlantInstance[];
  facets?: SearchFacets;
}

// Search facets for filtering
export interface SearchFacets {
  locations: Array<{ value: string; count: number }>;
  plantTypes: Array<{ value: string; count: number; plantId: number }>;
  careStatus: Array<{ value: string; count: number }>;
  dateRanges: Array<{ value: string; count: number; range: [Date, Date] }>;
}

// Multi-field search criteria
export interface MultiFieldSearchCriteria {
  // Text search fields
  nickname?: string;
  location?: string;
  notes?: string;
  plantName?: string;
  
  // Plant taxonomy fields
  family?: string;
  genus?: string;
  species?: string;
  commonName?: string;
  
  // Care-related fields
  fertilizerSchedule?: string;
  
  // Combine with AND or OR logic
  operator: 'AND' | 'OR';
  
  // Field weights for relevance scoring
  fieldWeights?: Record<string, number>;
}

export class AdvancedSearchService {
  private config: AdvancedSearchConfig;
  private searchHistory: Map<number, SearchHistoryEntry[]> = new Map();
  private searchPresets: Map<number, SearchPreset[]> = new Map();
  private resultCache: Map<string, { result: AdvancedSearchResult; expiry: Date }> = new Map();

  constructor(config: Partial<AdvancedSearchConfig> = {}) {
    this.config = {
      enableFuzzySearch: true,
      fuzzyThreshold: 0.6,
      maxSuggestions: 10,
      searchTimeout: 5000,
      cacheResults: true,
      cacheDuration: 5 * 60 * 1000, // 5 minutes
      highlightMatches: true,
      maxHighlights: 3,
      ...config,
    };
  }

  // Multi-field search across all plant instance data
  async multiFieldSearch(
    criteria: MultiFieldSearchCriteria,
    userId: number,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: PlantInstanceSortField;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<AdvancedSearchResult> {
    const startTime = Date.now();
    const searchId = this.generateSearchId();

    try {
      // Build search filters based on criteria
      const filters = this.buildFiltersFromCriteria(criteria, userId);
      
      // Perform database search
      const dbStartTime = Date.now();
      const searchResult = await PlantInstanceQueries.getWithFilters({
        ...filters,
        limit: options.limit || 20,
        offset: options.offset || 0,
      });
      const databaseTime = Date.now() - dbStartTime;

      // Apply fuzzy search if enabled and query is text-based
      let enhancedResults = searchResult.instances;
      if (this.config.enableFuzzySearch && this.hasTextCriteria(criteria)) {
        enhancedResults = await this.applyFuzzySearch(
          enhancedResults,
          criteria,
          searchResult.totalCount
        );
      }

      // Generate search suggestions
      const suggestions = await this.generateSearchSuggestions(criteria, userId);
      
      // Generate related searches
      const relatedSearches = await this.generateRelatedSearches(criteria, userId);
      
      // Calculate facets
      const facets = await this.calculateSearchFacets(enhancedResults, userId);
      
      // Highlight matches if enabled
      const highlightedResults = this.config.highlightMatches
        ? this.highlightSearchMatches(enhancedResults, criteria)
        : undefined;

      const processingTime = Date.now() - startTime - databaseTime;

      const result: AdvancedSearchResult = {
        ...searchResult,
        instances: enhancedResults,
        searchId,
        searchType: 'advanced',
        suggestions,
        relatedSearches,
        databaseTime,
        processingTime,
        highlightedResults,
        facets,
      };

      // Cache result if enabled
      if (this.config.cacheResults) {
        this.cacheSearchResult(searchId, result);
      }

      // Add to search history
      await this.addToSearchHistory(userId, criteria, result);

      return result;
    } catch (error) {
      console.error('Multi-field search failed:', error);
      throw new Error('Advanced search failed');
    }
  }

  // Smart search with auto-detection of search intent
  async smartSearch(
    query: string,
    userId: number,
    options: {
      limit?: number;
      offset?: number;
      autoCorrect?: boolean;
      includeInactive?: boolean;
    } = {}
  ): Promise<AdvancedSearchResult> {
    const startTime = Date.now();
    const searchId = this.generateSearchId();

    try {
      // Analyze query to determine search intent
      const searchIntent = this.analyzeSearchIntent(query);
      
      // Build search criteria based on intent
      const criteria = this.buildCriteriaFromIntent(searchIntent, query);
      
      // Perform multi-field search
      const result = await this.multiFieldSearch(criteria, userId, options);
      
      // Update result metadata
      result.searchId = searchId;
      result.searchType = searchIntent.type;

      return result;
    } catch (error) {
      console.error('Smart search failed:', error);
      throw new Error('Smart search failed');
    }
  }

  // Search with saved presets
  async searchWithPreset(
    presetId: string,
    userId: number,
    overrides: Partial<PlantInstanceFilter> = {}
  ): Promise<AdvancedSearchResult> {
    const preset = await this.getSearchPreset(presetId, userId);
    if (!preset) {
      throw new Error('Search preset not found');
    }

    const filters: PlantInstanceFilter = {
      ...preset.filters,
      ...overrides,
    };

    const searchResult = await PlantInstanceQueries.getWithFilters(filters);
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { facets: _baseFacets, ...baseResult } = searchResult;
    const result: AdvancedSearchResult = {
      ...baseResult,
      searchId: this.generateSearchId(),
      searchType: 'preset',
      suggestions: [],
      relatedSearches: [],
      databaseTime: searchResult.searchTime,
      processingTime: 0,
    };

    return result;
  }

  // Get search suggestions based on partial input
  async getSearchSuggestions(
    partialQuery: string,
    userId: number,
    limit: number = 5
  ): Promise<string[]> {
    if (partialQuery.length < 2) return [];

    const suggestions = new Set<string>();

    // Get suggestions from search history
    const historySuggestions = this.getHistorySuggestions(partialQuery, userId);
    historySuggestions.forEach(s => suggestions.add(s));

    // Get suggestions from plant taxonomy
    const taxonomySuggestions = await plantSearchService.getSearchSuggestions(
      partialQuery,
      Math.ceil(limit / 2)
    );
    taxonomySuggestions.forEach(s => suggestions.add(s));

    // Get suggestions from plant instance data
    const instanceSuggestions = await this.getInstanceSuggestions(partialQuery, userId);
    instanceSuggestions.forEach(s => suggestions.add(s));

    return Array.from(suggestions).slice(0, limit);
  }

  // Save search as preset
  async saveSearchPreset(
    name: string,
    description: string,
    filters: PlantInstanceFilter,
    sortBy: PlantInstanceSortField,
    sortOrder: 'asc' | 'desc',
    userId: number,
    isDefault: boolean = false
  ): Promise<SearchPreset> {
    const preset: SearchPreset = {
      id: this.generatePresetId(),
      name,
      description,
      filters,
      sortBy,
      sortOrder,
      userId,
      isDefault,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store preset (in a real app, this would be in the database)
    const userPresets = this.searchPresets.get(userId) || [];
    userPresets.push(preset);
    this.searchPresets.set(userId, userPresets);

    return preset;
  }

  // Get user's search presets
  async getUserSearchPresets(userId: number): Promise<SearchPreset[]> {
    return this.searchPresets.get(userId) || [];
  }

  // Get search history for user
  async getSearchHistory(userId: number, limit: number = 10): Promise<SearchHistoryEntry[]> {
    const history = this.searchHistory.get(userId) || [];
    return history
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Clear search history
  async clearSearchHistory(userId: number): Promise<void> {
    this.searchHistory.delete(userId);
  }

  // Private helper methods

  private buildFiltersFromCriteria(
    criteria: MultiFieldSearchCriteria,
    userId: number
  ): PlantInstanceFilter {
    const filters: PlantInstanceFilter = {
      userId,
      overdueOnly: false,
      limit: 20,
      offset: 0,
    };

    // Add location filter if specified
    if (criteria.location) {
      filters.location = criteria.location;
    }

    // For now, we'll use the basic search functionality
    // In a full implementation, we'd need to extend the database queries
    // to support multi-field search with AND/OR operators

    return filters;
  }

  private hasTextCriteria(criteria: MultiFieldSearchCriteria): boolean {
    return !!(
      criteria.nickname ||
      criteria.location ||
      criteria.notes ||
      criteria.plantName ||
      criteria.commonName
    );
  }

  private async applyFuzzySearch(
    instances: EnhancedPlantInstance[],
    criteria: MultiFieldSearchCriteria,
    totalCount: number
  ): Promise<EnhancedPlantInstance[]> {
    // Convert instances to searchable format
    const searchableData: PlantSuggestion[] = instances.map(instance => ({
      id: instance.id,
      family: instance.plant.family,
      genus: instance.plant.genus,
      species: instance.plant.species,
      commonName: instance.plant.commonName,
      isVerified: instance.plant.isVerified,
    }));

    // Initialize fuzzy search
    await plantSearchService.initializeIndex(searchableData);

    // Perform fuzzy search if we have a text query
    const textQuery = this.extractTextQuery(criteria);
    if (textQuery) {
      const fuzzyResults = plantSearchService.fuzzySearch(textQuery, instances.length);
      
      // Re-order instances based on fuzzy search scores
      const scoreMap = new Map(fuzzyResults.map(r => [r.item.id, r.score]));
      
      return instances.sort((a, b) => {
        const scoreA = scoreMap.get(a.id) || 1;
        const scoreB = scoreMap.get(b.id) || 1;
        return scoreA - scoreB; // Lower score = better match
      });
    }

    return instances;
  }

  private extractTextQuery(criteria: MultiFieldSearchCriteria): string {
    const parts = [
      criteria.nickname,
      criteria.location,
      criteria.plantName,
      criteria.commonName,
    ].filter(Boolean);

    return parts.join(' ');
  }

  private async generateSearchSuggestions(
    criteria: MultiFieldSearchCriteria,
    userId: number
  ): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Add suggestions based on search history
    const history = await this.getSearchHistory(userId, 5);
    history.forEach(entry => {
      if (entry.query && !suggestions.includes(entry.query)) {
        suggestions.push(entry.query);
      }
    });

    return suggestions.slice(0, this.config.maxSuggestions);
  }

  private async generateRelatedSearches(
    criteria: MultiFieldSearchCriteria,
    userId: number
  ): Promise<string[]> {
    // Generate related searches based on criteria
    const related: string[] = [];
    
    if (criteria.location) {
      related.push(`plants in ${criteria.location}`);
    }
    
    if (criteria.plantName) {
      related.push(`${criteria.plantName} care`);
      related.push(`${criteria.plantName} fertilizer`);
    }

    return related.slice(0, 3);
  }

  private async calculateSearchFacets(
    instances: EnhancedPlantInstance[],
    userId: number
  ): Promise<SearchFacets> {
    // Calculate facets from search results
    const locationCounts = new Map<string, number>();
    const plantTypeCounts = new Map<string, { count: number; plantId: number }>();
    const careStatusCounts = new Map<string, number>();

    instances.forEach(instance => {
      // Location facets
      if (instance.location) {
        locationCounts.set(instance.location, (locationCounts.get(instance.location) || 0) + 1);
      }

      // Plant type facets
      const plantType = instance.plant.commonName;
      if (plantType) {
        const existing = plantTypeCounts.get(plantType);
        plantTypeCounts.set(plantType, {
          count: (existing?.count || 0) + 1,
          plantId: instance.plant.id,
        });
      }

      // Care status facets
      careStatusCounts.set(
        instance.careStatus,
        (careStatusCounts.get(instance.careStatus) || 0) + 1
      );
    });

    return {
      locations: Array.from(locationCounts.entries()).map(([value, count]) => ({ value, count })),
      plantTypes: Array.from(plantTypeCounts.entries()).map(([value, data]) => ({
        value,
        count: data.count,
        plantId: data.plantId,
      })),
      careStatus: Array.from(careStatusCounts.entries()).map(([value, count]) => ({ value, count })),
      dateRanges: [], // Would implement date range facets in full version
    };
  }

  private highlightSearchMatches(
    instances: EnhancedPlantInstance[],
    criteria: MultiFieldSearchCriteria
  ): EnhancedPlantInstance[] {
    // In a full implementation, this would highlight matching text
    // For now, just return the instances as-is
    return instances;
  }

  private analyzeSearchIntent(query: string): { type: 'basic' | 'fuzzy'; confidence: number } {
    // Simple intent analysis - in a full implementation this would be more sophisticated
    const hasSpecialChars = /[*?~]/.test(query);
    const hasQuotes = /["']/.test(query);
    const wordCount = query.trim().split(/\s+/).length;

    if (hasSpecialChars || hasQuotes) {
      return { type: 'basic', confidence: 0.9 };
    }

    if (wordCount > 3) {
      return { type: 'fuzzy', confidence: 0.7 };
    }

    return { type: 'basic', confidence: 0.6 };
  }

  private buildCriteriaFromIntent(
    intent: { type: string; confidence: number },
    query: string
  ): MultiFieldSearchCriteria {
    // Build search criteria based on detected intent
    return {
      nickname: query,
      plantName: query,
      location: query,
      operator: 'OR',
      fieldWeights: {
        nickname: 1.0,
        plantName: 0.8,
        location: 0.6,
        notes: 0.4,
      },
    };
  }

  private async getSearchPreset(presetId: string, userId: number): Promise<SearchPreset | null> {
    const userPresets = this.searchPresets.get(userId) || [];
    return userPresets.find(preset => preset.id === presetId) || null;
  }

  private getHistorySuggestions(partialQuery: string, userId: number): string[] {
    const history = this.searchHistory.get(userId) || [];
    const lowerQuery = partialQuery.toLowerCase();
    
    return history
      .filter(entry => entry.query.toLowerCase().includes(lowerQuery))
      .map(entry => entry.query)
      .slice(0, 3);
  }

  private async getInstanceSuggestions(partialQuery: string, userId: number): Promise<string[]> {
    // Get suggestions from user's plant instances
    // This would query the database for matching nicknames, locations, etc.
    // For now, return empty array
    return [];
  }

  private async addToSearchHistory(
    userId: number,
    criteria: MultiFieldSearchCriteria,
    result: AdvancedSearchResult
  ): Promise<void> {
    const entry: SearchHistoryEntry = {
      id: this.generateSearchId(),
      query: this.extractTextQuery(criteria),
      filters: {}, // Would extract relevant filters
      resultCount: result.totalCount,
      searchTime: result.searchTime,
      userId,
      timestamp: new Date(),
    };

    const history = this.searchHistory.get(userId) || [];
    history.unshift(entry);
    
    // Keep only last 50 searches
    if (history.length > 50) {
      history.splice(50);
    }
    
    this.searchHistory.set(userId, history);
  }

  private cacheSearchResult(searchId: string, result: AdvancedSearchResult): void {
    const expiry = new Date(Date.now() + this.config.cacheDuration);
    this.resultCache.set(searchId, { result, expiry });
    
    // Clean up expired cache entries
    this.cleanupCache();
  }

  private cleanupCache(): void {
    const now = new Date();
    for (const [key, { expiry }] of this.resultCache.entries()) {
      if (expiry < now) {
        this.resultCache.delete(key);
      }
    }
  }

  private generateSearchId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePresetId(): string {
    return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const advancedSearchService = new AdvancedSearchService();

// Search result highlighting utilities
export const searchHighlightUtils = {
  // Highlight matching terms in text
  highlightText: (text: string, terms: string[]): string => {
    if (!terms.length) return text;
    
    let highlightedText = text;
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
    });
    
    return highlightedText;
  },

  // Extract search terms from query
  extractSearchTerms: (query: string): string[] => {
    return query
      .toLowerCase()
      .split(/[\s,\-_]+/)
      .filter(term => term.length > 1)
      .slice(0, 5);
  },

  // Calculate relevance score for search result
  calculateRelevanceScore: (
    instance: EnhancedPlantInstance,
    searchTerms: string[]
  ): number => {
    let score = 0;
    const lowerTerms = searchTerms.map(t => t.toLowerCase());
    
    // Check nickname matches
    const nickname = instance.nickname.toLowerCase();
    lowerTerms.forEach(term => {
      if (nickname === term) score += 100;
      else if (nickname.startsWith(term)) score += 80;
      else if (nickname.includes(term)) score += 60;
    });
    
    // Check plant name matches
    const plantName = instance.plant.commonName.toLowerCase();
    lowerTerms.forEach(term => {
      if (plantName === term) score += 90;
      else if (plantName.startsWith(term)) score += 70;
      else if (plantName.includes(term)) score += 50;
    });
    
    // Check location matches
    const location = instance.location.toLowerCase();
    lowerTerms.forEach(term => {
      if (location === term) score += 70;
      else if (location.includes(term)) score += 40;
    });
    
    // Boost based on care urgency (more urgent = higher relevance)
    switch (instance.careUrgency) {
      case 'critical': score += 20; break;
      case 'high': score += 15; break;
      case 'medium': score += 10; break;
      case 'low': score += 5; break;
    }
    
    return Math.min(score, 100);
  },
};