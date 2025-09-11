import { NextRequest, NextResponse } from 'next/server';
import { emailVerificationRateLimiter } from '@/lib/services/email-verification-rate-limiter';
import { emailVerificationCleanupService } from '@/lib/services/email-verification-cleanup';
import { withSecurityMonitoring } from '@/lib/auth/email-verification-middleware';
import { requireAuth } from '@/lib/auth/middleware';

// This endpoint provides system status and security monitoring for email verification
// It should be protected and only accessible to administrators

export async function GET(request: NextRequest) {
  return withSecurityMonitoring(request, async (req) => {
    try {
      // Check if user is authenticated (in a real app, you'd check for admin role)
      const auth = await requireAuth();
      if (!auth) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      // Get query parameters
      const url = new URL(req.url);
      const includeSecurityEvents = url.searchParams.get('includeSecurityEvents') === 'true';
      const securityEventsSince = url.searchParams.get('since');
      
      // Get system status
      const systemStatus = await emailVerificationCleanupService.getSystemStatus();
      
      // Get security events if requested
      let securityEvents = undefined;
      if (includeSecurityEvents) {
        const since = securityEventsSince ? parseInt(securityEventsSince) : undefined;
        securityEvents = emailVerificationRateLimiter.getSecurityEvents(since);
      }
      
      // Get cleanup statistics
      const cleanupStats = emailVerificationCleanupService.getCleanupStats();
      
      return NextResponse.json({
        status: 'healthy',
        timestamp: Date.now(),
        systemStatus,
        cleanupStats,
        securityEvents,
      });
      
    } catch (error) {
      console.error('Email verification status endpoint error:', error);
      
      return NextResponse.json(
        { 
          status: 'error',
          error: 'Failed to get system status',
          timestamp: Date.now(),
        },
        { status: 500 }
      );
    }
  });
}

// Force cleanup endpoint (POST)
export async function POST(request: NextRequest) {
  return withSecurityMonitoring(request, async (req) => {
    try {
      // Check if user is authenticated (in a real app, you'd check for admin role)
      const auth = await requireAuth();
      if (!auth) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      const body = await req.json();
      const action = body.action;
      
      if (action === 'cleanup') {
        try {
          const cleanupStats = await emailVerificationCleanupService.forceCleanup();
          
          return NextResponse.json({
            success: true,
            message: 'Cleanup completed successfully',
            stats: cleanupStats,
            timestamp: Date.now(),
          });
          
        } catch (cleanupError) {
          return NextResponse.json(
            {
              error: 'Cleanup failed',
              message: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
              timestamp: Date.now(),
            },
            { status: 500 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
      
    } catch (error) {
      console.error('Email verification status POST endpoint error:', error);
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}