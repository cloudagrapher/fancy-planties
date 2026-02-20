import 'server-only';
import { emailVerificationCodeService } from './email-verification-code-service';
import { emailVerificationRateLimiter } from './email-verification-rate-limiter';
import { emailServiceMonitor } from './email-service-monitor';

export interface CleanupStats {
  expiredCodes: number;
  rateLimitData: number;
  timestamp: number;
  emailServiceHealth?: {
    status: 'healthy' | 'warning' | 'critical';
    quotaUsage: number;
    successRate: number;
    issues: string[];
  };
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
      if (process.env.NODE_ENV === 'development') console.log('[CLEANUP] Starting email verification cleanup...');
      
      // Clean up expired verification codes
      const expiredCodes = await emailVerificationCodeService.cleanupExpiredCodes();
      if (process.env.NODE_ENV === 'development') console.log(`[CLEANUP] Removed ${expiredCodes} expired verification codes`);
      
      // Clean up rate limit data
      const rateLimitStatsBefore = emailVerificationRateLimiter.getStats();
      emailVerificationRateLimiter.cleanup();
      const rateLimitStatsAfter = emailVerificationRateLimiter.getStats();
      
      const rateLimitDataCleaned = 
        (rateLimitStatsBefore.verificationAttempts - rateLimitStatsAfter.verificationAttempts) +
        (rateLimitStatsBefore.resendRequests - rateLimitStatsAfter.resendRequests) +
        (rateLimitStatsBefore.emailVerificationActivity - rateLimitStatsAfter.emailVerificationActivity) +
        (rateLimitStatsBefore.resendCooldowns - rateLimitStatsAfter.resendCooldowns);
      
      if (process.env.NODE_ENV === 'development') console.log(`[CLEANUP] Cleaned up ${rateLimitDataCleaned} rate limit entries`);
      
      // Check email service health
      const emailHealth = emailServiceMonitor.getHealthStatus();
      const emailStats = emailServiceMonitor.getStats();
      
      if (emailHealth.status !== 'healthy') {
        console.warn(`[CLEANUP] Email service health: ${emailHealth.status}`, {
          issues: emailHealth.issues,
          recommendations: emailHealth.recommendations,
        });
      }
      
      const stats: CleanupStats = {
        expiredCodes,
        rateLimitData: rateLimitDataCleaned,
        timestamp: startTime,
        emailServiceHealth: {
          status: emailHealth.status,
          quotaUsage: emailServiceMonitor.getQuotaUsagePercentage(),
          successRate: emailStats.successRate,
          issues: emailHealth.issues,
        },
      };
      
      // Store cleanup stats (keep last 24 entries)
      this.cleanupStats.push(stats);
      if (this.cleanupStats.length > 24) {
        this.cleanupStats.shift();
      }
      
      this.lastCleanup = startTime;
      
      const duration = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') console.log(`[CLEANUP] Email verification cleanup completed in ${duration}ms`);
      
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
    if (process.env.NODE_ENV === 'development') console.log(`[CLEANUP] Scheduling email verification cleanup every ${intervalMs / 1000} seconds`);
    
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
    if (process.env.NODE_ENV === 'development') console.log('[CLEANUP] Running startup cleanup...');
    
    try {
      const stats = await this.runCleanup();
      if (process.env.NODE_ENV === 'development') console.log('[CLEANUP] Startup cleanup completed successfully');
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
    emailService: {
      health: 'healthy' | 'warning' | 'critical';
      quotaUsage: number;
      successRate: number;
      totalSent: number;
      totalFailed: number;
      averageResponseTime: number;
      issues: string[];
      recommendations: string[];
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
    const emailHealth = emailServiceMonitor.getHealthStatus();
    const emailStats = emailServiceMonitor.getStats();
    
    // Estimate next cleanup time (assuming hourly cleanup)
    const nextCleanupDue = cleanupStats.lastCleanup + (60 * 60 * 1000);
    
    return {
      verificationCodes: codeStats,
      rateLimits: rateLimitStats,
      emailService: {
        health: emailHealth.status,
        quotaUsage: emailServiceMonitor.getQuotaUsagePercentage(),
        successRate: emailStats.successRate,
        totalSent: emailStats.totalSent,
        totalFailed: emailStats.totalFailed,
        averageResponseTime: emailStats.averageResponseTime,
        issues: emailHealth.issues,
        recommendations: emailHealth.recommendations,
      },
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
    
    if (process.env.NODE_ENV === 'development') console.log('[CLEANUP] Force cleanup requested');
    return await this.runCleanup();
  }
}

// Export singleton instance
export const emailVerificationCleanupService = new EmailVerificationCleanupService();

// Auto-schedule cleanup when this module is imported (but not during tests)
if (process.env.NODE_ENV !== 'test') {
  if (process.env.NODE_ENV === 'production') {
    // In production, start cleanup automatically
    emailVerificationCleanupService.scheduleCleanup();
  } else {
    // In development, run less frequently to avoid noise
    emailVerificationCleanupService.scheduleCleanup(2 * 60 * 60 * 1000); // 2 hours
  }
}