import 'server-only';

// Rate limiting configuration for email verification
export interface EmailVerificationRateLimitConfig {
  // Verification attempts
  maxVerificationAttempts: number;
  verificationWindowMs: number;
  
  // Resend requests
  maxResendRequests: number;
  resendWindowMs: number;
  resendCooldownMs: number;
  
  // Overall email verification activity
  maxEmailVerificationRequests: number;
  emailVerificationWindowMs: number;
}

// Default configuration based on requirements
export const DEFAULT_EMAIL_VERIFICATION_RATE_LIMIT_CONFIG: EmailVerificationRateLimitConfig = {
  // Max 5 verification attempts per code (handled by service)
  maxVerificationAttempts: 10, // Per IP per hour
  verificationWindowMs: 60 * 60 * 1000, // 1 hour
  
  // Max 5 resend requests per hour per email
  maxResendRequests: 5,
  resendWindowMs: 60 * 60 * 1000, // 1 hour
  resendCooldownMs: 60 * 1000, // 60 seconds between resends
  
  // Overall email verification activity per IP
  maxEmailVerificationRequests: 20,
  emailVerificationWindowMs: 60 * 60 * 1000, // 1 hour
};

// Rate limit entry structure
interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstAttempt: number;
}

// In-memory stores (in production, use Redis)
const verificationAttemptStore = new Map<string, RateLimitEntry>();
const resendRequestStore = new Map<string, RateLimitEntry>();
const emailVerificationStore = new Map<string, RateLimitEntry>();
const resendCooldownStore = new Map<string, number>(); // email -> last resend timestamp

// Security event logging
export interface SecurityEvent {
  type: 'RATE_LIMIT_EXCEEDED' | 'SUSPICIOUS_ACTIVITY' | 'BRUTE_FORCE_ATTEMPT';
  identifier: string;
  email?: string;
  timestamp: number;
  details: Record<string, any>;
}

const securityEvents: SecurityEvent[] = [];

export function logSecurityEvent(event: SecurityEvent): void {
  securityEvents.push(event);
  
  // Log to console (in production, send to monitoring service)
  console.warn(`[SECURITY] ${event.type}:`, {
    identifier: event.identifier,
    email: event.email,
    timestamp: new Date(event.timestamp).toISOString(),
    details: event.details,
  });
  
  // Keep only last 1000 events in memory
  if (securityEvents.length > 1000) {
    securityEvents.splice(0, securityEvents.length - 1000);
  }
}

// Generic rate limiting function
function checkRateLimit(
  store: Map<string, RateLimitEntry>,
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number } {
  const now = Date.now();
  
  // Clean up expired entries
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime < now) {
      store.delete(key);
    }
  }
  
  const entry = store.get(identifier);
  
  if (!entry || entry.resetTime < now) {
    // New window or expired window
    const resetTime = now + windowMs;
    store.set(identifier, {
      count: 1,
      resetTime,
      firstAttempt: now,
    });
    
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime,
    };
  }
  
  if (entry.count >= maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }
  
  // Increment count
  entry.count++;
  store.set(identifier, entry);
  
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

export class EmailVerificationRateLimiter {
  constructor(private config: EmailVerificationRateLimitConfig = DEFAULT_EMAIL_VERIFICATION_RATE_LIMIT_CONFIG) {}
  
  /**
   * Check rate limit for verification attempts
   */
  checkVerificationAttempts(identifier: string, email?: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
    const result = checkRateLimit(
      verificationAttemptStore,
      identifier,
      this.config.maxVerificationAttempts,
      this.config.verificationWindowMs
    );
    
    if (!result.allowed) {
      logSecurityEvent({
        type: 'RATE_LIMIT_EXCEEDED',
        identifier,
        email,
        timestamp: Date.now(),
        details: {
          limitType: 'verification_attempts',
          maxRequests: this.config.maxVerificationAttempts,
          windowMs: this.config.verificationWindowMs,
        },
      });
    }
    
    return result;
  }
  
  /**
   * Check rate limit for resend requests
   */
  checkResendRequests(email: string, identifier: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
    cooldownRemaining?: number;
  } {
    const normalizedEmail = email.toLowerCase();
    
    // Check cooldown first
    const lastResendTime = resendCooldownStore.get(normalizedEmail);
    const now = Date.now();
    
    if (lastResendTime && (now - lastResendTime) < this.config.resendCooldownMs) {
      const cooldownRemaining = Math.ceil((this.config.resendCooldownMs - (now - lastResendTime)) / 1000);
      
      logSecurityEvent({
        type: 'RATE_LIMIT_EXCEEDED',
        identifier,
        email: normalizedEmail,
        timestamp: now,
        details: {
          limitType: 'resend_cooldown',
          cooldownMs: this.config.resendCooldownMs,
          cooldownRemaining,
        },
      });
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: lastResendTime + this.config.resendCooldownMs,
        cooldownRemaining,
      };
    }
    
    // Check hourly rate limit
    const result = checkRateLimit(
      resendRequestStore,
      normalizedEmail,
      this.config.maxResendRequests,
      this.config.resendWindowMs
    );
    
    if (!result.allowed) {
      logSecurityEvent({
        type: 'RATE_LIMIT_EXCEEDED',
        identifier,
        email: normalizedEmail,
        timestamp: now,
        details: {
          limitType: 'resend_requests',
          maxRequests: this.config.maxResendRequests,
          windowMs: this.config.resendWindowMs,
        },
      });
    }
    
    return result;
  }
  
  /**
   * Record successful resend to update cooldown
   */
  recordResendSuccess(email: string): void {
    const normalizedEmail = email.toLowerCase();
    resendCooldownStore.set(normalizedEmail, Date.now());
  }
  
  /**
   * Check overall email verification activity rate limit
   */
  checkEmailVerificationActivity(identifier: string, email?: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
    const result = checkRateLimit(
      emailVerificationStore,
      identifier,
      this.config.maxEmailVerificationRequests,
      this.config.emailVerificationWindowMs
    );
    
    if (!result.allowed) {
      logSecurityEvent({
        type: 'RATE_LIMIT_EXCEEDED',
        identifier,
        email,
        timestamp: Date.now(),
        details: {
          limitType: 'email_verification_activity',
          maxRequests: this.config.maxEmailVerificationRequests,
          windowMs: this.config.emailVerificationWindowMs,
        },
      });
    }
    
    return result;
  }
  
  /**
   * Detect suspicious activity patterns
   */
  detectSuspiciousActivity(identifier: string, email?: string): boolean {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // Check for rapid-fire attempts from same IP
    const verificationEntry = verificationAttemptStore.get(identifier);
    if (verificationEntry && verificationEntry.count >= 8) {
      const timeSpan = now - verificationEntry.firstAttempt;
      if (timeSpan < 10 * 60 * 1000) { // 8+ attempts in 10 minutes
        logSecurityEvent({
          type: 'SUSPICIOUS_ACTIVITY',
          identifier,
          email,
          timestamp: now,
          details: {
            pattern: 'rapid_verification_attempts',
            attempts: verificationEntry.count,
            timeSpanMs: timeSpan,
          },
        });
        return true;
      }
    }
    
    // Check for multiple email addresses from same IP
    const recentEvents = securityEvents.filter(
      event => event.identifier === identifier && 
               event.timestamp > (now - oneHour) &&
               event.email
    );
    
    const uniqueEmails = new Set(recentEvents.map(event => event.email));
    if (uniqueEmails.size >= 5) { // 5+ different emails in 1 hour
      logSecurityEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        identifier,
        email,
        timestamp: now,
        details: {
          pattern: 'multiple_email_addresses',
          uniqueEmails: uniqueEmails.size,
          timeSpanMs: oneHour,
        },
      });
      return true;
    }
    
    return false;
  }
  
  /**
   * Get security events for monitoring
   */
  getSecurityEvents(since?: number): SecurityEvent[] {
    const cutoff = since || (Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    return securityEvents.filter(event => event.timestamp >= cutoff);
  }
  
  /**
   * Clean up expired data
   */
  cleanup(): void {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    // Clean up rate limit stores
    for (const store of [verificationAttemptStore, resendRequestStore, emailVerificationStore]) {
      for (const [key, entry] of store.entries()) {
        if (entry.resetTime < now) {
          store.delete(key);
        }
      }
    }
    
    // Clean up cooldown store
    for (const [email, timestamp] of resendCooldownStore.entries()) {
      if (timestamp < oneDayAgo) {
        resendCooldownStore.delete(email);
      }
    }
    
    // Clean up old security events
    const cutoffIndex = securityEvents.findIndex(event => event.timestamp >= oneDayAgo);
    if (cutoffIndex > 0) {
      securityEvents.splice(0, cutoffIndex);
    }
  }
  
  /**
   * Get rate limit statistics
   */
  getStats(): {
    verificationAttempts: number;
    resendRequests: number;
    emailVerificationActivity: number;
    resendCooldowns: number;
    securityEvents: number;
  } {
    return {
      verificationAttempts: verificationAttemptStore.size,
      resendRequests: resendRequestStore.size,
      emailVerificationActivity: emailVerificationStore.size,
      resendCooldowns: resendCooldownStore.size,
      securityEvents: securityEvents.length,
    };
  }
}

// Export singleton instance
export const emailVerificationRateLimiter = new EmailVerificationRateLimiter();

// Cleanup job - run every hour
setInterval(() => {
  emailVerificationRateLimiter.cleanup();
}, 60 * 60 * 1000);