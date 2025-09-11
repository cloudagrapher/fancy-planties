import 'server-only';

export interface EmailServiceStats {
  totalSent: number;
  totalFailed: number;
  quotaUsed: number;
  quotaLimit: number;
  lastError?: {
    message: string;
    code: string;
    timestamp: number;
  };
  errorsByType: Record<string, number>;
  successRate: number;
  averageResponseTime: number;
  lastResetTime: number;
}

export interface EmailServiceEvent {
  type: 'success' | 'error';
  timestamp: number;
  responseTime: number;
  error?: {
    message: string;
    code: string;
  };
}

export class EmailServiceMonitor {
  private stats: EmailServiceStats;
  private recentEvents: EmailServiceEvent[] = [];
  private readonly maxEvents = 1000; // Keep last 1000 events
  private readonly resetInterval = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    const quotaLimit = this.getQuotaLimit();
    this.stats = {
      totalSent: 0,
      totalFailed: 0,
      quotaUsed: 0,
      quotaLimit,
      errorsByType: {},
      successRate: 100,
      averageResponseTime: 0,
      lastResetTime: Date.now(),
    };
  }

  /**
   * Record a successful email send
   */
  recordSuccess(responseTime: number): void {
    this.stats.totalSent++;
    if (this.stats.quotaLimit > 0) {
      this.stats.quotaUsed++;
    }
    
    const event: EmailServiceEvent = {
      type: 'success',
      timestamp: Date.now(),
      responseTime,
    };
    
    this.addEvent(event);
    this.updateStats();
    
    // Log success in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[EMAIL_MONITOR] Email sent successfully (${responseTime}ms)`);
    }
  }

  /**
   * Record a failed email send
   */
  recordFailure(error: { message: string; code: string }, responseTime: number): void {
    this.stats.totalFailed++;
    
    // Update error counts by type
    this.stats.errorsByType[error.code] = (this.stats.errorsByType[error.code] || 0) + 1;
    
    // Update last error
    this.stats.lastError = {
      message: error.message,
      code: error.code,
      timestamp: Date.now(),
    };
    
    const event: EmailServiceEvent = {
      type: 'error',
      timestamp: Date.now(),
      responseTime,
      error,
    };
    
    this.addEvent(event);
    this.updateStats();
    
    // Log error
    console.error(`[EMAIL_MONITOR] Email send failed: ${error.code} - ${error.message} (${responseTime}ms)`);
    
    // Check for quota issues
    if (error.code === 'QUOTA_EXCEEDED') {
      this.handleQuotaExceeded();
    }
  }

  /**
   * Get current statistics
   */
  getStats(): EmailServiceStats {
    this.checkForReset();
    return { ...this.stats };
  }

  /**
   * Get recent events (last N events)
   */
  getRecentEvents(limit: number = 100): EmailServiceEvent[] {
    return this.recentEvents.slice(-limit);
  }

  /**
   * Get error summary
   */
  getErrorSummary(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: EmailServiceEvent[];
    criticalErrors: EmailServiceEvent[];
  } {
    const recentErrors = this.recentEvents
      .filter(event => event.type === 'error')
      .slice(-50);
    
    const criticalErrors = this.recentEvents
      .filter(event => 
        event.type === 'error' && 
        event.error?.code === 'QUOTA_EXCEEDED'
      )
      .slice(-10);

    return {
      totalErrors: this.stats.totalFailed,
      errorsByType: { ...this.stats.errorsByType },
      recentErrors,
      criticalErrors,
    };
  }

  /**
   * Check if quota is approaching limit
   */
  isQuotaNearLimit(threshold: number = 0.8): boolean {
    if (this.stats.quotaLimit === 0) return false;
    return (this.stats.quotaUsed / this.stats.quotaLimit) >= threshold;
  }

  /**
   * Get quota usage percentage
   */
  getQuotaUsagePercentage(): number {
    if (this.stats.quotaLimit === 0) return 0;
    return Math.round((this.stats.quotaUsed / this.stats.quotaLimit) * 100);
  }

  /**
   * Reset daily statistics (called automatically)
   */
  resetDailyStats(): void {
    console.log('[EMAIL_MONITOR] Resetting daily statistics');
    
    this.stats.totalSent = 0;
    this.stats.totalFailed = 0;
    this.stats.quotaUsed = 0;
    this.stats.errorsByType = {};
    this.stats.lastResetTime = Date.now();
    
    // Keep only recent events (last 100)
    this.recentEvents = this.recentEvents.slice(-100);
    
    this.updateStats();
  }

  /**
   * Force reset statistics (for testing or manual reset)
   */
  forceReset(): void {
    console.log('[EMAIL_MONITOR] Force resetting statistics');
    this.resetDailyStats();
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check success rate
    if (this.stats.successRate < 95) {
      status = 'warning';
      issues.push(`Low success rate: ${this.stats.successRate.toFixed(1)}%`);
      recommendations.push('Check email service configuration and network connectivity');
    }

    if (this.stats.successRate < 80) {
      status = 'critical';
    }

    // Check quota usage
    if (this.isQuotaNearLimit(0.9)) {
      status = status === 'critical' ? 'critical' : 'warning';
      issues.push(`High quota usage: ${this.getQuotaUsagePercentage()}%`);
      recommendations.push('Consider upgrading email service plan or implementing email throttling');
    }

    if (this.isQuotaNearLimit(0.95)) {
      status = 'critical';
    }

    // Check for recent critical errors
    const recentCriticalErrors = this.recentEvents
      .filter(event => 
        event.type === 'error' && 
        event.error?.code === 'QUOTA_EXCEEDED' &&
        Date.now() - event.timestamp < 60 * 60 * 1000 // Last hour
      );

    if (recentCriticalErrors.length > 0) {
      status = 'critical';
      issues.push('Quota exceeded errors in the last hour');
      recommendations.push('Immediate attention required - email service quota exceeded');
    }

    // Check average response time
    if (this.stats.averageResponseTime > 5000) {
      status = status === 'critical' ? 'critical' : 'warning';
      issues.push(`High response time: ${this.stats.averageResponseTime}ms`);
      recommendations.push('Check email service performance and network latency');
    }

    return { status, issues, recommendations };
  }

  private addEvent(event: EmailServiceEvent): void {
    this.recentEvents.push(event);
    
    // Keep only the most recent events
    if (this.recentEvents.length > this.maxEvents) {
      this.recentEvents = this.recentEvents.slice(-this.maxEvents);
    }
  }

  private updateStats(): void {
    const total = this.stats.totalSent + this.stats.totalFailed;
    this.stats.successRate = total > 0 ? (this.stats.totalSent / total) * 100 : 100;
    
    // Calculate average response time from recent events
    const recentEvents = this.recentEvents.slice(-100);
    if (recentEvents.length > 0) {
      const totalTime = recentEvents.reduce((sum, event) => sum + event.responseTime, 0);
      this.stats.averageResponseTime = Math.round(totalTime / recentEvents.length);
    }
  }

  private checkForReset(): void {
    const now = Date.now();
    if (now - this.stats.lastResetTime >= this.resetInterval) {
      this.resetDailyStats();
    }
  }

  private getQuotaLimit(): number {
    // Default Resend free tier limits
    // This could be made configurable via environment variables
    const dailyLimit = parseInt(process.env.EMAIL_DAILY_QUOTA || '100', 10);
    return dailyLimit;
  }

  private handleQuotaExceeded(): void {
    console.error('[EMAIL_MONITOR] CRITICAL: Email quota exceeded!');
    
    // In a production system, you might want to:
    // - Send alerts to administrators
    // - Temporarily disable email sending
    // - Switch to a backup email service
    // - Log to external monitoring system
    
    if (process.env.NODE_ENV === 'production') {
      // Log critical error for external monitoring
      console.error('[EMAIL_MONITOR] ALERT: Email service quota exceeded - immediate attention required');
    }
  }
}

// Export singleton instance
export const emailServiceMonitor = new EmailServiceMonitor();

// Schedule daily reset (but not during tests)
if (process.env.NODE_ENV === 'production') {
  // Reset at midnight UTC
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  
  const msUntilMidnight = tomorrow.getTime() - now.getTime();
  
  setTimeout(() => {
    emailServiceMonitor.resetDailyStats();
    
    // Then reset every 24 hours
    setInterval(() => {
      emailServiceMonitor.resetDailyStats();
    }, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
}