'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CareDashboardData } from '@/lib/types/care-types';
import CareTaskCard from './CareTaskCard';
// import QuickCareActions from './QuickCareActions';
import CareStatistics from './CareStatistics';
import { apiFetch } from '@/lib/api-client';

interface CareDashboardProps {
  userId: number;
}

export default function CareDashboard({ userId }: CareDashboardProps) {
  const [selectedTab, setSelectedTab] = useState<'overdue' | 'today' | 'soon' | 'recent'>('overdue');
  const [quickCareLoading, setQuickCareLoading] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Use React Query for dashboard data
  const { data: dashboardData, isLoading: loading, error } = useQuery({
    queryKey: ['care-dashboard', userId],
    queryFn: async (): Promise<CareDashboardData> => {
      const response = await apiFetch(`/api/care/dashboard?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to load care dashboard');
      }
      return response.json();
    },
    staleTime: 1000 * 30, // 30 seconds — avoid hammering API on every focus
    gcTime: 1000 * 60 * 5, // Keep cached data for 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const handleQuickCare = async (plantInstanceId: number, careType: string) => {
    try {
      setQuickCareLoading(plantInstanceId);
      const response = await apiFetch('/api/care/quick-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plantInstanceId,
          careType,
          careDate: new Date().toISOString(),
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to log care');
      }

      // Invalidate and refetch dashboard data
      await queryClient.invalidateQueries({ 
        queryKey: ['care-dashboard', userId],
      });
    } catch (err) {
      console.error('Error logging quick care:', err);
      // Could show a toast notification here instead
    } finally {
      setQuickCareLoading(null);
    }
  };

  const handleBulkQuickCare = async (careType: string) => {
    if (!dashboardData) return;
    
    // Get plants that need this type of care based on urgency
    const plantsNeedingCare = [
      ...dashboardData.overdue,
      ...dashboardData.dueToday,
      ...(careType !== 'fertilizer' ? dashboardData.dueSoon : []) // Be less aggressive for fertilizer
    ];

    if (plantsNeedingCare.length === 0) {
      return;
    }

    try {
      setQuickCareLoading(-1); // Use -1 to indicate bulk operation
      
      // Log care for multiple plants
      const promises = plantsNeedingCare.slice(0, 10).map(plant => // Limit to first 10 plants
        apiFetch('/api/care/quick-log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            plantInstanceId: plant.id,
            careType,
            careDate: new Date().toISOString(),
            userId,
          }),
        })
      );

      const results = await Promise.allSettled(promises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      if (successCount > 0) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['care-dashboard', userId] }),
          queryClient.invalidateQueries({ queryKey: ['plant-instances'] }),
          queryClient.invalidateQueries({ queryKey: ['plant-instances-enhanced'] }),
        ]);
      } else {
        throw new Error('Failed to log care for any plants');
      }
    } catch (err) {
      console.error('Error with bulk care:', err);
      // Could show a toast notification here instead
    } finally {
      setQuickCareLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6" role="status" aria-label="Loading care dashboard">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-3">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
        <span className="sr-only">Loading care dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl shadow-sm border border-red-200/70 bg-red-50/70 backdrop-blur p-6 text-center">
        <div className="text-red-600 mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Care Dashboard</h3>
        <p className="text-gray-600 mb-4">{error instanceof Error ? error.message : 'Failed to load dashboard'}</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['care-dashboard', userId] })}
          disabled={loading}
          className={`px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Loading...' : 'Try Again'}
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const tabs = [
    { id: 'overdue', label: 'Overdue', count: dashboardData.statistics.overdueCount, plants: dashboardData.overdue },
    { id: 'today', label: 'Due Today', count: dashboardData.statistics.dueTodayCount, plants: dashboardData.dueToday },
    { id: 'soon', label: 'Due Soon', count: dashboardData.statistics.dueSoonCount, plants: dashboardData.dueSoon },
    { id: 'recent', label: 'Recent Care', count: dashboardData.recentlyCared.length, plants: dashboardData.recentlyCared },
  ] as const;

  const activeTab = tabs.find(tab => tab.id === selectedTab);
  const activePlants = activeTab?.plants || [];

  return (
    <div className="space-y-6" data-testid="care-dashboard">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Plant Care</h1>
        <p className="text-sm sm:text-base text-gray-600">Keep your plants healthy and thriving</p>
      </div>

      {/* Statistics */}
      <CareStatistics statistics={dashboardData.statistics} />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {dashboardData.quickActions.map((action) => {
          const hasPlants = dashboardData?.statistics?.totalActivePlants > 0;
          const plantsNeedingCare = dashboardData ? [
            ...dashboardData.overdue,
            ...dashboardData.dueToday,
            ...(action.careType !== 'fertilizer' ? dashboardData.dueSoon : [])
          ].length : 0;
          
          return (
            <button
              key={action.id}
              onClick={() => handleBulkQuickCare(action.careType)}
              className={`p-3 sm:p-4 rounded-xl text-white font-medium transition-colors shadow-sm touch-manipulation ${
                hasPlants && plantsNeedingCare > 0 && action.isEnabled && quickCareLoading !== -1 ? action.color : 'bg-gray-400 cursor-not-allowed'
              }`}
              disabled={!action.isEnabled || !hasPlants || plantsNeedingCare === 0 || quickCareLoading === -1 || loading}
              title={
                loading ? 'Loading...' :
                quickCareLoading === -1 ? 'Logging care for multiple plants...' :
                !hasPlants ? 'Add plants to use quick care actions' :
                plantsNeedingCare === 0 ? 'No plants currently need this care' :
                `${action.description} for ${plantsNeedingCare} plants`
              }
            >
              {quickCareLoading === -1 ? (
                <>
                  <div className="text-lg mb-1">
                    <svg className="animate-spin h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <div className="text-sm">Logging...</div>
                </>
              ) : (
                <>
                  <div className="text-base sm:text-lg mb-1">{action.icon}</div>
                  <div className="text-xs sm:text-sm">{action.label}</div>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Care Tasks Tabs */}
      <div>
        <div className="flex space-x-1 mb-4 bg-white/50 p-1 rounded-xl border border-slate-200/70 backdrop-blur overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              disabled={loading}
              className={`
                flex-1 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap touch-manipulation min-w-fit
                ${selectedTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm border border-slate-200/70'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span className="sm:hidden">
                {tab.id === 'overdue' ? 'Overdue' :
                 tab.id === 'today' ? 'Today' :
                 tab.id === 'soon' ? 'Soon' : 'Recent'}
              </span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count > 0 && (
                <span className={`
                  ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium
                  ${selectedTab === tab.id
                    ? tab.id === 'overdue' ? 'bg-red-100 text-red-800' :
                      tab.id === 'today' ? 'bg-amber-100 text-amber-800' :
                      tab.id === 'soon' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Care Tasks List */}
        <div className="space-y-3">
          {activePlants.length === 0 ? (
            <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-white/50 backdrop-blur p-8 text-center">
              <div className="text-4xl mb-4">
                {selectedTab === 'overdue' ? '✅' :
                 selectedTab === 'today' ? '📅' :
                 selectedTab === 'soon' ? '⏰' : '🌱'}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {selectedTab === 'overdue' ? 'All caught up!' :
                 selectedTab === 'today' ? 'No care due today' :
                 selectedTab === 'soon' ? 'Nothing due soon' : 'No recent care logged'}
              </h3>
              <p className="text-gray-600">
                {selectedTab === 'overdue' ? 'Great job keeping up with your plant care!' :
                 selectedTab === 'today' ? 'Check back tomorrow for new care tasks.' :
                 selectedTab === 'soon' ? 'Your plants are well cared for.' : 'Start logging care to see your recent activity.'}
              </p>
            </div>
          ) : (
            activePlants.map((plant) => (
              <CareTaskCard
                key={plant.id}
                plant={plant}
                onQuickCare={handleQuickCare}
                showUrgency={selectedTab === 'overdue' || selectedTab === 'today'}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}