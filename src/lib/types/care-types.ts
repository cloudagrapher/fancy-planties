import type { CareHistory, PlantInstance, Plant } from '@/lib/db/schema';
import type { EnhancedPlantInstance } from './plant-instance-types';

// Care type enumeration
export type CareType = 
  | 'fertilizer'
  | 'water'
  | 'repot'
  | 'prune'
  | 'inspect'
  | 'other';

// Care status enumeration
export type CareStatus = 
  | 'healthy'      // No care needed
  | 'due_soon'     // Care due within a week
  | 'due_today'    // Care due today
  | 'overdue'      // Care is overdue
  | 'unknown';     // No schedule set

// Care urgency levels for prioritization
export type CareUrgency = 
  | 'critical'     // Severely overdue (>7 days)
  | 'high'         // Overdue (1-7 days)
  | 'medium'       // Due today or tomorrow
  | 'low'          // Due within a week
  | 'none';        // No care needed

// Fertilizer schedule types
export type FertilizerSchedule = 
  | 'weekly'       // Every 7 days
  | 'biweekly'     // Every 14 days
  | 'monthly'      // Every 30 days
  | 'bimonthly'    // Every 60 days
  | 'quarterly'    // Every 90 days
  | 'custom';      // Custom interval in days

// Enhanced care history with computed properties
export interface EnhancedCareHistory extends CareHistory {
  // Joined plant instance data
  plantInstance?: PlantInstance & { plant?: Plant };
  
  // Time since care was performed
  daysSinceCare: number;
  
  // Formatted care date for display
  formattedDate: string;
  
  // Care type display information
  careTypeDisplay: CareTypeDisplay;
}

// Care type display information
export interface CareTypeDisplay {
  label: string;
  icon: string;
  color: string;
  description: string;
}

// Care schedule calculation result
export interface CareScheduleCalculation {
  nextDueDate: Date | null;
  daysBetweenCare: number;
  isOverdue: boolean;
  daysOverdue: number;
  careStatus: CareStatus;
  careUrgency: CareUrgency;
}

// Care statistics for a plant instance
export interface PlantCareStatistics {
  plantInstanceId: number;
  totalCareEvents: number;
  lastCareDate: Date | null;
  averageCareDays: number;
  careConsistencyScore: number; // 0-100 based on schedule adherence
  careTypeBreakdown: Record<CareType, number>;
  longestCareGap: number; // in days
  currentCareStreak: number; // consecutive days with proper care
}

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
    totalCareEventsThisWeek: number;
    averageCareConsistency: number;
  };
  
  quickActions: QuickCareAction[];
}

// Quick care action definition
export interface QuickCareAction {
  id: string;
  label: string;
  icon: string;
  careType: CareType;
  color: string;
  description: string;
  isEnabled: boolean;
}

// Care log entry for quick actions
export interface CareLogEntry {
  plantInstanceId: number;
  careType: CareType;
  careDate: Date;
  notes?: string;
  fertilizerType?: string;
  potSize?: string;
  soilType?: string;
  images?: string[];
}

// Care reminder configuration
export interface CareReminder {
  id: string;
  plantInstanceId: number;
  careType: CareType;
  reminderDate: Date;
  isActive: boolean;
  notificationSent: boolean;
  createdAt: Date;
}

// Care history timeline entry
export interface CareTimelineEntry {
  id: number;
  date: Date;
  careType: CareType;
  notes?: string;
  fertilizerType?: string;
  potSize?: string;
  soilType?: string;
  images: string[];
  daysSinceLastCare?: number;
  wasOnSchedule: boolean;
}

// Care form data for logging new care events
export interface CareFormData {
  plantInstanceId: number;
  careType: CareType;
  careDate: Date;
  notes?: string;
  fertilizerType?: string;
  potSize?: string;
  soilType?: string;
  imageFiles?: File[];
  updateSchedule?: boolean; // Whether to update the plant's next due date
}

// Care validation result
export interface CareValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Bulk care operation
export interface BulkCareOperation {
  plantInstanceIds: number[];
  careType: CareType;
  careDate: Date;
  notes?: string;
  fertilizerType?: string;
}

// Bulk care result
export interface BulkCareResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  results: Array<{
    plantInstanceId: number;
    success: boolean;
    error?: string;
  }>;
}

// Care helper functions
export const careHelpers = {
  // Get care type display information
  getCareTypeDisplay: (careType: CareType): CareTypeDisplay => {
    const displays: Record<CareType, CareTypeDisplay> = {
      fertilizer: {
        label: 'Fertilizer',
        icon: '🌱',
        color: 'text-green-600 bg-green-50',
        description: 'Applied fertilizer to promote growth'
      },
      water: {
        label: 'Water',
        icon: '💧',
        color: 'text-blue-600 bg-blue-50',
        description: 'Watered the plant'
      },
      repot: {
        label: 'Repot',
        icon: '🪴',
        color: 'text-amber-600 bg-amber-50',
        description: 'Repotted with fresh soil'
      },
      prune: {
        label: 'Prune',
        icon: '✂️',
        color: 'text-purple-600 bg-purple-50',
        description: 'Pruned dead or overgrown parts'
      },
      inspect: {
        label: 'Inspect',
        icon: '🔍',
        color: 'text-indigo-600 bg-indigo-50',
        description: 'Inspected for pests or issues'
      },
      other: {
        label: 'Other',
        icon: '📝',
        color: 'text-gray-600 bg-gray-50',
        description: 'Other care activity'
      }
    };
    return displays[careType];
  },

  // Parse fertilizer schedule to days
  parseFertilizerSchedule: (schedule: string): number => {
    const scheduleMap: Record<string, number> = {
      'weekly': 7,
      'biweekly': 14,
      'monthly': 30,
      'bimonthly': 60,
      'quarterly': 90
    };

    // Check if it's a predefined schedule
    if (scheduleMap[schedule]) {
      return scheduleMap[schedule];
    }

    // Try to parse as custom number of days
    const customDays = parseInt(schedule, 10);
    if (!isNaN(customDays) && customDays > 0) {
      return customDays;
    }

    // Default to monthly if unable to parse
    return 30;
  },

  // Calculate next fertilizer due date
  calculateNextFertilizerDue: (lastFertilized: Date | null, schedule: string): Date | null => {
    if (!lastFertilized) return null;

    const intervalDays = careHelpers.parseFertilizerSchedule(schedule);
    const nextDue = new Date(lastFertilized);
    nextDue.setDate(nextDue.getDate() + intervalDays);
    
    return nextDue;
  },

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

  // Calculate care consistency score (0-100)
  calculateCareConsistencyScore: (
    careHistory: CareHistory[],
    schedule: string,
    plantCreatedAt: Date
  ): number => {
    if (careHistory.length === 0) return 0;

    const intervalDays = careHelpers.parseFertilizerSchedule(schedule);
    const now = new Date();
    const totalDays = Math.floor((now.getTime() - plantCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate expected number of care events
    const expectedCareEvents = Math.floor(totalDays / intervalDays);
    if (expectedCareEvents === 0) return 100;

    // Calculate actual care events (only fertilizer for consistency score)
    const fertilizerEvents = careHistory.filter(care => care.careType === 'fertilizer');
    const actualCareEvents = fertilizerEvents.length;

    // Calculate score based on adherence to schedule
    const adherenceScore = Math.min(100, (actualCareEvents / expectedCareEvents) * 100);

    // Bonus points for recent care (within last interval)
    const lastCare = fertilizerEvents[fertilizerEvents.length - 1];
    const daysSinceLastCare = lastCare 
      ? Math.floor((now.getTime() - lastCare.careDate.getTime()) / (1000 * 60 * 60 * 24))
      : Infinity;

    const recentCareBonus = daysSinceLastCare <= intervalDays ? 10 : 0;

    return Math.min(100, adherenceScore + recentCareBonus);
  },

  // Get care status color for UI
  getCareStatusColor: (status: CareStatus): string => {
    switch (status) {
      case 'overdue': return 'text-red-600 bg-red-50 border-red-200';
      case 'due_today': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'due_soon': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'unknown': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
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

  // Format care date for display
  formatCareDate: (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  },

  // Validate care form data
  validateCareForm: (data: CareFormData): CareValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!data.plantInstanceId) {
      errors.push('Plant instance is required');
    }

    if (!data.careType) {
      errors.push('Care type is required');
    }

    if (!data.careDate) {
      errors.push('Care date is required');
    }

    // Date validation
    if (data.careDate) {
      const now = new Date();
      if (data.careDate > now) {
        warnings.push('Care date is in the future');
      }

      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      if (data.careDate < oneYearAgo) {
        warnings.push('Care date is more than a year ago');
      }
    }

    // Care type specific validation
    if (data.careType === 'fertilizer' && !data.fertilizerType) {
      warnings.push('Consider specifying fertilizer type for better tracking');
    }

    if (data.careType === 'repot' && (!data.potSize || !data.soilType)) {
      warnings.push('Consider specifying pot size and soil type for repotting records');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },

  // Create care timeline from history
  createCareTimeline: (careHistory: CareHistory[]): CareTimelineEntry[] => {
    const sortedHistory = [...careHistory].sort((a, b) => 
      b.careDate.getTime() - a.careDate.getTime()
    );

    return sortedHistory.map((care, index) => {
      const nextCare = sortedHistory[index + 1];
      const daysSinceLastCare = nextCare 
        ? Math.floor((care.careDate.getTime() - nextCare.careDate.getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

      // Determine if care was on schedule (simplified logic)
      const wasOnSchedule = care.careType === 'fertilizer' 
        ? daysSinceLastCare ? daysSinceLastCare <= 35 : true // Within 35 days is reasonable
        : true;

      return {
        id: care.id,
        date: care.careDate,
        careType: care.careType,
        notes: care.notes || undefined,
        fertilizerType: care.fertilizerType || undefined,
        potSize: care.potSize || undefined,
        soilType: care.soilType || undefined,
        images: care.images,
        daysSinceLastCare,
        wasOnSchedule
      };
    });
  },

  // Get default quick care actions
  getDefaultQuickCareActions: (): QuickCareAction[] => [
    {
      id: 'fertilize',
      label: 'Fertilize',
      icon: '🌱',
      careType: 'fertilizer',
      color: 'bg-green-500 hover:bg-green-600',
      description: 'Apply fertilizer to promote growth',
      isEnabled: true
    },
    {
      id: 'water',
      label: 'Water',
      icon: '💧',
      careType: 'water',
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'Water the plant',
      isEnabled: true
    },
    {
      id: 'inspect',
      label: 'Inspect',
      icon: '🔍',
      careType: 'inspect',
      color: 'bg-indigo-500 hover:bg-indigo-600',
      description: 'Check for pests or issues',
      isEnabled: true
    },
    {
      id: 'prune',
      label: 'Prune',
      icon: '✂️',
      careType: 'prune',
      color: 'bg-purple-500 hover:bg-purple-600',
      description: 'Remove dead or overgrown parts',
      isEnabled: true
    }
  ]
};