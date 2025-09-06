'use client';

import { useState, useEffect } from 'react';
import type { CareDashboardData } from '@/lib/types/care-types';
import CareTaskCard from './CareTaskCard';
import QuickCareActions from './QuickCareActions';
import CareStatistics from './CareStatistics';

interface CareDashboardProps {
  userId: number;
}

export default function CareDashboard({ userId }: CareDashboardProps) {
  const [dashboardData, setDashboardData] = useState<CareDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overdue' | 'today' | 'soon' | 'recent'>('overdue');

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/care/dashboard');
      if (!response.ok) {
        throw new Error('Failed to load care dashboard');
      }
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCare = async (plantInstanceId: number, careType: string) => {
    try {
      const response = await fetch('/api/care/quick-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plantInstanceId,
          careType,
          careDate: new Date(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to log care');
      }

      // Reload dashboard data
      await loadDashboardData();
    } catch (err) {
      console.error('Error logging quick care:', err);
      // You might want to show a toast notification here
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
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
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Care Dashboard</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={loadDashboardData}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Try Again
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Plant Care</h1>
        <p className="text-gray-600">Keep your plants healthy and thriving</p>
      </div>

      {/* Statistics */}
      <CareStatistics statistics={dashboardData.statistics} />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {dashboardData.quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleQuickCare(0, action.careType)} // TODO: Implement proper plant selection
            className={`p-3 rounded-lg text-white font-medium ${action.color} transition-colors`}
            disabled={!action.isEnabled}
          >
            <div className="text-lg mb-1">{action.icon}</div>
            <div className="text-sm">{action.label}</div>
          </button>
        ))}
      </div>

      {/* Care Tasks Tabs */}
      <div>
        <div className="flex space-x-1 mb-4 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`
                flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors relative
                ${selectedTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`
                  ml-2 px-2 py-0.5 rounded-full text-xs font-medium
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
            <div className="text-center py-8">
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