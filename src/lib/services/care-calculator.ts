import type { 
  CareStatus, 
  CareUrgency, 
  CareScheduleCalculation,
  PlantCareStatistics,
  CareSchedule,
  CareFrequency,
  CareType
} from '@/lib/types/care-types';
import type { CareHistory, PlantInstance } from '@/lib/db/schema';
import { careValidation } from '@/lib/validation/care-schemas';

/**
 * Care calculation utilities for fertilizer schedules and due date management
 */
export class CareCalculator {
  
  // Instance methods for testing compatibility
  
  /**
   * Calculate next due date based on last care date and schedule
   */
  calculateNextDueDate(lastCareDate: Date, schedule: CareSchedule): Date {
    const nextDue = new Date(lastCareDate);
    
    switch (schedule.frequency) {
      case 'daily':
        nextDue.setDate(nextDue.getDate() + schedule.interval);
        break;
      case 'weekly':
        nextDue.setDate(nextDue.getDate() + (schedule.interval * 7));
        break;
      case 'monthly':
        // Handle end of month dates properly
        const currentDay = nextDue.getDate();
        nextDue.setMonth(nextDue.getMonth() + schedule.interval);
        // If the day changed due to shorter month, adjust to last day of target month
        if (nextDue.getDate() !== currentDay) {
          nextDue.setDate(0); // Set to last day of previous month (which is our target month)
        }
        break;
      case 'seasonal':
        // Add 3 months per interval, handling month overflow properly
        const targetMonth = nextDue.getMonth() + (schedule.interval * 3);
        const targetYear = nextDue.getFullYear() + Math.floor(targetMonth / 12);
        const finalMonth = targetMonth % 12;
        const originalDay = nextDue.getDate();
        
        // Create new date to avoid timezone issues
        nextDue.setFullYear(targetYear, finalMonth, originalDay);
        break;
      case 'custom':
        if (schedule.customDays) {
          nextDue.setDate(nextDue.getDate() + schedule.customDays);
        } else {
          nextDue.setDate(nextDue.getDate() + schedule.interval);
        }
        break;
      default:
        nextDue.setDate(nextDue.getDate() + 30); // Default to monthly
    }
    
    return nextDue;
  }

  /**
   * Parse schedule string into CareSchedule object
   */
  parseScheduleString(scheduleString: string): CareSchedule {
    const normalized = scheduleString.toLowerCase().trim();
    
    // Handle "X weeks" format
    const weeksMatch = normalized.match(/^(\d+)\s+weeks?$/);
    if (weeksMatch) {
      return {
        frequency: 'weekly',
        interval: parseInt(weeksMatch[1], 10),
        careType: 'fertilizer'
      };
    }
    
    // Handle "X month" format
    const monthMatch = normalized.match(/^(\d+)\s+months?$/);
    if (monthMatch) {
      return {
        frequency: 'monthly',
        interval: parseInt(monthMatch[1], 10),
        careType: 'fertilizer'
      };
    }
    
    // Handle "every X days" format
    const daysMatch = normalized.match(/^every\s+(\d+)\s+days?$/);
    if (daysMatch) {
      return {
        frequency: 'custom',
        interval: 1,
        careType: 'fertilizer',
        customDays: parseInt(daysMatch[1], 10)
      };
    }
    
    // Handle seasonal
    if (normalized === 'seasonal') {
      return {
        frequency: 'seasonal',
        interval: 1,
        careType: 'fertilizer'
      };
    }
    
    // Default fallback
    return {
      frequency: 'monthly',
      interval: 1,
      careType: 'fertilizer'
    };
  }

  /**
   * Calculate care urgency based on due date
   */
  calculateCareUrgency(dueDate: Date | null, currentDate: Date = new Date()): CareUrgency {
    if (!dueDate) return 'none';
    
    const diffMs = dueDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays > 1) return 'none';
    if (diffDays >= 0) return 'low';
    if (diffDays >= -3) return 'medium';
    if (diffDays >= -7) return 'high';
    return 'critical';
  }

  /**
   * Get days until due (negative if overdue)
   */
  getDaysUntilDue(dueDate: Date | null, currentDate: Date = new Date()): number | null {
    if (!dueDate) return null;
    
    const diffMs = dueDate.getTime() - currentDate.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Get care status based on care history and schedule
   */
  getCareStatus(
    careHistory: Array<{ careDate: Date; careType: string }>, 
    schedule: CareSchedule,
    currentDate: Date = new Date()
  ): 'excellent' | 'good' | 'needs_attention' | 'poor' {
    if (careHistory.length === 0) return 'needs_attention';
    
    // Filter care events by type
    const relevantCare = careHistory.filter(care => care.careType === schedule.careType);
    if (relevantCare.length === 0) return 'needs_attention';
    
    // Sort by date
    const sortedCare = relevantCare.sort((a, b) => a.careDate.getTime() - b.careDate.getTime());
    
    // Calculate expected interval in days
    let expectedIntervalDays: number;
    switch (schedule.frequency) {
      case 'daily':
        expectedIntervalDays = schedule.interval;
        break;
      case 'weekly':
        expectedIntervalDays = schedule.interval * 7;
        break;
      case 'monthly':
        expectedIntervalDays = schedule.interval * 30;
        break;
      case 'seasonal':
        expectedIntervalDays = schedule.interval * 90;
        break;
      case 'custom':
        expectedIntervalDays = schedule.customDays || schedule.interval;
        break;
      default:
        expectedIntervalDays = 30;
    }
    
    // Calculate consistency score
    let totalDeviation = 0;
    let intervals = 0;
    
    for (let i = 1; i < sortedCare.length; i++) {
      const actualInterval = Math.floor(
        (sortedCare[i].careDate.getTime() - sortedCare[i - 1].careDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const deviation = Math.abs(actualInterval - expectedIntervalDays);
      totalDeviation += deviation;
      intervals++;
    }
    
    if (intervals === 0) {
      // Only one care event, check if it's recent
      const daysSinceLastCare = Math.floor(
        (currentDate.getTime() - sortedCare[0].careDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceLastCare <= expectedIntervalDays * 1.5 ? 'good' : 'needs_attention';
    }
    
    const averageDeviation = totalDeviation / intervals;
    const deviationPercentage = (averageDeviation / expectedIntervalDays) * 100;
    
    // Check recency
    const lastCare = sortedCare[sortedCare.length - 1];
    const daysSinceLastCare = Math.floor(
      (currentDate.getTime() - lastCare.careDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // If care is very overdue, it's poor regardless of past consistency
    if (daysSinceLastCare > expectedIntervalDays * 3) return 'poor';
    
    // Rate based on consistency - be more lenient
    if (deviationPercentage <= 20) return 'excellent';
    if (deviationPercentage <= 40) return 'good';
    if (deviationPercentage <= 80) return 'needs_attention';
    return 'poor';
  }

  /**
   * Calculate care streak based on care history and schedule
   */
  calculateCareStreak(
    careHistory: Array<{ careDate: Date; careType: string }>, 
    schedule: CareSchedule,
    currentDate: Date = new Date()
  ): number {
    if (careHistory.length === 0) return 0;
    
    // Filter and sort care events
    const relevantCare = careHistory
      .filter(care => care.careType === schedule.careType)
      .sort((a, b) => a.careDate.getTime() - b.careDate.getTime()); // Oldest first for streak calculation
    
    if (relevantCare.length === 0) return 0;
    if (relevantCare.length === 1) return 1;
    
    // Calculate expected interval
    let expectedIntervalDays: number;
    switch (schedule.frequency) {
      case 'daily':
        expectedIntervalDays = schedule.interval;
        break;
      case 'weekly':
        expectedIntervalDays = schedule.interval * 7;
        break;
      case 'monthly':
        expectedIntervalDays = schedule.interval * 30;
        break;
      case 'seasonal':
        expectedIntervalDays = schedule.interval * 90;
        break;
      case 'custom':
        expectedIntervalDays = schedule.customDays || schedule.interval;
        break;
      default:
        expectedIntervalDays = 30;
    }
    
    // Count consecutive care events that are within acceptable intervals
    let streak = 1; // Start with 1 for the first care event
    
    for (let i = 1; i < relevantCare.length; i++) {
      const previousCare = relevantCare[i - 1];
      const currentCare = relevantCare[i];
      
      const daysBetweenCare = Math.floor(
        (currentCare.careDate.getTime() - previousCare.careDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Allow some grace period (50% extra)
      const maxAllowedGap = expectedIntervalDays * 1.5;
      
      if (daysBetweenCare <= maxAllowedGap) {
        streak++;
      } else {
        // Streak broken, start counting from current care event
        streak = 1;
      }
    }
    
    return streak;
  }

  /**
   * Get optimal care schedule based on plant type and care type
   */
  getOptimalCareSchedule(plantType: string, careType: CareType): CareSchedule {
    const plantTypeLower = plantType.toLowerCase();
    
    // Define optimal schedules based on plant type and care type
    const scheduleMap: Record<string, Record<CareType, Partial<CareSchedule>>> = {
      succulent: {
        fertilizer: { frequency: 'monthly', interval: 2 },
        water: { frequency: 'weekly', interval: 2 },
        repot: { frequency: 'seasonal', interval: 4 },
        prune: { frequency: 'seasonal', interval: 2 },
        inspect: { frequency: 'monthly', interval: 1 },
        other: { frequency: 'monthly', interval: 1 }
      },
      tropical: {
        fertilizer: { frequency: 'weekly', interval: 2 },
        water: { frequency: 'weekly', interval: 1 },
        repot: { frequency: 'seasonal', interval: 2 },
        prune: { frequency: 'monthly', interval: 2 },
        inspect: { frequency: 'weekly', interval: 2 },
        other: { frequency: 'monthly', interval: 1 }
      },
      cactus: {
        fertilizer: { frequency: 'monthly', interval: 3 },
        water: { frequency: 'monthly', interval: 1 },
        repot: { frequency: 'seasonal', interval: 6 },
        prune: { frequency: 'seasonal', interval: 1 },
        inspect: { frequency: 'monthly', interval: 2 },
        other: { frequency: 'monthly', interval: 1 }
      },
      herb: {
        fertilizer: { frequency: 'weekly', interval: 1 },
        water: { frequency: 'daily', interval: 2 },
        repot: { frequency: 'seasonal', interval: 1 },
        prune: { frequency: 'weekly', interval: 2 },
        inspect: { frequency: 'weekly', interval: 1 },
        other: { frequency: 'weekly', interval: 1 }
      }
    };
    
    // Get schedule for plant type, fallback to tropical for unknown types
    const plantSchedules = scheduleMap[plantTypeLower] || scheduleMap.tropical;
    const baseSchedule = plantSchedules[careType] || plantSchedules.fertilizer;
    
    return {
      frequency: baseSchedule.frequency || 'monthly',
      interval: baseSchedule.interval || 1,
      careType,
      ...(baseSchedule.customDays && { customDays: baseSchedule.customDays })
    };
  }

  // Static methods (existing implementation for backward compatibility)
  
  /**
   * Calculate next fertilizer due date based on last fertilized date and schedule
   */
  static calculateNextFertilizerDue(
    lastFertilized: Date | null, 
    schedule: string
  ): Date | null {
    if (!lastFertilized) return null;

    const intervalDays = careValidation.parseFertilizerScheduleToDays(schedule);
    const nextDue = new Date(lastFertilized);
    nextDue.setDate(nextDue.getDate() + intervalDays);
    
    return nextDue;
  }

  /**
   * Calculate comprehensive care schedule information
   */
  static calculateCareSchedule(
    lastFertilized: Date | null,
    schedule: string,
    currentDate: Date = new Date()
  ): CareScheduleCalculation {
    const nextDueDate = this.calculateNextFertilizerDue(lastFertilized, schedule);
    const daysBetweenCare = careValidation.parseFertilizerScheduleToDays(schedule);
    
    if (!nextDueDate) {
      return {
        nextDueDate: null,
        daysBetweenCare,
        isOverdue: false,
        daysOverdue: 0,
        careStatus: 'unknown',
        careUrgency: 'none'
      };
    }

    const diffMs = nextDueDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const isOverdue = diffDays < 0;
    const daysOverdue = isOverdue ? Math.abs(diffDays) : 0;

    return {
      nextDueDate,
      daysBetweenCare,
      isOverdue,
      daysOverdue,
      careStatus: this.calculateCareStatus(nextDueDate, currentDate),
      careUrgency: this.calculateCareUrgency(nextDueDate, currentDate)
    };
  }

  /**
   * Calculate care status based on fertilizer due date
   */
  static calculateCareStatus(
    fertilizerDue: Date | null, 
    currentDate: Date = new Date()
  ): CareStatus {
    if (!fertilizerDue) return 'unknown';
    
    const diffMs = fertilizerDue.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'due_today';
    if (diffDays <= 7) return 'due_soon';
    return 'healthy';
  }

  /**
   * Calculate care urgency for prioritization
   */
  static calculateCareUrgency(
    fertilizerDue: Date | null, 
    currentDate: Date = new Date()
  ): CareUrgency {
    if (!fertilizerDue) return 'none';
    
    const diffMs = fertilizerDue.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < -7) return 'critical';
    if (diffDays < 0) return 'high';
    if (diffDays <= 1) return 'medium';
    if (diffDays <= 7) return 'low';
    return 'none';
  }

  /**
   * Calculate days until fertilizer due (negative if overdue)
   */
  static calculateDaysUntilFertilizerDue(
    fertilizerDue: Date | null, 
    currentDate: Date = new Date()
  ): number | null {
    if (!fertilizerDue) return null;
    
    const diffMs = fertilizerDue.getTime() - currentDate.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate days since last fertilized
   */
  static calculateDaysSinceLastFertilized(
    lastFertilized: Date | null, 
    currentDate: Date = new Date()
  ): number | null {
    if (!lastFertilized) return null;
    
    const diffMs = currentDate.getTime() - lastFertilized.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate days since last repot
   */
  static calculateDaysSinceLastRepot(
    lastRepot: Date | null, 
    currentDate: Date = new Date()
  ): number | null {
    if (!lastRepot) return null;
    
    const diffMs = currentDate.getTime() - lastRepot.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate comprehensive care statistics for a plant instance
   */
  static calculatePlantCareStatistics(
    plantInstance: PlantInstance,
    careHistory: CareHistory[]
  ): PlantCareStatistics {
    const currentDate = new Date();
    const plantAge = Math.floor(
      (currentDate.getTime() - plantInstance.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Filter fertilizer care events
    const fertilizerEvents = careHistory
      .filter(care => care.careType === 'fertilizer')
      .sort((a, b) => a.careDate.getTime() - b.careDate.getTime());

    // Calculate care type breakdown
    const careTypeBreakdown = careHistory.reduce((acc, care) => {
      acc[care.careType] = (acc[care.careType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average care interval
    let averageCareDays = 0;
    if (fertilizerEvents.length > 1) {
      const intervals = [];
      for (let i = 1; i < fertilizerEvents.length; i++) {
        const interval = Math.floor(
          (fertilizerEvents[i].careDate.getTime() - fertilizerEvents[i - 1].careDate.getTime()) 
          / (1000 * 60 * 60 * 24)
        );
        intervals.push(interval);
      }
      averageCareDays = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    }

    // Calculate longest care gap
    let longestCareGap = 0;
    if (fertilizerEvents.length > 1) {
      for (let i = 1; i < fertilizerEvents.length; i++) {
        const gap = Math.floor(
          (fertilizerEvents[i].careDate.getTime() - fertilizerEvents[i - 1].careDate.getTime()) 
          / (1000 * 60 * 60 * 24)
        );
        longestCareGap = Math.max(longestCareGap, gap);
      }
    }

    // Calculate care consistency score
    const consistencyScore = this.calculateCareConsistencyScore(
      careHistory,
      plantInstance.fertilizerSchedule,
      plantInstance.createdAt
    );

    // Calculate current care streak
    const careStreak = this.calculateCareStreak(fertilizerEvents, plantInstance.fertilizerSchedule);

    // Get last care date
    const lastCareDate = careHistory.length > 0 
      ? new Date(Math.max(...careHistory.map(care => care.careDate.getTime())))
      : null;

    return {
      plantInstanceId: plantInstance.id,
      totalCareEvents: careHistory.length,
      lastCareDate,
      averageCareDays: Math.round(averageCareDays),
      careConsistencyScore: Math.round(consistencyScore),
      careTypeBreakdown: careTypeBreakdown as Record<'fertilizer' | 'water' | 'repot' | 'prune' | 'inspect' | 'other', number>,
      longestCareGap,
      currentCareStreak: careStreak
    };
  }

  /**
   * Calculate care consistency score (0-100) based on adherence to schedule
   */
  static calculateCareConsistencyScore(
    careHistory: CareHistory[],
    schedule: string,
    plantCreatedAt: Date,
    currentDate: Date = new Date()
  ): number {
    const fertilizerEvents = careHistory.filter(care => care.careType === 'fertilizer');
    
    if (fertilizerEvents.length === 0) return 0;

    const intervalDays = careValidation.parseFertilizerScheduleToDays(schedule);
    const totalDays = Math.floor((currentDate.getTime() - plantCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate expected number of care events
    const expectedCareEvents = Math.floor(totalDays / intervalDays);
    if (expectedCareEvents === 0) return 100;

    // Calculate actual care events
    const actualCareEvents = fertilizerEvents.length;

    // Base score on adherence to expected frequency
    const frequencyScore = Math.min(100, (actualCareEvents / expectedCareEvents) * 100);

    // Calculate timing consistency (how close to schedule were the care events)
    let timingScore = 100;
    if (fertilizerEvents.length > 1) {
      const sortedEvents = [...fertilizerEvents].sort((a, b) => a.careDate.getTime() - b.careDate.getTime());
      let totalDeviation = 0;
      
      for (let i = 1; i < sortedEvents.length; i++) {
        const actualInterval = Math.floor(
          (sortedEvents[i].careDate.getTime() - sortedEvents[i - 1].careDate.getTime()) 
          / (1000 * 60 * 60 * 24)
        );
        const deviation = Math.abs(actualInterval - intervalDays);
        totalDeviation += deviation;
      }
      
      const averageDeviation = totalDeviation / (sortedEvents.length - 1);
      // Penalize deviations more than 7 days from schedule
      timingScore = Math.max(0, 100 - (averageDeviation / intervalDays) * 100);
    }

    // Recent care bonus (care within last interval period)
    const lastCare = fertilizerEvents[fertilizerEvents.length - 1];
    const daysSinceLastCare = Math.floor(
      (currentDate.getTime() - lastCare.careDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const recentCareBonus = daysSinceLastCare <= intervalDays ? 10 : 0;

    // Weighted average of frequency and timing scores, plus bonus
    const finalScore = (frequencyScore * 0.6) + (timingScore * 0.4) + recentCareBonus;
    
    return Math.min(100, finalScore);
  }

  /**
   * Calculate current care streak (consecutive periods with proper care)
   */
  static calculateCareStreak(
    fertilizerEvents: CareHistory[],
    schedule: string,
    currentDate: Date = new Date()
  ): number {
    if (fertilizerEvents.length === 0) return 0;

    const intervalDays = careValidation.parseFertilizerScheduleToDays(schedule);
    const sortedEvents = [...fertilizerEvents].sort((a, b) => b.careDate.getTime() - a.careDate.getTime());
    
    let streak = 0;
    let lastCareDate = currentDate;

    for (const event of sortedEvents) {
      const daysSinceLastCare = Math.floor(
        (lastCareDate.getTime() - event.careDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // If care was within acceptable range (schedule + 7 days grace period)
      if (daysSinceLastCare <= intervalDays + 7) {
        streak++;
        lastCareDate = event.careDate;
      } else {
        break; // Streak broken
      }
    }

    return streak;
  }

  /**
   * Determine if a plant needs immediate attention based on care status
   */
  static needsImmediateAttention(
    fertilizerDue: Date | null,
    currentDate: Date = new Date()
  ): boolean {
    const urgency = this.calculateCareUrgency(fertilizerDue, currentDate);
    return urgency === 'critical' || urgency === 'high';
  }

  /**
   * Get recommended care actions based on plant status
   */
  static getRecommendedCareActions(
    plantInstance: PlantInstance,
    careHistory: CareHistory[],
    currentDate: Date = new Date()
  ): string[] {
    const recommendations: string[] = [];
    
    // Check fertilizer status
    const careStatus = this.calculateCareStatus(plantInstance.fertilizerDue, currentDate);
    if (careStatus === 'overdue') {
      recommendations.push('Fertilizer is overdue - apply fertilizer as soon as possible');
    } else if (careStatus === 'due_today') {
      recommendations.push('Fertilizer is due today');
    } else if (careStatus === 'due_soon') {
      recommendations.push('Fertilizer will be due within a week');
    }

    // Check repotting (if last repot was more than 2 years ago)
    if (plantInstance.lastRepot) {
      const daysSinceRepot = this.calculateDaysSinceLastRepot(plantInstance.lastRepot, currentDate);
      if (daysSinceRepot && daysSinceRepot > 730) { // 2 years
        recommendations.push('Consider repotting - last repot was over 2 years ago');
      }
    } else {
      // No repot history, check plant age
      const plantAge = Math.floor(
        (currentDate.getTime() - plantInstance.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (plantAge > 365) { // 1 year old
        recommendations.push('Consider repotting - no repot history found');
      }
    }

    // Check for regular inspection
    const lastInspection = careHistory
      .filter(care => care.careType === 'inspect')
      .sort((a, b) => b.careDate.getTime() - a.careDate.getTime())[0];
    
    if (!lastInspection) {
      recommendations.push('Regular inspection recommended to check for pests and health');
    } else {
      const daysSinceInspection = Math.floor(
        (currentDate.getTime() - lastInspection.careDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceInspection > 30) {
        recommendations.push('Monthly inspection recommended');
      }
    }

    return recommendations;
  }

  /**
   * Calculate overdue detection with grace period
   */
  static isOverdueWithGracePeriod(
    fertilizerDue: Date | null,
    graceDays: number = 3,
    currentDate: Date = new Date()
  ): boolean {
    if (!fertilizerDue) return false;
    
    const graceDate = new Date(fertilizerDue);
    graceDate.setDate(graceDate.getDate() + graceDays);
    
    return currentDate > graceDate;
  }

  /**
   * Get next care reminder date
   */
  static getNextReminderDate(
    fertilizerDue: Date | null,
    reminderDaysBefore: number = 1
  ): Date | null {
    if (!fertilizerDue) return null;
    
    const reminderDate = new Date(fertilizerDue);
    reminderDate.setDate(reminderDate.getDate() - reminderDaysBefore);
    
    return reminderDate;
  }
}