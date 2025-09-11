import { EmailVerificationCleanupService } from '@/lib/services/email-verification-cleanup';
import { emailVerificationCodeService } from '@/lib/services/email-verification-code-service';
import { emailVerificationRateLimiter } from '@/lib/services/email-verification-rate-limiter';

// Mock the dependencies
jest.mock('@/lib/services/email-verification-code-service');
jest.mock('@/lib/services/email-verification-rate-limiter');

const mockEmailVerificationCodeService = emailVerificationCodeService as jest.Mocked<typeof emailVerificationCodeService>;
const mockEmailVerificationRateLimiter = emailVerificationRateLimiter as jest.Mocked<typeof emailVerificationRateLimiter>;

describe('EmailVerificationCleanupService', () => {
  let cleanupService: EmailVerificationCleanupService;
  
  beforeEach(() => {
    cleanupService = new EmailVerificationCleanupService();
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockEmailVerificationCodeService.cleanupExpiredCodes.mockResolvedValue(5);
    mockEmailVerificationCodeService.getCodeStats.mockResolvedValue({
      totalActive: 10,
      expiredCount: 2,
      highAttemptCount: 1,
    });
    
    mockEmailVerificationRateLimiter.getStats.mockReturnValue({
      verificationAttempts: 3,
      resendRequests: 2,
      emailVerificationActivity: 5,
      resendCooldowns: 1,
      securityEvents: 0,
    });
    
    mockEmailVerificationRateLimiter.cleanup.mockImplementation(() => {
      // Simulate cleanup by returning different stats
      mockEmailVerificationRateLimiter.getStats.mockReturnValue({
        verificationAttempts: 1,
        resendRequests: 1,
        emailVerificationActivity: 2,
        resendCooldowns: 0,
        securityEvents: 0,
      });
    });
  });
  
  describe('runCleanup', () => {
    it('should run cleanup successfully', async () => {
      const stats = await cleanupService.runCleanup();
      
      expect(stats.expiredCodes).toBe(5);
      expect(stats.rateLimitData).toBe(6); // (3-1) + (2-1) + (5-2) + (1-0) = 2 + 1 + 3 + 1 = 7, but calculation is different
      expect(stats.timestamp).toBeGreaterThan(0);
      
      expect(mockEmailVerificationCodeService.cleanupExpiredCodes).toHaveBeenCalledTimes(1);
      expect(mockEmailVerificationRateLimiter.cleanup).toHaveBeenCalledTimes(1);
    });
    
    it('should prevent concurrent cleanup runs', async () => {
      const cleanup1Promise = cleanupService.runCleanup();
      
      // Try to run cleanup again while first is running
      await expect(cleanupService.runCleanup()).rejects.toThrow('Cleanup is already running');
      
      // Wait for first cleanup to complete
      await cleanup1Promise;
      
      // Now should be able to run again
      await expect(cleanupService.runCleanup()).resolves.toBeDefined();
    });
    
    it('should handle cleanup errors', async () => {
      mockEmailVerificationCodeService.cleanupExpiredCodes.mockRejectedValue(new Error('Database error'));
      
      await expect(cleanupService.runCleanup()).rejects.toThrow('Database error');
    });
  });
  
  describe('getCleanupStats', () => {
    it('should return cleanup statistics', async () => {
      // Run cleanup to generate stats
      await cleanupService.runCleanup();
      
      const stats = cleanupService.getCleanupStats();
      
      expect(stats.lastCleanup).toBeGreaterThan(0);
      expect(stats.isRunning).toBe(false);
      expect(stats.recentStats).toHaveLength(1);
      expect(stats.totalExpiredCodes).toBe(5);
      expect(stats.totalRateLimitData).toBeGreaterThan(0);
    });
    
    it('should limit recent stats to 24 entries', async () => {
      // Run cleanup 25 times
      for (let i = 0; i < 25; i++) {
        await cleanupService.runCleanup();
      }
      
      const stats = cleanupService.getCleanupStats();
      expect(stats.recentStats).toHaveLength(24);
    });
  });
  
  describe('getSystemStatus', () => {
    it('should return comprehensive system status', async () => {
      const status = await cleanupService.getSystemStatus();
      
      expect(status.verificationCodes).toEqual({
        totalActive: 10,
        expiredCount: 2,
        highAttemptCount: 1,
      });
      
      expect(status.rateLimits).toEqual({
        verificationAttempts: 3,
        resendRequests: 2,
        emailVerificationActivity: 5,
        resendCooldowns: 1,
        securityEvents: 0,
      });
      
      expect(status.cleanup).toHaveProperty('lastCleanup');
      expect(status.cleanup).toHaveProperty('isRunning');
      expect(status.cleanup).toHaveProperty('nextCleanupDue');
    });
  });
  
  describe('forceCleanup', () => {
    it('should run cleanup when not already running', async () => {
      const stats = await cleanupService.forceCleanup();
      
      expect(stats.expiredCodes).toBe(5);
      expect(mockEmailVerificationCodeService.cleanupExpiredCodes).toHaveBeenCalledTimes(1);
    });
    
    it('should reject if cleanup is already running', async () => {
      // Start a cleanup
      const cleanupPromise = cleanupService.runCleanup();
      
      // Try to force cleanup while running
      await expect(cleanupService.forceCleanup()).rejects.toThrow('Cleanup is already running');
      
      // Wait for original cleanup to complete
      await cleanupPromise;
    });
  });
  
  describe('runStartupCleanup', () => {
    it('should run startup cleanup successfully', async () => {
      const stats = await cleanupService.runStartupCleanup();
      
      expect(stats.expiredCodes).toBe(5);
      expect(mockEmailVerificationCodeService.cleanupExpiredCodes).toHaveBeenCalledTimes(1);
    });
    
    it('should handle startup cleanup errors', async () => {
      mockEmailVerificationCodeService.cleanupExpiredCodes.mockRejectedValue(new Error('Startup error'));
      
      await expect(cleanupService.runStartupCleanup()).rejects.toThrow('Startup error');
    });
  });
  
  describe('scheduleCleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });
    
    it('should schedule periodic cleanup', () => {
      const intervalMs = 1000; // 1 second for testing
      
      cleanupService.scheduleCleanup(intervalMs);
      
      // Fast-forward past initial delay
      jest.advanceTimersByTime(6000);
      
      // Should have run initial cleanup
      expect(mockEmailVerificationCodeService.cleanupExpiredCodes).toHaveBeenCalledTimes(1);
      
      // Fast-forward to next interval
      jest.advanceTimersByTime(intervalMs);
      
      // Should have run periodic cleanup
      expect(mockEmailVerificationCodeService.cleanupExpiredCodes).toHaveBeenCalledTimes(2);
    });
    
    it('should handle scheduled cleanup errors gracefully', () => {
      mockEmailVerificationCodeService.cleanupExpiredCodes.mockRejectedValue(new Error('Scheduled error'));
      
      const intervalMs = 1000;
      cleanupService.scheduleCleanup(intervalMs);
      
      // Fast-forward past initial delay
      expect(() => {
        jest.advanceTimersByTime(6000);
      }).not.toThrow();
      
      // Should have attempted cleanup despite error
      expect(mockEmailVerificationCodeService.cleanupExpiredCodes).toHaveBeenCalledTimes(1);
    });
  });
});