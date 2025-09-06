import type { 
  CareStatus, 
  CareUrgency, 
  CareScheduleCalculation,
  PlantCareStatistics 
} from '@/lib/types/care-types';
import type { CareHistory, PlantInstance } from '@/lib/db/schema';
import { careValidation } from '@/lib/validation/care-schemas';

/**
 * Care calculation utilities for fertilizer schedules and due date management
 */
export class CareCalculator {
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