/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

// Mock dependencies first, before importing the route
jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));
jest.mock('@/lib/services/email-verification-cleanup', () => ({
  emailVerificationCleanupService: {
    getSystemStatus: jest.fn(),
    getCleanupStats: jest.fn(),
    forceCleanup: jest.fn(),
  },
}));
jest.mock('@/lib/services/email-service-monitor', () => ({
  emailServiceMonitor: {
    getStats: jest.fn(),
    getHealthStatus: jest.fn(),
    getRecentEvents: jest.fn(),
    getErrorSummary: jest.fn(),
    isQuotaNearLimit: jest.fn(),
    forceReset: jest.fn(),
  },
}));

// Now import the route and dependencies
import { GET, POST } from '@/app/api/admin/email-verification-monitor/route';
import { requireAuth } from '@/lib/auth/middleware';
import { emailVerificationCleanupService } from '@/lib/services/email-verification-cleanup';
import { emailServiceMonitor } from '@/lib/services/email-service-monitor';

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockCleanupService = emailVerificationCleanupService as jest.Mocked<typeof emailVerificationCleanupService>;
const mockEmailServiceMonitor = emailServiceMonitor as jest.Mocked<typeof emailServiceMonitor>;

describe('/api/admin/email-verification-monitor', () => {
  const mockUser = { id: 1, email: 'admin@example.com', name: 'Admin' };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication
    mockRequireAuth.mockResolvedValue({ user: mockUser });
    
    // Mock system status
    mockCleanupService.getSystemStatus.mockResolvedValue({
      verificationCodes: {
        totalActive: 10,
        expiredCount: 2,
        highAttemptCount: 1,
      },
      rateLimits: {
        verificationAttempts: 5,
        resendRequests: 3,
        emailVerificationActivity: 8,
        resendCooldowns: 1,
        securityEvents: 0,
      },
      emailService: {
        health: 'healthy',
        quotaUsage: 45,
        successRate: 98.5,
        totalSent: 200,
        totalFailed: 3,
        averageResponseTime: 150,
        issues: [],
        recommendations: [],
      },
      cleanup: {
        lastCleanup: Date.now() - 30 * 60 * 1000, // 30 minutes ago
        isRunning: false,
        nextCleanupDue: Date.now() + 30 * 60 * 1000, // 30 minutes from now
      },
    });
    
    // Mock email service monitor
    mockEmailServiceMonitor.getStats.mockReturnValue({
      totalSent: 200,
      totalFailed: 3,
      quotaUsed: 45,
      quotaLimit: 100,
      errorsByType: { API_ERROR: 2, NETWORK_ERROR: 1 },
      successRate: 98.5,
      averageResponseTime: 150,
      lastResetTime: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    });
    
    mockEmailServiceMonitor.getHealthStatus.mockReturnValue({
      status: 'healthy',
      issues: [],
      recommendations: [],
    });
    
    mockEmailServiceMonitor.getRecentEvents.mockReturnValue([
      {
        type: 'success',
        timestamp: Date.now() - 5 * 60 * 1000,
        responseTime: 120,
      },
      {
        type: 'error',
        timestamp: Date.now() - 10 * 60 * 1000,
        responseTime: 300,
        error: { message: 'API Error', code: 'API_ERROR' },
      },
    ]);
    
    mockEmailServiceMonitor.getErrorSummary.mockReturnValue({
      totalErrors: 3,
      errorsByType: { API_ERROR: 2, NETWORK_ERROR: 1 },
      recentErrors: [
        {
          type: 'error',
          timestamp: Date.now() - 10 * 60 * 1000,
          responseTime: 300,
          error: { message: 'API Error', code: 'API_ERROR' },
        },
      ],
      criticalErrors: [],
    });
    
    mockEmailServiceMonitor.isQuotaNearLimit.mockReturnValue(false);
    
    mockCleanupService.getCleanupStats.mockReturnValue({
      lastCleanup: Date.now() - 30 * 60 * 1000,
      isRunning: false,
      recentStats: [
        {
          expiredCodes: 5,
          rateLimitData: 3,
          timestamp: Date.now() - 30 * 60 * 1000,
        },
      ],
      totalExpiredCodes: 25,
      totalRateLimitData: 15,
    });
  });

  describe('GET', () => {
    it('should return comprehensive monitoring data', async () => {
      const request = new NextRequest('http://localhost/api/admin/email-verification-monitor');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toMatchObject({
        timestamp: expect.any(Number),
        systemStatus: expect.objectContaining({
          verificationCodes: expect.any(Object),
          rateLimits: expect.any(Object),
          emailService: expect.any(Object),
          cleanup: expect.any(Object),
        }),
        emailService: expect.objectContaining({
          stats: expect.any(Object),
          health: expect.any(Object),
          recentEvents: expect.any(Array),
          errorSummary: expect.any(Object),
          quotaWarning: expect.any(Boolean),
          quotaCritical: expect.any(Boolean),
        }),
        cleanup: expect.any(Object),
        alerts: expect.any(Array),
      });
      
      expect(mockRequireAuth).toHaveBeenCalledWith();
      expect(mockCleanupService.getSystemStatus).toHaveBeenCalledWith();
      expect(mockEmailServiceMonitor.getStats).toHaveBeenCalledWith();
      expect(mockEmailServiceMonitor.getHealthStatus).toHaveBeenCalledWith();
      expect(mockEmailServiceMonitor.getRecentEvents).toHaveBeenCalledWith(50);
      expect(mockEmailServiceMonitor.getErrorSummary).toHaveBeenCalledWith();
    });

    it('should generate alerts for critical conditions', async () => {
      // Mock critical email service health
      mockCleanupService.getSystemStatus.mockResolvedValue({
        verificationCodes: { totalActive: 10, expiredCount: 2, highAttemptCount: 1 },
        rateLimits: { verificationAttempts: 5, resendRequests: 3, emailVerificationActivity: 8, resendCooldowns: 1, securityEvents: 15 },
        emailService: {
          health: 'critical',
          quotaUsage: 96,
          successRate: 75,
          totalSent: 200,
          totalFailed: 50,
          averageResponseTime: 150,
          issues: ['Critical quota usage', 'Low success rate'],
          recommendations: ['Immediate action required'],
        },
        cleanup: { lastCleanup: Date.now() - 30 * 60 * 1000, isRunning: false, nextCleanupDue: Date.now() + 30 * 60 * 1000 },
      });
      
      mockEmailServiceMonitor.getHealthStatus.mockReturnValue({
        status: 'critical',
        issues: ['Critical quota usage', 'Low success rate'],
        recommendations: ['Immediate action required'],
      });

      const request = new NextRequest('http://localhost/api/admin/email-verification-monitor');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.alerts.length).toBeGreaterThan(0);
      
      // Should have critical alerts
      const criticalAlerts = data.alerts.filter((alert: any) => alert.level === 'critical');
      expect(criticalAlerts.length).toBeGreaterThan(0);
      
      // Should have quota alert
      const quotaAlert = data.alerts.find((alert: any) => alert.message.includes('quota'));
      expect(quotaAlert).toBeDefined();
      expect(quotaAlert.level).toBe('critical');
      
      // Should have success rate alert
      const successRateAlert = data.alerts.find((alert: any) => alert.message.includes('success rate'));
      expect(successRateAlert).toBeDefined();
      expect(successRateAlert.level).toBe('critical');
      
      // Should have security events alert
      const securityAlert = data.alerts.find((alert: any) => alert.message.includes('security events'));
      expect(securityAlert).toBeDefined();
      expect(securityAlert.level).toBe('warning');
    });

    it('should handle authentication errors', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Unauthorized'));
      
      const request = new NextRequest('http://localhost/api/admin/email-verification-monitor');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch monitoring data');
    });

    it('should handle system status errors', async () => {
      mockCleanupService.getSystemStatus.mockRejectedValue(new Error('Database error'));
      
      const request = new NextRequest('http://localhost/api/admin/email-verification-monitor');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch monitoring data');
      expect(data.details).toBe('Database error');
    });
  });

  describe('POST', () => {
    it('should handle force-cleanup action', async () => {
      const cleanupResult = {
        expiredCodes: 10,
        rateLimitData: 5,
        timestamp: Date.now(),
      };
      
      mockCleanupService.forceCleanup.mockResolvedValue(cleanupResult);
      
      const request = new NextRequest('http://localhost/api/admin/email-verification-monitor', {
        method: 'POST',
        body: JSON.stringify({ action: 'force-cleanup' }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toEqual({
        success: true,
        message: 'Cleanup completed successfully',
        result: cleanupResult,
      });
      
      expect(mockCleanupService.forceCleanup).toHaveBeenCalledWith();
    });

    it('should handle reset-email-stats action', async () => {
      const request = new NextRequest('http://localhost/api/admin/email-verification-monitor', {
        method: 'POST',
        body: JSON.stringify({ action: 'reset-email-stats' }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toEqual({
        success: true,
        message: 'Email service statistics reset successfully',
      });
      
      expect(mockEmailServiceMonitor.forceReset).toHaveBeenCalledWith();
    });

    it('should handle get-error-details action', async () => {
      const errorDetails = {
        totalErrors: 5,
        errorsByType: { API_ERROR: 3, NETWORK_ERROR: 2 },
        recentErrors: [],
        criticalErrors: [],
      };
      
      const recentEvents = [
        { type: 'error', timestamp: Date.now(), responseTime: 200, error: { message: 'Error', code: 'API_ERROR' } },
      ];
      
      mockEmailServiceMonitor.getErrorSummary.mockReturnValue(errorDetails);
      mockEmailServiceMonitor.getRecentEvents.mockReturnValue(recentEvents);
      
      const request = new NextRequest('http://localhost/api/admin/email-verification-monitor', {
        method: 'POST',
        body: JSON.stringify({ action: 'get-error-details' }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toEqual({
        success: true,
        errorDetails,
        recentEvents,
      });
      
      expect(mockEmailServiceMonitor.getErrorSummary).toHaveBeenCalledWith();
      expect(mockEmailServiceMonitor.getRecentEvents).toHaveBeenCalledWith(200);
    });

    it('should handle invalid action', async () => {
      const request = new NextRequest('http://localhost/api/admin/email-verification-monitor', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalid-action' }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('Invalid action specified');
    });

    it('should handle authentication errors', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Unauthorized'));
      
      const request = new NextRequest('http://localhost/api/admin/email-verification-monitor', {
        method: 'POST',
        body: JSON.stringify({ action: 'force-cleanup' }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe('Failed to perform admin action');
    });

    it('should handle cleanup errors', async () => {
      mockCleanupService.forceCleanup.mockRejectedValue(new Error('Cleanup failed'));
      
      const request = new NextRequest('http://localhost/api/admin/email-verification-monitor', {
        method: 'POST',
        body: JSON.stringify({ action: 'force-cleanup' }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe('Failed to perform admin action');
      expect(data.details).toBe('Cleanup failed');
    });
  });
});