import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { emailVerificationCleanupService } from '@/lib/services/email-verification-cleanup';
import { emailServiceMonitor } from '@/lib/services/email-service-monitor';
import { requireAuth } from '@/lib/auth/middleware';

/**
 * GET /api/admin/email-verification-monitor
 * 
 * Get comprehensive monitoring data for the email verification system.
 * This endpoint provides detailed statistics about:
 * - Email service performance and quota usage
 * - Verification code statistics
 * - Rate limiting status
 * - System health indicators
 * 
 * This endpoint should be protected and only accessible to administrators.
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication (in a real app, you'd also check for admin role)
    const authResult = await requireAuth();
    if (!authResult) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    const { user } = authResult;
    
    // Get comprehensive system status
    const systemStatus = await emailVerificationCleanupService.getSystemStatus();
    
    // Get detailed email service statistics
    const emailStats = emailServiceMonitor.getStats();
    const emailHealth = emailServiceMonitor.getHealthStatus();
    const recentEvents = emailServiceMonitor.getRecentEvents(50);
    const errorSummary = emailServiceMonitor.getErrorSummary();
    
    // Get cleanup statistics
    const cleanupStats = emailVerificationCleanupService.getCleanupStats();
    
    const monitoringData = {
      timestamp: Date.now(),
      systemStatus,
      emailService: {
        stats: emailStats,
        health: emailHealth,
        recentEvents,
        errorSummary,
        quotaWarning: emailServiceMonitor.isQuotaNearLimit(0.8),
        quotaCritical: emailServiceMonitor.isQuotaNearLimit(0.95),
      },
      cleanup: cleanupStats,
      alerts: generateAlerts(systemStatus, emailHealth),
    };
    
    return NextResponse.json(monitoringData);
    
  } catch (error) {
    console.error('Error fetching email verification monitoring data:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch monitoring data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/email-verification-monitor
 * 
 * Perform administrative actions on the email verification system:
 * - Force cleanup
 * - Reset email service statistics
 * - Get detailed error reports
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication (in a real app, you'd also check for admin role)
    const authResult = await requireAuth();
    if (!authResult) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    const { user } = authResult;
    
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'force-cleanup':
        const cleanupResult = await emailVerificationCleanupService.forceCleanup();
        return NextResponse.json({
          success: true,
          message: 'Cleanup completed successfully',
          result: cleanupResult,
        });
        
      case 'reset-email-stats':
        emailServiceMonitor.forceReset();
        return NextResponse.json({
          success: true,
          message: 'Email service statistics reset successfully',
        });
        
      case 'get-error-details':
        const errorDetails = emailServiceMonitor.getErrorSummary();
        const recentEvents = emailServiceMonitor.getRecentEvents(200);
        return NextResponse.json({
          success: true,
          errorDetails,
          recentEvents,
        });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Error performing admin action:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to perform admin action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Generate alerts based on system status
 */
function generateAlerts(
  systemStatus: any,
  emailHealth: { status: string; issues: string[]; recommendations: string[] }
): Array<{
  level: 'info' | 'warning' | 'critical';
  message: string;
  recommendation?: string;
  timestamp: number;
}> {
  const alerts = [];
  const now = Date.now();
  
  // Email service alerts
  if (emailHealth.status === 'critical') {
    alerts.push({
      level: 'critical' as const,
      message: 'Email service is in critical state',
      recommendation: emailHealth.recommendations[0],
      timestamp: now,
    });
  } else if (emailHealth.status === 'warning') {
    alerts.push({
      level: 'warning' as const,
      message: 'Email service requires attention',
      recommendation: emailHealth.recommendations[0],
      timestamp: now,
    });
  }
  
  // Quota alerts
  if (systemStatus.emailService.quotaUsage >= 95) {
    alerts.push({
      level: 'critical' as const,
      message: `Email quota critically high: ${systemStatus.emailService.quotaUsage}%`,
      recommendation: 'Immediate action required - consider upgrading plan or implementing throttling',
      timestamp: now,
    });
  } else if (systemStatus.emailService.quotaUsage >= 80) {
    alerts.push({
      level: 'warning' as const,
      message: `Email quota usage high: ${systemStatus.emailService.quotaUsage}%`,
      recommendation: 'Monitor usage closely and consider upgrading plan',
      timestamp: now,
    });
  }
  
  // Success rate alerts
  if (systemStatus.emailService.successRate < 80) {
    alerts.push({
      level: 'critical' as const,
      message: `Email success rate critically low: ${systemStatus.emailService.successRate.toFixed(1)}%`,
      recommendation: 'Check email service configuration and network connectivity',
      timestamp: now,
    });
  } else if (systemStatus.emailService.successRate < 95) {
    alerts.push({
      level: 'warning' as const,
      message: `Email success rate below optimal: ${systemStatus.emailService.successRate.toFixed(1)}%`,
      recommendation: 'Monitor email delivery and check for configuration issues',
      timestamp: now,
    });
  }
  
  // Cleanup alerts
  const timeSinceLastCleanup = now - systemStatus.cleanup.lastCleanup;
  const hoursWithoutCleanup = timeSinceLastCleanup / (60 * 60 * 1000);
  
  if (hoursWithoutCleanup > 25) { // More than 25 hours
    alerts.push({
      level: 'warning' as const,
      message: `Cleanup hasn't run for ${Math.round(hoursWithoutCleanup)} hours`,
      recommendation: 'Check cleanup service status and logs',
      timestamp: now,
    });
  }
  
  // Rate limiting alerts
  if (systemStatus.rateLimits.securityEvents > 10) {
    alerts.push({
      level: 'warning' as const,
      message: `High number of security events: ${systemStatus.rateLimits.securityEvents}`,
      recommendation: 'Review security logs for potential abuse',
      timestamp: now,
    });
  }
  
  return alerts;
}