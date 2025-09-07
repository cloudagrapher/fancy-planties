export { default as AdvancedSearchInterface } from './AdvancedSearchInterface';
export { default as SearchResults } from './SearchResults';
export { default as SearchPresetManager } from './SearchPresetManager';
export { default as SearchHistory } from './SearchHistory';

// Re-export types for convenience
export type {
  MultiFieldSearch,
  SearchPreset,
  EnhancedPlantInstanceFilter,
  AdvancedSearchConfig,
} from '@/lib/validation/plant-schemas';

export type {
  AdvancedSearchResult,
  SearchFacets,
} from '@/lib/types/plant-instance-types';