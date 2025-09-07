import { CareCalculator } from '../care-calculator';
import type { CareSchedule, CareFrequency } from '@/lib/types/care-types';

describe('CareCalculator', () => {
  let calculator: CareCalculator;

  beforeEach(() => {
    calculator = new CareCalculator();
  });

  describe('calculateNextDueDate', () => {
    it('calculates next due date for weekly schedule', () => {
      const lastCareDate = new Date('2024-01-01');
      const schedule: CareSchedule = {
        frequency: 'weekly',
        interval: 1,
        careType: 'fertilizer',
      };

      const nextDue = calculator.calculateNextDueDate(lastCareDate, schedule);
      const expected = new Date('2024-01-08');

      expect(nextDue).toEqual(expected);
    });

    it('calculates next due date for bi-weekly schedule', () => {
      const lastCareDate = new Date('2024-01-01');
      const schedule: CareSchedule = {
        frequency: 'weekly',
        interval: 2,
        careType: 'fertilizer',
      };

      const nextDue = calculator.calculateNextDueDate(lastCareDate, schedule);
      const expected = new Date('2024-01-15');

      expect(nextDue).toEqual(expected);
    });

    it('calculates next due date for monthly schedule', () => {
      const lastCareDate = new Date('2024-01-01');
      const schedule: CareSchedule = {
        frequency: 'monthly',
        interval: 1,
        careType: 'fertilizer',
      };

      const nextDue = calculator.calculateNextDueDate(lastCareDate, schedule);
      const expected = new Date('2024-02-01');

      expect(nextDue).toEqual(expected);
    });

    it('handles end of month dates correctly', () => {
      const lastCareDate = new Date('2024-01-31');
      const schedule: CareSchedule = {
        frequency: 'monthly',
        interval: 1,
        careType: 'fertilizer',
      };

      const nextDue = calculator.calculateNextDueDate(lastCareDate, schedule);
      // Should handle February having fewer days
      expect(nextDue.getMonth()).toBe(1); // February (0-indexed)
    });

    it('calculates next due date for seasonal schedule', () => {
      const lastCareDate = new Date('2024-01-01');
      const schedule: CareSchedule = {
        frequency: 'seasonal',
        interval: 1,
        careType: 'repot',
      };

      const nextDue = calculator.calculateNextDueDate(lastCareDate, schedule);
      const expected = new Date('2024-04-01'); // 3 months later

      expect(nextDue).toEqual(expected);
    });

    it('handles custom frequency', () => {
      const lastCareDate = new Date('2024-01-01');
      const schedule: CareSchedule = {
        frequency: 'custom',
        interval: 10,
        careType: 'fertilizer',
        customDays: 10,
      };

      const nextDue = calculator.calculateNextDueDate(lastCareDate, schedule);
      const expected = new Date('2024-01-11');

      expect(nextDue).toEqual(expected);
    });
  });

  describe('parseScheduleString', () => {
    it('parses "2 weeks" correctly', () => {
      const schedule = calculator.parseScheduleString('2 weeks');

      expect(schedule).toEqual({
        frequency: 'weekly',
        interval: 2,
        careType: 'fertilizer',
      });
    });

    it('parses "1 month" correctly', () => {
      const schedule = calculator.parseScheduleString('1 month');

      expect(schedule).toEqual({
        frequency: 'monthly',
        interval: 1,
        careType: 'fertilizer',
      });
    });

    it('parses "every 10 days" correctly', () => {
      const schedule = calculator.parseScheduleString('every 10 days');

      expect(schedule).toEqual({
        frequency: 'custom',
        interval: 1,
        careType: 'fertilizer',
        customDays: 10,
      });
    });

    it('handles invalid schedule strings', () => {
      const schedule = calculator.parseScheduleString('invalid schedule');

      expect(schedule).toEqual({
        frequency: 'monthly',
        interval: 1,
        careType: 'fertilizer',
      });
    });

    it('parses seasonal schedules', () => {
      const schedule = calculator.parseScheduleString('seasonal');

      expect(schedule).toEqual({
        frequency: 'seasonal',
        interval: 1,
        careType: 'fertilizer',
      });
    });
  });

  describe('calculateCareUrgency', () => {
    it('returns "none" for future due dates', () => {
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      const urgency = calculator.calculateCareUrgency(dueDate);

      expect(urgency).toBe('none');
    });

    it('returns "low" for due today', () => {
      const dueDate = new Date();
      const urgency = calculator.calculateCareUrgency(dueDate);

      expect(urgency).toBe('low');
    });

    it('returns "medium" for 1-3 days overdue', () => {
      const dueDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const urgency = calculator.calculateCareUrgency(dueDate);

      expect(urgency).toBe('medium');
    });

    it('returns "high" for 4-7 days overdue', () => {
      const dueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      const urgency = calculator.calculateCareUrgency(dueDate);

      expect(urgency).toBe('high');
    });

    it('returns "critical" for more than 7 days overdue', () => {
      const dueDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const urgency = calculator.calculateCareUrgency(dueDate);

      expect(urgency).toBe('critical');
    });

    it('handles null due dates', () => {
      const urgency = calculator.calculateCareUrgency(null);

      expect(urgency).toBe('none');
    });
  });

  describe('getDaysUntilDue', () => {
    it('calculates positive days for future dates', () => {
      const dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
      const days = calculator.getDaysUntilDue(dueDate);

      expect(days).toBe(5);
    });

    it('calculates negative days for past dates', () => {
      const dueDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      const days = calculator.getDaysUntilDue(dueDate);

      expect(days).toBe(-3);
    });

    it('returns 0 for today', () => {
      const dueDate = new Date();
      const days = calculator.getDaysUntilDue(dueDate);

      expect(days).toBe(0);
    });

    it('handles null dates', () => {
      const days = calculator.getDaysUntilDue(null);

      expect(days).toBeNull();
    });
  });

  describe('getCareStatus', () => {
    it('returns "excellent" for consistent care', () => {
      const careHistory = [
        { careDate: new Date('2024-01-01'), careType: 'fertilizer' },
        { careDate: new Date('2024-01-15'), careType: 'fertilizer' },
        { careDate: new Date('2024-02-01'), careType: 'fertilizer' },
      ];

      const status = calculator.getCareStatus(careHistory, {
        frequency: 'weekly',
        interval: 2,
        careType: 'fertilizer',
      });

      expect(status).toBe('excellent');
    });

    it('returns "good" for mostly consistent care', () => {
      const careHistory = [
        { careDate: new Date('2024-01-01'), careType: 'fertilizer' },
        { careDate: new Date('2024-01-20'), careType: 'fertilizer' }, // Slightly late
        { careDate: new Date('2024-02-05'), careType: 'fertilizer' },
      ];

      const status = calculator.getCareStatus(careHistory, {
        frequency: 'weekly',
        interval: 2,
        careType: 'fertilizer',
      });

      expect(status).toBe('good');
    });

    it('returns "needs_attention" for inconsistent care', () => {
      const careHistory = [
        { careDate: new Date('2024-01-01'), careType: 'fertilizer' },
        { careDate: new Date('2024-02-15'), careType: 'fertilizer' }, // Very late
      ];

      const status = calculator.getCareStatus(careHistory, {
        frequency: 'weekly',
        interval: 2,
        careType: 'fertilizer',
      });

      expect(status).toBe('needs_attention');
    });

    it('returns "poor" for very inconsistent care', () => {
      const careHistory = [
        { careDate: new Date('2023-12-01'), careType: 'fertilizer' }, // Very old
      ];

      const status = calculator.getCareStatus(careHistory, {
        frequency: 'weekly',
        interval: 1,
        careType: 'fertilizer',
      });

      expect(status).toBe('poor');
    });

    it('handles empty care history', () => {
      const status = calculator.getCareStatus([], {
        frequency: 'weekly',
        interval: 1,
        careType: 'fertilizer',
      });

      expect(status).toBe('needs_attention');
    });
  });

  describe('calculateCareStreak', () => {
    it('calculates streak for consistent care', () => {
      const careHistory = [
        { careDate: new Date('2024-01-01'), careType: 'fertilizer' },
        { careDate: new Date('2024-01-08'), careType: 'fertilizer' },
        { careDate: new Date('2024-01-15'), careType: 'fertilizer' },
        { careDate: new Date('2024-01-22'), careType: 'fertilizer' },
      ];

      const streak = calculator.calculateCareStreak(careHistory, {
        frequency: 'weekly',
        interval: 1,
        careType: 'fertilizer',
      });

      expect(streak).toBe(4);
    });

    it('breaks streak for missed care', () => {
      const careHistory = [
        { careDate: new Date('2024-01-01'), careType: 'fertilizer' },
        { careDate: new Date('2024-01-08'), careType: 'fertilizer' },
        // Missing 2024-01-15
        { careDate: new Date('2024-01-22'), careType: 'fertilizer' },
      ];

      const streak = calculator.calculateCareStreak(careHistory, {
        frequency: 'weekly',
        interval: 1,
        careType: 'fertilizer',
      });

      expect(streak).toBe(1); // Only the most recent care
    });

    it('handles empty care history', () => {
      const streak = calculator.calculateCareStreak([], {
        frequency: 'weekly',
        interval: 1,
        careType: 'fertilizer',
      });

      expect(streak).toBe(0);
    });
  });

  describe('getOptimalCareSchedule', () => {
    it('suggests optimal schedule based on plant type', () => {
      const schedule = calculator.getOptimalCareSchedule('succulent', 'fertilizer');

      expect(schedule.frequency).toBe('monthly');
      expect(schedule.interval).toBeGreaterThan(1);
    });

    it('suggests different schedule for tropical plants', () => {
      const schedule = calculator.getOptimalCareSchedule('tropical', 'fertilizer');

      expect(schedule.frequency).toBe('weekly');
      expect(schedule.interval).toBeLessThanOrEqual(2);
    });

    it('handles unknown plant types', () => {
      const schedule = calculator.getOptimalCareSchedule('unknown', 'fertilizer');

      expect(schedule).toBeDefined();
      expect(schedule.frequency).toBeTruthy();
    });

    it('suggests different schedules for different care types', () => {
      const fertilizerSchedule = calculator.getOptimalCareSchedule('tropical', 'fertilizer');
      const repotSchedule = calculator.getOptimalCareSchedule('tropical', 'repot');

      expect(fertilizerSchedule.frequency).not.toBe(repotSchedule.frequency);
    });
  });
});