import { describe, it, expect, beforeEach } from '@jest/globals';
import { CareCalculator } from '../care-calculator';
import type { CareHistory, PlantInstance } from '@/lib/db/schema';

describe('CareCalculator', () => {
  let mockPlantInstance: PlantInstance;
  let mockCareHistory: CareHistory[];

  beforeEach(() => {
    mockPlantInstance = {
      id: 1,
      userId: 1,
      plantId: 1,
      nickname: 'Test Plant',
      location: 'Living Room',
      lastFertilized: new Date('2024-01-01'),
      fertilizerSchedule: 'monthly',
      fertilizerDue: new Date('2024-02-01'),
      lastRepot: new Date('2023-06-01'),
      notes: null,
      images: [],
      isActive: true,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    mockCareHistory = [
      {
        id: 1,
        userId: 1,
        plantInstanceId: 1,
        careType: 'fertilizer',
        careDate: new Date('2024-01-01'),
        notes: null,
        fertilizerType: 'Liquid fertilizer',
        potSize: null,
        soilType: null,
        images: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 2,
        userId: 1,
        plantInstanceId: 1,
        careType: 'water',
        careDate: new Date('2024-01-05'),
        notes: null,
        fertilizerType: null,
        potSize: null,
        soilType: null,
        images: [],
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-05'),
      },
    ];
  });

  describe('calculateNextFertilizerDue', () => {
    it('should calculate next due date for monthly schedule', () => {
      const lastFertilized = new Date('2024-01-01');
      const schedule = 'monthly';
      
      const nextDue = CareCalculator.calculateNextFertilizerDue(lastFertilized, schedule);
      
      expect(nextDue).toEqual(new Date('2024-01-31'));
    });

    it('should calculate next due date for weekly schedule', () => {
      const lastFertilized = new Date('2024-01-01');
      const schedule = 'weekly';
      
      const nextDue = CareCalculator.calculateNextFertilizerDue(lastFertilized, schedule);
      
      expect(nextDue).toEqual(new Date('2024-01-08'));
    });

    it('should calculate next due date for custom schedule', () => {
      const lastFertilized = new Date('2024-01-01');
      const schedule = '14'; // 14 days
      
      const nextDue = CareCalculator.calculateNextFertilizerDue(lastFertilized, schedule);
      
      expect(nextDue).toEqual(new Date('2024-01-15'));
    });

    it('should return null if no last fertilized date', () => {
      const nextDue = CareCalculator.calculateNextFertilizerDue(null, 'monthly');
      
      expect(nextDue).toBeNull();
    });
  });

  describe('calculateCareStatus', () => {
    it('should return overdue for past due date', () => {
      const fertilizerDue = new Date('2024-01-01');
      const currentDate = new Date('2024-01-05');
      
      const status = CareCalculator.calculateCareStatus(fertilizerDue, currentDate);
      
      expect(status).toBe('overdue');
    });

    it('should return due_today for today', () => {
      const fertilizerDue = new Date('2024-01-01');
      const currentDate = new Date('2024-01-01');
      
      const status = CareCalculator.calculateCareStatus(fertilizerDue, currentDate);
      
      expect(status).toBe('due_today');
    });

    it('should return due_soon for within a week', () => {
      const fertilizerDue = new Date('2024-01-05');
      const currentDate = new Date('2024-01-01');
      
      const status = CareCalculator.calculateCareStatus(fertilizerDue, currentDate);
      
      expect(status).toBe('due_soon');
    });

    it('should return healthy for future dates beyond a week', () => {
      const fertilizerDue = new Date('2024-01-15');
      const currentDate = new Date('2024-01-01');
      
      const status = CareCalculator.calculateCareStatus(fertilizerDue, currentDate);
      
      expect(status).toBe('healthy');
    });

    it('should return unknown for null due date', () => {
      const status = CareCalculator.calculateCareStatus(null);
      
      expect(status).toBe('unknown');
    });
  });

  describe('calculateCareUrgency', () => {
    it('should return critical for severely overdue', () => {
      const fertilizerDue = new Date('2024-01-01');
      const currentDate = new Date('2024-01-10'); // 9 days overdue
      
      const urgency = CareCalculator.calculateCareUrgency(fertilizerDue, currentDate);
      
      expect(urgency).toBe('critical');
    });

    it('should return high for overdue within a week', () => {
      const fertilizerDue = new Date('2024-01-01');
      const currentDate = new Date('2024-01-05'); // 4 days overdue
      
      const urgency = CareCalculator.calculateCareUrgency(fertilizerDue, currentDate);
      
      expect(urgency).toBe('high');
    });

    it('should return medium for due today or tomorrow', () => {
      const fertilizerDue = new Date('2024-01-02');
      const currentDate = new Date('2024-01-01'); // due tomorrow
      
      const urgency = CareCalculator.calculateCareUrgency(fertilizerDue, currentDate);
      
      expect(urgency).toBe('medium');
    });

    it('should return low for due within a week', () => {
      const fertilizerDue = new Date('2024-01-05');
      const currentDate = new Date('2024-01-01'); // due in 4 days
      
      const urgency = CareCalculator.calculateCareUrgency(fertilizerDue, currentDate);
      
      expect(urgency).toBe('low');
    });

    it('should return none for future dates beyond a week', () => {
      const fertilizerDue = new Date('2024-01-15');
      const currentDate = new Date('2024-01-01');
      
      const urgency = CareCalculator.calculateCareUrgency(fertilizerDue, currentDate);
      
      expect(urgency).toBe('none');
    });
  });

  describe('calculateDaysUntilFertilizerDue', () => {
    it('should return positive days for future due date', () => {
      const fertilizerDue = new Date('2024-01-05');
      const currentDate = new Date('2024-01-01');
      
      const days = CareCalculator.calculateDaysUntilFertilizerDue(fertilizerDue, currentDate);
      
      expect(days).toBe(4);
    });

    it('should return negative days for overdue', () => {
      const fertilizerDue = new Date('2024-01-01');
      const currentDate = new Date('2024-01-05');
      
      const days = CareCalculator.calculateDaysUntilFertilizerDue(fertilizerDue, currentDate);
      
      expect(days).toBe(-4);
    });

    it('should return 0 for due today', () => {
      const fertilizerDue = new Date('2024-01-01');
      const currentDate = new Date('2024-01-01');
      
      const days = CareCalculator.calculateDaysUntilFertilizerDue(fertilizerDue, currentDate);
      
      expect(days).toBe(0);
    });

    it('should return null for no due date', () => {
      const days = CareCalculator.calculateDaysUntilFertilizerDue(null);
      
      expect(days).toBeNull();
    });
  });

  describe('calculatePlantCareStatistics', () => {
    it('should calculate comprehensive care statistics', () => {
      const stats = CareCalculator.calculatePlantCareStatistics(mockPlantInstance, mockCareHistory);
      
      expect(stats.plantInstanceId).toBe(1);
      expect(stats.totalCareEvents).toBe(2);
      expect(stats.careTypeBreakdown.fertilizer).toBe(1);
      expect(stats.careTypeBreakdown.water).toBe(1);
      expect(stats.lastCareDate).toEqual(new Date('2024-01-05'));
    });

    it('should handle empty care history', () => {
      const stats = CareCalculator.calculatePlantCareStatistics(mockPlantInstance, []);
      
      expect(stats.totalCareEvents).toBe(0);
      expect(stats.careConsistencyScore).toBe(0);
      expect(stats.lastCareDate).toBeNull();
    });
  });

  describe('calculateCareConsistencyScore', () => {
    it('should return 0 for no fertilizer events', () => {
      const score = CareCalculator.calculateCareConsistencyScore(
        [],
        'monthly',
        new Date('2023-01-01')
      );
      
      expect(score).toBe(0);
    });

    it('should return 100 for new plants with no expected care yet', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5); // 5 days ago
      
      const score = CareCalculator.calculateCareConsistencyScore(
        mockCareHistory.filter(c => c.careType === 'fertilizer'),
        'monthly',
        recentDate
      );
      
      expect(score).toBe(100);
    });
  });

  describe('needsImmediateAttention', () => {
    it('should return true for critical urgency', () => {
      const fertilizerDue = new Date('2024-01-01');
      const currentDate = new Date('2024-01-10'); // 9 days overdue
      
      const needsAttention = CareCalculator.needsImmediateAttention(fertilizerDue, currentDate);
      
      expect(needsAttention).toBe(true);
    });

    it('should return true for high urgency', () => {
      const fertilizerDue = new Date('2024-01-01');
      const currentDate = new Date('2024-01-05'); // 4 days overdue
      
      const needsAttention = CareCalculator.needsImmediateAttention(fertilizerDue, currentDate);
      
      expect(needsAttention).toBe(true);
    });

    it('should return false for medium urgency', () => {
      const fertilizerDue = new Date('2024-01-02');
      const currentDate = new Date('2024-01-01'); // due tomorrow
      
      const needsAttention = CareCalculator.needsImmediateAttention(fertilizerDue, currentDate);
      
      expect(needsAttention).toBe(false);
    });
  });

  describe('getRecommendedCareActions', () => {
    it('should recommend fertilizer for overdue plants', () => {
      const overdueInstance = {
        ...mockPlantInstance,
        fertilizerDue: new Date('2024-01-01')
      };
      const currentDate = new Date('2024-01-05');
      
      const recommendations = CareCalculator.getRecommendedCareActions(
        overdueInstance,
        mockCareHistory,
        currentDate
      );
      
      expect(recommendations).toContain('Fertilizer is overdue - apply fertilizer as soon as possible');
    });

    it('should recommend repotting for old plants', () => {
      const oldInstance = {
        ...mockPlantInstance,
        lastRepot: new Date('2021-01-01') // 3+ years ago
      };
      const currentDate = new Date('2024-01-01');
      
      const recommendations = CareCalculator.getRecommendedCareActions(
        oldInstance,
        mockCareHistory,
        currentDate
      );
      
      expect(recommendations.some(r => r.includes('repotting'))).toBe(true);
    });

    it('should recommend inspection for plants without recent inspection', () => {
      const recommendations = CareCalculator.getRecommendedCareActions(
        mockPlantInstance,
        mockCareHistory.filter(c => c.careType !== 'inspect'), // No inspection history
        new Date('2024-01-01')
      );
      
      expect(recommendations.some(r => r.includes('inspection'))).toBe(true);
    });
  });

  describe('isOverdueWithGracePeriod', () => {
    it('should return false within grace period', () => {
      const fertilizerDue = new Date('2024-01-01');
      const currentDate = new Date('2024-01-03'); // 2 days after due
      
      const isOverdue = CareCalculator.isOverdueWithGracePeriod(fertilizerDue, 3, currentDate);
      
      expect(isOverdue).toBe(false);
    });

    it('should return true after grace period', () => {
      const fertilizerDue = new Date('2024-01-01');
      const currentDate = new Date('2024-01-05'); // 4 days after due, grace is 3
      
      const isOverdue = CareCalculator.isOverdueWithGracePeriod(fertilizerDue, 3, currentDate);
      
      expect(isOverdue).toBe(true);
    });
  });

  describe('getNextReminderDate', () => {
    it('should calculate reminder date before due date', () => {
      const fertilizerDue = new Date('2024-01-05');
      
      const reminderDate = CareCalculator.getNextReminderDate(fertilizerDue, 2);
      
      expect(reminderDate).toEqual(new Date('2024-01-03'));
    });

    it('should return null for no due date', () => {
      const reminderDate = CareCalculator.getNextReminderDate(null, 1);
      
      expect(reminderDate).toBeNull();
    });
  });
});