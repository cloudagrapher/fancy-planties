'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';

interface MonitoringData {
  timestamp: number;
  systemStatus: {
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
  };
  emailService: {
    stats: any;
    health: any;
    recentEvents: any[];
    errorSummary: any;
    quotaWarning: boolean;
    quotaCritical: boolean;
  };
  cleanup: any;
  alerts: Array<{
    level: 'info' | 'warning' | 'critical';
    message: string;
    recommendation?: string;
    timestamp: number;
  }>;
}

export default function EmailVerificationMonitor() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = async () => {
    try {
      const response = await apiFetch('/api/admin/email-verification-monitor');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (action: string) => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/admin/email-verification-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Refresh data after action
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'critical': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Email Verification Monitor</h2>
          <p className="text-gray-600">
            Last updated: {lastUpdated?.toLocaleString() || 'Never'}
          </p>
        </div>
        <div className="flex space-x-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">Active Alerts</h3>
          {data.alerts.map((alert, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${getAlertColor(alert.level)}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{alert.message}</p>
                  {alert.recommendation && (
                    <p className="text-sm mt-1 opacity-80">{alert.recommendation}</p>
                  )}
                </div>
                <span className="text-xs opacity-60">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Email Service Health */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Service</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Health Status:</span>
              <span className={`font-semibold ${getHealthColor(data.systemStatus.emailService.health)}`}>
                {data.systemStatus.emailService.health.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Quota Usage:</span>
              <span className={data.emailService.quotaCritical ? 'text-red-600 font-semibold' : 
                             data.emailService.quotaWarning ? 'text-yellow-600 font-semibold' : ''}>
                {data.systemStatus.emailService.quotaUsage}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Success Rate:</span>
              <span className={data.systemStatus.emailService.successRate < 95 ? 'text-yellow-600' : 'text-green-600'}>
                {data.systemStatus.emailService.successRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Avg Response:</span>
              <span>{data.systemStatus.emailService.averageResponseTime}ms</span>
            </div>
          </div>
        </div>

        {/* Verification Codes */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification Codes</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Active Codes:</span>
              <span>{data.systemStatus.verificationCodes.totalActive}</span>
            </div>
            <div className="flex justify-between">
              <span>Expired:</span>
              <span>{data.systemStatus.verificationCodes.expiredCount}</span>
            </div>
            <div className="flex justify-between">
              <span>High Attempts:</span>
              <span className={data.systemStatus.verificationCodes.highAttemptCount > 0 ? 'text-yellow-600' : ''}>
                {data.systemStatus.verificationCodes.highAttemptCount}
              </span>
            </div>
          </div>
        </div>

        {/* Rate Limiting */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate Limiting</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Verification Attempts:</span>
              <span>{data.systemStatus.rateLimits.verificationAttempts}</span>
            </div>
            <div className="flex justify-between">
              <span>Resend Requests:</span>
              <span>{data.systemStatus.rateLimits.resendRequests}</span>
            </div>
            <div className="flex justify-between">
              <span>Security Events:</span>
              <span className={data.systemStatus.rateLimits.securityEvents > 10 ? 'text-red-600 font-semibold' : ''}>
                {data.systemStatus.rateLimits.securityEvents}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Statistics */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Total Sent:</span>
              <span className="text-green-600 font-semibold">{data.systemStatus.emailService.totalSent}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Failed:</span>
              <span className="text-red-600 font-semibold">{data.systemStatus.emailService.totalFailed}</span>
            </div>
            {data.systemStatus.emailService.issues.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-gray-700 mb-2">Current Issues:</h4>
                <ul className="text-sm text-red-600 space-y-1">
                  {data.systemStatus.emailService.issues.map((issue, index) => (
                    <li key={index}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}
            {data.systemStatus.emailService.recommendations.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-gray-700 mb-2">Recommendations:</h4>
                <ul className="text-sm text-blue-600 space-y-1">
                  {data.systemStatus.emailService.recommendations.map((rec, index) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Cleanup Status */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cleanup Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Last Cleanup:</span>
              <span>
                {data.systemStatus.cleanup.lastCleanup 
                  ? new Date(data.systemStatus.cleanup.lastCleanup).toLocaleString()
                  : 'Never'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span>Currently Running:</span>
              <span className={data.systemStatus.cleanup.isRunning ? 'text-blue-600' : 'text-gray-600'}>
                {data.systemStatus.cleanup.isRunning ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Next Due:</span>
              <span>
                {new Date(data.systemStatus.cleanup.nextCleanupDue).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Actions</h3>
        <div className="flex space-x-4">
          <button
            onClick={() => performAction('force-cleanup')}
            disabled={loading || data.systemStatus.cleanup.isRunning}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Force Cleanup
          </button>
          <button
            onClick={() => performAction('reset-email-stats')}
            disabled={loading}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:opacity-50"
          >
            Reset Email Stats
          </button>
          <button
            onClick={() => performAction('get-error-details')}
            disabled={loading}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            Get Error Details
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}