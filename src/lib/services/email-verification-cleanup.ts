import 'server-only';
import { emailVerificationCodeService } from './email-verification-code-service';
import { emailVerificationRateLimiter } from './email-verification-rate-limiter';

export interface CleanupStats {
  expiredCodes: number;
  rateLimitData: number;
  timestamp: number;
}

export class EmailVerificationCleanupService {
  private isRunning = false;
  private lastCleanup = 0;
  private cleanupStats: CleanupStats[] = [];
  
  /**
   * Run cleanup of expired verification codes and rate limit data
   */
  async runCleanup(): Promise<CleanupStats> {
    if (this.isRunning) {
      throw new Error('Cleanup is already running');
    }
    
    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('[CLEANUP] Starting email verification cleanup...');
      
      // Clean up expired verification codes
      const expiredCodes = await emailVerificationCodeService.cleanupExpiredCodes();
      console.log(`[CLEANUP] Removed ${expiredCodes} expired verification codes`);
      
      // Clean up rate limit data
      const rateLimitStatsBefore = emailVerificationRateLimiter.getStats();
      emailVerificationRateLimiter.cleanup();
      const rateLimitStatsAfter = emailVerificationRateLimiter.getStats();
      
      const rateLimitDataCleaned = 
        (rateLimitStatsBefore.verificationAttempts - rateLimitStatsAfter.verificationAttempts) +
        (rateLimitStatsBefore.resendRequests - rateLimitStatsAfter.resendRequests) +
        (rateLimitStatsBefore.emailVerificationActivity - rateLimitStatsAfter.emailVerificationActivity) +
        (rateLimitStatsBefore.resendCooldowns - rateLimitStatsAfter.resendCooldowns);
      
      console.log(`[CLEANUP] Cleaned up ${rateLimitDataCleaned} rate limit entries`);
      
      const stats: CleanupStats = {
        expiredCodes,
        rateLimitData: rateLimitDataCleaned,
        timestamp: startTime,
      };
      
      // Store cleanup stats (keep last 24 entries)
      this.cleanupStats.push(stats);
      if (this.cleanupStats.length > 24) {
        this.cleanupStats.shift();
      }
      
      this.lastCleanup = startTime;
      
      const duration = Date.now() - startTime;
      console.log(`[CLEANUP] Email verification cleanup completed in ${duration}ms`);
      
      return stats;
      
    } catch (error) {
      console.error('[CLEANUP] Email verification cleanup failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Schedule automatic cleanup to run periodically
   */
  scheduleCleanup(intervalMs: number = 60 * 60 * 1000): void { // Default: 1 hour
    console.log(`[CLEANUP] Scheduling email verification cleanup every ${intervalMs / 1000} seconds`);
    
    const runScheduledCleanup = async () => {
      try {
        await this.runCleanup();
      } catch (error) {
        console.error('[CLEANUP] Scheduled cleanup failed:', error);
      }
    };
    
    // Run initial cleanup after a short delay
    setTimeout(runScheduledCleanup, 5000); // 5 seconds
    
    // Then run periodically
    setInterval(runScheduledCleanup, intervalMs);
  }
  
  /**
   * Run startup cleanup to clean any leftover data
   */
  async runStartupCleanup(): Promise<CleanupStats> {
    console.log('[CLEANUP] Running startup cleanup...');
    
    try {
      const stats = await this.runCleanup();
      console.log('[CLEANUP] Startup cleanup completed successfully');
      return stats;
    } catch (error) {
      console.error('[CLEANUP] Startup cleanup failed:', error);
      throw error;
    }
  }
  
  /**
   * Get cleanup statistics
   */
  getCleanupStats(): {
    lastCleanup: number;
    isRunning: boolean;
    recentStats: CleanupStats[];
    totalExpiredCodes: number;
    totalRateLimitData: number;
  } {
    const totalExpiredCodes = this.cleanupStats.reduce((sum, stat) => sum + stat.expiredCodes, 0);
    const totalRateLimitData = this.cleanupStats.reduce((sum, stat) => sum + stat.rateLimitData, 0);
    
    return {
      lastCleanup: this.lastCleanup,
      isRunning: this.isRunning,
      recentStats: [...this.cleanupStats],
      totalExpiredCodes,
      totalRateLimitData,
    };
  }
  
  /**
   * Get current system status
   */
  async getSystemStatus(): Promise<{
    verificationCodes: {
      totalActive: number;
      expiredCount: number;
      highAttemptCount: number;
    };
    rateLimits: {
      verificationAttempts: number;
      resendRequests: number;
      emailVerificationActivity: number;
      resendCooldowns: number;
      securityEvents: number;
    };
    cleanup: {
      lastCleanup: number;
      isRunning: boolean;
      nextCleanupDue: number;
    };
  }> {
    const codeStats = await emailVerificationCodeService.getCodeStats();
    const rateLimitStats = emailVerificationRateLimiter.getStats();
    const cleanupStats = this.getCleanupStats();
    
    // Estimate next cleanup time (assuming hourly cleanup)
    const nextCleanupDue = cleanupStats.lastCleanup + (60 * 60 * 1000);
    
    return {
      verificationCodes: codeStats,
      rateLimits: rateLimitStats,
      cleanup: {
        lastCleanup: cleanupStats.lastCleanup,
        isRunning: cleanupStats.isRunning,
        nextCleanupDue,
      },
    };
  }
  
  /**
   * Force cleanup if needed (for manual triggers)
   */
  async forceCleanup(): Promise<CleanupStats> {
    if (this.isRunning) {
      throw new Error('Cleanup is already running. Please wait for it to complete.');
    }
    
    console.log('[CLEANUP] Force cleanup requested');
    return await this.runCleanup();
  }
}

// Export singleton instance
export const emailVerificationCleanupService = new EmailVerificationCleanupService();

// Auto-schedule cleanup when this module is imported
if (process.env.NODE_ENV === 'production') {
  // In production, start cleanup automatically
  emailVerificationCleanupService.scheduleCleanup();
} else {
  // In development, run less frequently to avoid noise
  emailVerificationCleanupService.scheduleCleanup(2 * 60 * 60 * 1000); // 2 hours
}