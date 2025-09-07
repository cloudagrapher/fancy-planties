import type { PlantInstance, Plant } from '@/lib/db/schema';
import type { PlantInstanceData, PlantInstanceFilter } from '@/lib/validation/plant-schemas';
import type { CareStatus, CareUrgency } from './care-types';

// Advanced search result interface
export interface AdvancedSearchResult extends PlantInstanceSearchResult {
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

// Enhanced PlantInstance interface with computed properties
export interface EnhancedPlantInstance extends PlantInstance {
  // Joined plant taxonomy data
  plant: Plant;
  
  // Computed care status
  careStatus: CareStatus;
  
  // Days until next fertilizer due (negative if overdue)
  daysUntilFertilizerDue: number | null;
  
  // Days since last fertilized
  daysSinceLastFertilized: number | null;
  
  // Days since last repot
  daysSinceLastRepot: number | null;
  
  // Display name (nickname or plant common name)
  displayName: string;
  
  // Primary image (first image or plant default image)
  primaryImage: string | null;
  
  // Care urgency level for sorting and display
  careUrgency: CareUrgency;
}

// Plant instance with care statistics
export interface PlantInstanceWithStats extends EnhancedPlantInstance {
  // Care history statistics
  totalFertilizerApplications: number;
  averageFertilizerInterval: number; // in days
  lastCareDate: Date | null;
  careConsistencyScore: number; // 0-100 based on schedule adherence
  
  // Growth tracking
  daysSinceAcquired: number;
  repotHistory: RepotEvent[];
  
  // Image history
  imageCount: number;
  hasRecentImages: boolean; // Images added in last 30 days
}

// Repot event interface
export interface RepotEvent {
  date: Date;
  notes?: string;
  potSize?: string;
  soilType?: string;
}

// Plant instance search result
export interface PlantInstanceSearchResult {
  instances: EnhancedPlantInstance[];
  totalCount: number;
  hasMore: boolean;
  searchTime: number;
  filters: PlantInstanceFilter;
}

// Plant instance grid view options
export interface PlantInstanceGridOptions {
  // Display options
  showCareStatus: boolean;
  showLocation: boolean;
  showLastCare: boolean;
  cardSize: 'small' | 'medium' | 'large';
  
  // Sorting options
  sortBy: PlantInstanceSortField;
  sortOrder: 'asc' | 'desc';
  
  // Filtering options
  activeFilter: PlantInstanceFilter;
  
  // View state
  selectedInstances: number[];
  isSelectionMode: boolean;
}

// Sort field options
export type PlantInstanceSortField = 
  | 'nickname'
  | 'location'
  | 'created_at'
  | 'last_fertilized'
  | 'fertilizer_due'
  | 'care_urgency'
  | 'plant_name';

// Care dashboard data
export interface CareDashboardData {
  overdue: EnhancedPlantInstance[];
  dueToday: EnhancedPlantInstance[];
  dueSoon: EnhancedPlantInstance[];
  recentlyCared: EnhancedPlantInstance[];
  
  statistics: {
    totalActivePlants: number;
    overdueCount: number;
    dueTodayCount: number;
    dueSoonCount: number;
    careStreakDays: number;
  };
}

// Quick care action types
export type QuickCareAction = 
  | 'fertilize'
  | 'water'
  | 'repot'
  | 'prune'
  | 'inspect';

// Quick care log entry
export interface QuickCareLog {
  plantInstanceId: number;
  action: QuickCareAction;
  date: Date;
  notes?: string;
}

// Plant instance operation result
export interface PlantInstanceOperationResult {
  success: boolean;
  instance?: EnhancedPlantInstance;
  error?: string;
  warnings?: string[];
}

// Bulk operation result
export interface BulkOperationResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  results: Array<{
    plantInstanceId: number;
    success: boolean;
    error?: string;
  }>;
}

// Plant instance form data
export interface PlantInstanceFormData extends Omit<PlantInstanceData, 'images'> {
  // Handle images as File objects for upload
  imageFiles?: File[];
  // Keep existing images as base64 strings
  existingImages?: string[];
  // Primary image index
  primaryImageIndex?: number;
}

// Plant instance validation context
export interface PlantInstanceValidationContext {
  userId: number;
  isUpdate: boolean;
  existingInstance?: PlantInstance;
  plantTaxonomy?: Plant;
}

// Helper functions for plant instance data manipulation
export const plantInstanceHelpers = {
  // Calculate care status based on fertilizer due date
  calculateCareStatus: (fertilizerDue: Date | null): CareStatus => {
    if (!fertilizerDue) return 'unknown';
    
    const now = new Date();
    const diffMs = fertilizerDue.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'due_today';
    if (diffDays <= 7) return 'due_soon';
    return 'healthy';
  },

  // Calculate care urgency for prioritization
  calculateCareUrgency: (fertilizerDue: Date | null): CareUrgency => {
    if (!fertilizerDue) return 'none';
    
    const now = new Date();
    const diffMs = fertilizerDue.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < -7) return 'critical';
    if (diffDays < 0) return 'high';
    if (diffDays <= 1) return 'medium';
    if (diffDays <= 7) return 'low';
    return 'none';
  },

  // Calculate days until fertilizer due (negative if overdue)
  calculateDaysUntilFertilizerDue: (fertilizerDue: Date | null): number | null => {
    if (!fertilizerDue) return null;
    
    const now = new Date();
    const diffMs = fertilizerDue.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  },

  // Calculate days since last fertilized
  calculateDaysSinceLastFertilized: (lastFertilized: Date | null): number | null => {
    if (!lastFertilized) return null;
    
    const now = new Date();
    const diffMs = now.getTime() - lastFertilized.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  },

  // Calculate days since last repot
  calculateDaysSinceLastRepot: (lastRepot: Date | null): number | null => {
    if (!lastRepot) return null;
    
    const now = new Date();
    const diffMs = now.getTime() - lastRepot.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  },

  // Get display name (nickname or plant common name)
  getDisplayName: (instance: PlantInstance, plant?: Plant): string => {
    return instance.nickname || plant?.commonName || 'Unnamed Plant';
  },

  // Get primary image (first image or plant default image)
  getPrimaryImage: (instance: PlantInstance, plant?: Plant): string | null => {
    if (instance.images && instance.images.length > 0) {
      return instance.images[0];
    }
    return plant?.defaultImage || null;
  },

  // Enhance plant instance with computed properties
  enhancePlantInstance: (instance: PlantInstance, plant: Plant): EnhancedPlantInstance => {
    const careStatus = plantInstanceHelpers.calculateCareStatus(instance.fertilizerDue);
    const careUrgency = plantInstanceHelpers.calculateCareUrgency(instance.fertilizerDue);
    const daysUntilFertilizerDue = plantInstanceHelpers.calculateDaysUntilFertilizerDue(instance.fertilizerDue);
    const daysSinceLastFertilized = plantInstanceHelpers.calculateDaysSinceLastFertilized(instance.lastFertilized);
    const daysSinceLastRepot = plantInstanceHelpers.calculateDaysSinceLastRepot(instance.lastRepot);
    const displayName = plantInstanceHelpers.getDisplayName(instance, plant);
    const primaryImage = plantInstanceHelpers.getPrimaryImage(instance, plant);

    return {
      ...instance,
      plant,
      careStatus,
      careUrgency,
      daysUntilFertilizerDue,
      daysSinceLastFertilized,
      daysSinceLastRepot,
      displayName,
      primaryImage,
    };
  },

  // Sort plant instances by care urgency
  sortByCareUrgency: (instances: EnhancedPlantInstance[]): EnhancedPlantInstance[] => {
    const urgencyOrder: Record<CareUrgency, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
      none: 4,
    };

    return [...instances].sort((a, b) => {
      const aOrder = urgencyOrder[a.careUrgency];
      const bOrder = urgencyOrder[b.careUrgency];
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // If same urgency, sort by fertilizer due date
      if (a.fertilizerDue && b.fertilizerDue) {
        return a.fertilizerDue.getTime() - b.fertilizerDue.getTime();
      }
      
      // If one has no due date, prioritize the one with a due date
      if (a.fertilizerDue && !b.fertilizerDue) return -1;
      if (!a.fertilizerDue && b.fertilizerDue) return 1;
      
      // If neither has a due date, sort by nickname
      return a.displayName.localeCompare(b.displayName);
    });
  },

  // Filter instances by care status
  filterByCareStatus: (instances: EnhancedPlantInstance[], status: CareStatus): EnhancedPlantInstance[] => {
    return instances.filter(instance => instance.careStatus === status);
  },

  // Get care status color for UI
  getCareStatusColor: (status: CareStatus): string => {
    switch (status) {
      case 'overdue': return 'text-red-600 bg-red-50';
      case 'due_today': return 'text-amber-600 bg-amber-50';
      case 'due_soon': return 'text-yellow-600 bg-yellow-50';
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'unknown': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  },

  // Get care urgency color for UI
  getCareUrgencyColor: (urgency: CareUrgency): string => {
    switch (urgency) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-red-400';
      case 'medium': return 'bg-amber-400';
      case 'low': return 'bg-yellow-400';
      case 'none': return 'bg-green-400';
      default: return 'bg-gray-400';
    }
  },
};