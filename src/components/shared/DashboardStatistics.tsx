'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface GuideStats {
  total: number;
  public: number;
  private: number;
  byLevel: {
    family: number;
    genus: number;
    species: number;
    cultivar: number;
  };
}

interface PropagationStats {
  totalPropagations: number;
  byStatus: Record<string, number>;
  successRate: number;
  averageDaysToEstablished: number;
}

interface CareStats {
  totalActivePlants: number;
  careStreakDays: number;
  totalCareEventsThisWeek: number;
  averageCareConsistency: number;
}

interface DashboardStatisticsProps {
  userId: number;
  className?: string;
}

export default function DashboardStatistics({ userId, className = '' }: DashboardStatisticsProps) {
  // Fetch guide statistics
  const { data: guideStats, isLoading: guideLoading, error: guideError } = useQuery({
    queryKey: ['guide-stats', userId],
    queryFn: async (): Promise<GuideStats> => {
      const response = await fetch('/api/care-guides/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch guide statistics');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });

  // Fetch propagation statistics
  const { data: propagationStats, isLoading: propagationLoading, error: propagationError } = useQuery({
    queryKey: ['propagation-stats', userId],
    queryFn: async (): Promise<PropagationStats> => {
      const response = await fetch('/api/propagations/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch propagation statistics');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });

  // Fetch care dashboard statistics
  const { data: careStats, isLoading: careLoading, error: careError } = useQuery({
    queryKey: ['care-dashboard-stats', userId],
    queryFn: async (): Promise<CareStats> => {
      const response = await fetch('/api/care/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch care statistics');
      }
      const data = await response.json();
      return data.statistics;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes (more frequent for care data)
    retry: 2,
  });

  const isLoading = guideLoading || propagationLoading || careLoading;
  const hasError = guideError || propagationError || careError;

  // Format statistics with proper fallbacks
  const formatNumber = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) return '0';
    return value.toString();
  };

  const formatPercentage = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) return '0%';
    return `${Math.round(value)}%`;
  };

  const getConsistencyLabel = (score: number | undefined | null): string => {
    if (score === undefined || score === null || isNaN(score)) return 'Unknown';
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const getMostCommonLevel = (byLevel: GuideStats['byLevel'] | undefined): string => {
    if (!byLevel) return 'None';
    
    const levels = Object.entries(byLevel);
    if (levels.length === 0) return 'None';
    
    const maxEntry = levels.reduce((max, current) => 
      current[1] > max[1] ? current : max
    );
    
    if (maxEntry[1] === 0) return 'None';
    
    return maxEntry[0].charAt(0).toUpperCase() + maxEntry[0].slice(1);
  };

  const getStreakMessage = (days: number | undefined | null): string => {
    if (!days || days === 0) return 'Start your streak!';
    if (days === 1) return '1 day streak';
    return `${days} day streak`;
  };

  if (hasError) {
    return (
      <div className={`rounded-2xl shadow-sm border border-red-200/70 bg-red-50/70 backdrop-blur p-6 text-center ${className}`}>
        <div className="text-red-600 mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Statistics</h3>
        <p className="text-gray-600 mb-4">
          {guideError?.message || propagationError?.message || careError?.message || 'Failed to load dashboard statistics'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Guide Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>📖</span>
          Care Guide Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-emerald-50/70 backdrop-blur p-4">
            <div className="text-2xl font-bold text-emerald-600">
              {isLoading ? '--' : formatNumber(guideStats?.total)}
            </div>
            <div className="text-sm text-emerald-700">Total Guides</div>
          </div>
          <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-blue-50/70 backdrop-blur p-4">
            <div className="text-2xl font-bold text-blue-600">
              {isLoading ? '--' : formatNumber(guideStats?.public)}
            </div>
            <div className="text-sm text-blue-700">Public</div>
          </div>
          <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-amber-50/70 backdrop-blur p-4">
            <div className="text-2xl font-bold text-amber-600">
              {isLoading ? '--' : formatNumber(guideStats?.private)}
            </div>
            <div className="text-sm text-amber-700">Private</div>
          </div>
          <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-slate-50/70 backdrop-blur p-4">
            <div className="text-2xl font-bold text-slate-600">
              {isLoading ? '--' : getMostCommonLevel(guideStats?.byLevel)}
            </div>
            <div className="text-sm text-slate-700">Most Common Level</div>
          </div>
        </div>
      </div>

      {/* Propagation Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>🌿</span>
          Propagation Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-emerald-50/70 backdrop-blur p-4">
            <div className="text-2xl font-bold text-emerald-600">
              {isLoading ? '--' : formatNumber(propagationStats?.totalPropagations)}
            </div>
            <div className="text-sm text-emerald-700">Total Propagations</div>
          </div>
          <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-green-50/70 backdrop-blur p-4">
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? '--' : formatPercentage(propagationStats?.successRate)}
            </div>
            <div className="text-sm text-green-700">Success Rate</div>
          </div>
          <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-sky-50/70 backdrop-blur p-4">
            <div className="text-2xl font-bold text-sky-600">
              {isLoading ? '--' : formatNumber(propagationStats?.averageDaysToEstablished)}
            </div>
            <div className="text-sm text-sky-700">Avg Days to Establish</div>
          </div>
          <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-amber-50/70 backdrop-blur p-4">
            <div className="text-2xl font-bold text-amber-600">
              {isLoading ? '--' : formatNumber(
                (propagationStats?.byStatus?.started || 0) + 
                (propagationStats?.byStatus?.rooting || 0) + 
                (propagationStats?.byStatus?.planted || 0)
              )}
            </div>
            <div className="text-sm text-amber-700">Active Propagations</div>
          </div>
        </div>
      </div>

      {/* Plant Care Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>🌱</span>
          Plant Care Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-emerald-50/70 backdrop-blur p-4">
            <div className="text-2xl font-bold text-emerald-600">
              {isLoading ? '--' : formatNumber(careStats?.totalActivePlants)}
            </div>
            <div className="text-sm text-emerald-700">Plants</div>
          </div>
          <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-amber-50/70 backdrop-blur p-4">
            <div className="text-2xl font-bold text-amber-600">
              {isLoading ? '--' : formatNumber(careStats?.careStreakDays)}
            </div>
            <div className="text-xs text-amber-600">
              {isLoading ? '' : getStreakMessage(careStats?.careStreakDays)}
            </div>
            <div className="text-sm text-amber-700">Care Streak</div>
          </div>
          <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-sky-50/70 backdrop-blur p-4">
            <div className="text-2xl font-bold text-sky-600">
              {isLoading ? '--' : formatNumber(careStats?.totalCareEventsThisWeek)}
            </div>
            <div className="text-sm text-sky-700">This Week</div>
            <div className="text-xs text-sky-600">care events</div>
          </div>
          <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-green-50/70 backdrop-blur p-4">
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? '--' : formatPercentage(careStats?.averageCareConsistency)}
            </div>
            <div className="text-sm text-green-700">Consistency</div>
            <div className="text-xs text-green-600">
              {isLoading ? '' : getConsistencyLabel(careStats?.averageCareConsistency)}
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
            Loading statistics...
          </div>
        </div>
      )}
    </div>
  );
}