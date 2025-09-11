/**
 * @jest-environment node
 */

import { EmailServiceMonitor } from '@/lib/services/email-service-monitor';

describe('EmailServiceMonitor', () => {
  let monitor: EmailServiceMonitor;

  beforeEach(() => {
    monitor = new EmailServiceMonitor();
    jest.clearAllMocks();
  });

  describe('recordSuccess', () => {
    it('should record successful email sends', () => {
      monitor.recordSuccess(150);
      monitor.recordSuccess(200);

      const stats = monitor.getStats();
      expect(stats.totalSent).toBe(2);
      expect(stats.totalFailed).toBe(0);
      expect(stats.quotaUsed).toBe(2);
      expect(stats.successRate).toBe(100);
      expect(stats.averageResponseTime).toBe(175); // (150 + 200) / 2
    });

    it('should update quota usage', () => {
      monitor.recordSuccess(100);
      monitor.recordSuccess(100);
      monitor.recordSuccess(100);

      const stats = monitor.getStats();
      expect(stats.quotaUsed).toBe(3);
    });
  });

  describe('recordFailure', () => {
    it('should record failed email sends', () => {
      const error = { message: 'API Error', code: 'API_ERROR' };
      monitor.recordFailure(error, 300);

      const stats = monitor.getStats();
      expect(stats.totalSent).toBe(0);
      expect(stats.totalFailed).toBe(1);
      expect(stats.successRate).toBe(0);
      expect(stats.errorsByType['API_ERROR']).toBe(1);
      expect(stats.lastError).toEqual({
        message: 'API Error',
        code: 'API_ERROR',
        timestamp: expect.any(Number),
      });
    });

    it('should track different error types', () => {
      monitor.recordFailure({ message: 'Network Error', code: 'NETWORK_ERROR' }, 100);
      monitor.recordFailure({ message: 'API Error', code: 'API_ERROR' }, 100);
      monitor.recordFailure({ message: 'Another API Error', code: 'API_ERROR' }, 100);

      const stats = monitor.getStats();
      expect(stats.errorsByType['NETWORK_ERROR']).toBe(1);
      expect(stats.errorsByType['API_ERROR']).toBe(2);
    });

    it('should handle quota exceeded errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      monitor.recordFailure({ message: 'Quota exceeded', code: 'QUOTA_EXCEEDED' }, 100);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL: Email quota exceeded!')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('getStats', () => {
    it('should return current statistics', () => {
      monitor.recordSuccess(100);
      monitor.recordFailure({ message: 'Error', code: 'API_ERROR' }, 200);

      const stats = monitor.getStats();
      expect(stats).toMatchObject({
        totalSent: 1,
        totalFailed: 1,
        quotaUsed: 1,
        quotaLimit: expect.any(Number),
        successRate: 50,
        averageResponseTime: 150, // (100 + 200) / 2
        errorsByType: { API_ERROR: 1 },
        lastResetTime: expect.any(Number),
      });
    });
  });

  describe('getRecentEvents', () => {
    it('should return recent events', () => {
      monitor.recordSuccess(100);
      monitor.recordFailure({ message: 'Error', code: 'API_ERROR' }, 200);

      const events = monitor.getRecentEvents(10);
      expect(events).toHaveLength(2);
      expect(events[0]).toMatchObject({
        type: 'success',
        responseTime: 100,
        timestamp: expect.any(Number),
      });
      expect(events[1]).toMatchObject({
        type: 'error',
        responseTime: 200,
        timestamp: expect.any(Number),
        error: { message: 'Error', code: 'API_ERROR' },
      });
    });

    it('should limit returned events', () => {
      // Record more events than the limit
      for (let i = 0; i < 10; i++) {
        monitor.recordSuccess(100);
      }

      const events = monitor.getRecentEvents(5);
      expect(events).toHaveLength(5);
    });
  });

  describe('getErrorSummary', () => {
    it('should return error summary', () => {
      monitor.recordSuccess(100);
      monitor.recordFailure({ message: 'Error 1', code: 'API_ERROR' }, 200);
      monitor.recordFailure({ message: 'Error 2', code: 'NETWORK_ERROR' }, 300);
      monitor.recordFailure({ message: 'Quota Error', code: 'QUOTA_EXCEEDED' }, 400);

      const summary = monitor.getErrorSummary();
      expect(summary.totalErrors).toBe(3);
      expect(summary.errorsByType).toEqual({
        API_ERROR: 1,
        NETWORK_ERROR: 1,
        QUOTA_EXCEEDED: 1,
      });
      expect(summary.recentErrors).toHaveLength(3);
      expect(summary.criticalErrors).toHaveLength(1);
      expect(summary.criticalErrors[0].error?.code).toBe('QUOTA_EXCEEDED');
    });
  });

  describe('quota monitoring', () => {
    it('should detect when quota is near limit', () => {
      // Simulate quota limit of 100
      const originalGetQuotaLimit = (monitor as any).getQuotaLimit;
      (monitor as any).getQuotaLimit = () => 100;
      
      // Record 85 successful sends (85% of quota)
      for (let i = 0; i < 85; i++) {
        monitor.recordSuccess(100);
      }

      expect(monitor.isQuotaNearLimit(0.8)).toBe(true);
      expect(monitor.isQuotaNearLimit(0.9)).toBe(false);
      expect(monitor.getQuotaUsagePercentage()).toBe(85);

      // Restore original method
      (monitor as any).getQuotaLimit = originalGetQuotaLimit;
    });

    it('should handle zero quota limit', () => {
      // Create a new monitor with zero quota limit
      const originalGetQuotaLimit = EmailServiceMonitor.prototype.getQuotaLimit;
      EmailServiceMonitor.prototype.getQuotaLimit = () => 0;
      
      const zeroQuotaMonitor = new EmailServiceMonitor();
      zeroQuotaMonitor.recordSuccess(100);
      
      expect(zeroQuotaMonitor.isQuotaNearLimit()).toBe(false);
      expect(zeroQuotaMonitor.getQuotaUsagePercentage()).toBe(0);

      // Restore original method
      EmailServiceMonitor.prototype.getQuotaLimit = originalGetQuotaLimit;
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status for good metrics', () => {
      // Create monitor with high quota limit to avoid quota warnings
      const originalGetQuotaLimit = EmailServiceMonitor.prototype.getQuotaLimit;
      EmailServiceMonitor.prototype.getQuotaLimit = () => 1000; // High limit
      
      const freshMonitor = new EmailServiceMonitor();
      
      // Record mostly successful sends (95% success rate, but low quota usage)
      for (let i = 0; i < 19; i++) {
        freshMonitor.recordSuccess(100);
      }
      for (let i = 0; i < 1; i++) {
        freshMonitor.recordFailure({ message: 'Error', code: 'API_ERROR' }, 100);
      }

      const health = freshMonitor.getHealthStatus();
      expect(health.status).toBe('healthy');
      expect(health.issues).toHaveLength(0);
      expect(health.recommendations).toHaveLength(0);
      
      // Restore original method
      EmailServiceMonitor.prototype.getQuotaLimit = originalGetQuotaLimit;
    });

    it('should return warning status for moderate issues', () => {
      // Start with fresh monitor
      const freshMonitor = new EmailServiceMonitor();
      
      // Record lower success rate (90%)
      for (let i = 0; i < 90; i++) {
        freshMonitor.recordSuccess(100);
      }
      for (let i = 0; i < 10; i++) {
        freshMonitor.recordFailure({ message: 'Error', code: 'API_ERROR' }, 100);
      }

      const health = freshMonitor.getHealthStatus();
      expect(health.status).toBe('warning');
      expect(health.issues.length).toBeGreaterThan(0);
      expect(health.recommendations.length).toBeGreaterThan(0);
    });

    it('should return critical status for severe issues', () => {
      // Start with fresh monitor
      const freshMonitor = new EmailServiceMonitor();
      
      // Record very low success rate (70%)
      for (let i = 0; i < 70; i++) {
        freshMonitor.recordSuccess(100);
      }
      for (let i = 0; i < 30; i++) {
        freshMonitor.recordFailure({ message: 'Error', code: 'API_ERROR' }, 100);
      }

      const health = freshMonitor.getHealthStatus();
      expect(health.status).toBe('critical');
      expect(health.issues.length).toBeGreaterThan(0);
      expect(health.recommendations.length).toBeGreaterThan(0);
    });

    it('should detect high response times', () => {
      // Start with fresh monitor
      const freshMonitor = new EmailServiceMonitor();
      
      // Record high response times
      for (let i = 0; i < 10; i++) {
        freshMonitor.recordSuccess(6000); // 6 seconds
      }

      const health = freshMonitor.getHealthStatus();
      expect(health.status).toBe('warning');
      expect(health.issues.some(issue => issue.includes('response time'))).toBe(true);
    });

    it('should detect recent quota exceeded errors', () => {
      // Start with fresh monitor
      const freshMonitor = new EmailServiceMonitor();
      
      freshMonitor.recordFailure({ message: 'Quota exceeded', code: 'QUOTA_EXCEEDED' }, 100);

      const health = freshMonitor.getHealthStatus();
      expect(health.status).toBe('critical');
      expect(health.issues.some(issue => issue.includes('Quota exceeded'))).toBe(true);
    });
  });

  describe('resetDailyStats', () => {
    it('should reset statistics', () => {
      monitor.recordSuccess(100);
      monitor.recordFailure({ message: 'Error', code: 'API_ERROR' }, 200);

      monitor.resetDailyStats();

      const stats = monitor.getStats();
      expect(stats.totalSent).toBe(0);
      expect(stats.totalFailed).toBe(0);
      expect(stats.quotaUsed).toBe(0);
      expect(stats.errorsByType).toEqual({});
    });

    it('should keep recent events but limit them', () => {
      // Record many events
      for (let i = 0; i < 200; i++) {
        monitor.recordSuccess(100);
      }

      monitor.resetDailyStats();

      const events = monitor.getRecentEvents(200);
      expect(events.length).toBeLessThanOrEqual(100);
    });
  });

  describe('forceReset', () => {
    it('should force reset all statistics', () => {
      monitor.recordSuccess(100);
      monitor.recordFailure({ message: 'Error', code: 'API_ERROR' }, 200);

      monitor.forceReset();

      const stats = monitor.getStats();
      expect(stats.totalSent).toBe(0);
      expect(stats.totalFailed).toBe(0);
      expect(stats.quotaUsed).toBe(0);
      expect(stats.errorsByType).toEqual({});
    });
  });

  describe('success rate calculation', () => {
    it('should calculate success rate correctly', () => {
      // 80% success rate
      for (let i = 0; i < 80; i++) {
        monitor.recordSuccess(100);
      }
      for (let i = 0; i < 20; i++) {
        monitor.recordFailure({ message: 'Error', code: 'API_ERROR' }, 100);
      }

      const stats = monitor.getStats();
      expect(stats.successRate).toBe(80);
    });

    it('should handle 100% success rate', () => {
      for (let i = 0; i < 10; i++) {
        monitor.recordSuccess(100);
      }

      const stats = monitor.getStats();
      expect(stats.successRate).toBe(100);
    });

    it('should handle 0% success rate', () => {
      for (let i = 0; i < 10; i++) {
        monitor.recordFailure({ message: 'Error', code: 'API_ERROR' }, 100);
      }

      const stats = monitor.getStats();
      expect(stats.successRate).toBe(0);
    });

    it('should default to 100% with no events', () => {
      const stats = monitor.getStats();
      expect(stats.successRate).toBe(100);
    });
  });
});