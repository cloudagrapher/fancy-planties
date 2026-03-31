'use client';

import { lazy, Suspense, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import LogoutButton from '@/components/auth/LogoutButton';
import { apiFetch, ApiError } from '@/lib/api-client';
import type { DashboardStats } from '@/app/api/dashboard/route';

// Lazy load calendar — only needed when user has fertilizer events
const FertilizerCalendar = lazy(() => import('@/components/calendar/FertilizerCalendar'));

interface DashboardClientProps {
  user: {
    id: number;
    name: string;
    email: string;
    createdAt: string;
  };
}

export default function DashboardClient({ user }: DashboardClientProps) {
  // Check curator status via useQuery for proper caching and deduplication
  const { data: curatorData } = useQuery({
    queryKey: ['curator-status'],
    queryFn: async () => {
      const response = await apiFetch('/api/auth/curator-status');
      if (!response.ok) return { isCurator: false };
      return response.json() as Promise<{ isCurator: boolean }>;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes — curator status rarely changes
  });

  const isCurator = curatorData?.isCurator ?? false;

  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await apiFetch('/api/dashboard');
      if (!response.ok) throw await ApiError.fromResponse(response, 'Failed to fetch dashboard stats');
      return response.json() as Promise<DashboardStats>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const displayStats = useMemo(() => stats || {
    totalPlants: 0,
    activePlants: 0,
    careDueToday: 0,
    overdueCount: 0,
    totalPropagations: 0,
    activePropagations: 0,
    successfulPropagations: 0,
    propagationSuccessRate: 0,
    fertilizerEvents: []
  }, [stats]);

  // Context-aware greeting based on plant care status
  const greeting = useMemo(() => {
    if (isLoading || !stats) return 'Loading your garden...';
    const { overdueCount, careDueToday, activePlants } = displayStats;
    if (overdueCount > 0) {
      return overdueCount === 1
        ? '1 plant needs attention — let\u2019s catch up!'
        : `${overdueCount} plants need attention — let\u2019s catch up!`;
    }
    if (careDueToday > 0) {
      return careDueToday === 1
        ? '1 plant is due for care today'
        : `${careDueToday} plants are due for care today`;
    }
    if (activePlants === 0) return 'Ready to start your plant journey?';
    return 'All caught up — your plants are thriving! ✨';
  }, [isLoading, stats, displayStats]);

  return (
    <div className="page">
      <div className="container">
        <div className="page-content">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-neutral-900 mb-1 truncate">
                Hey {user.name}! ✨
              </h1>
              <p className="text-neutral-600 text-sm">
                {greeting}
              </p>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {isCurator && (
                <Link 
                  href="/admin"
                  className="btn btn--ghost btn--sm text-neutral-600 flex items-center gap-1 sm:gap-2 relative"
                  title="Admin Dashboard"
                >
                  <span>⚙️</span>
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              <Link 
                href="/dashboard/profile"
                className="btn btn--ghost btn--sm text-neutral-600 flex items-center gap-1 sm:gap-2"
              >
                <span>👤</span>
                <span className="hidden sm:inline">Profile</span>
              </Link>
              <LogoutButton 
                className="btn btn--ghost btn--sm text-neutral-600"
              >
                Sign Out
              </LogoutButton>
            </div>
          </div>

          {/* Main Dashboard */}
          <div className="card card--dreamy">
            <div className="card-body">

              {/* Stats Grid */}
              <div className="dashboard-stats-grid">
                <Link href="/dashboard/plants" className="stat-card card--mint">
                  <div className="text-3xl mb-2">🌱</div>
                  <h3 className="text-lg font-semibold text-mint-900">Plants</h3>
                  <p className="text-mint-700 text-sm hidden sm:block">Manage your plant collection</p>
                  <div className="stat-value text-mint-600">
                    {isLoading ? '--' : displayStats.activePlants}
                  </div>
                  <div className="stat-label text-mint-600">
                    {displayStats.activePlants === 1 ? 'active plant' : 'active plants'}
                  </div>
                </Link>

                <Link href="/dashboard/care" className="stat-card card--salmon">
                  <div className="text-3xl mb-2">💧</div>
                  <h3 className="text-lg font-semibold text-salmon-900">Care Tasks</h3>
                  <p className="text-salmon-700 text-sm hidden sm:block">Track care schedules</p>
                  <div className="stat-value text-salmon-600">
                    {isLoading ? '--' : (displayStats.overdueCount || 0) + displayStats.careDueToday}
                  </div>
                  <div className="stat-label text-salmon-600">
                    {(displayStats.overdueCount || 0) > 0 
                      ? `${displayStats.overdueCount} overdue · ${displayStats.careDueToday} today`
                      : 'due today'
                    }
                  </div>
                </Link>

                <Link href="/dashboard/propagations" className="stat-card card--lavender">
                  <div className="text-3xl mb-2">🌿</div>
                  <h3 className="text-lg font-semibold text-lavender-900">Propagations</h3>
                  <p className="text-lavender-700 text-sm hidden sm:block">Monitor propagation progress</p>
                  <div className="stat-value text-lavender-600">
                    {isLoading ? '--' : displayStats.activePropagations}
                  </div>
                  <div className="stat-label text-lavender-600">active</div>
                </Link>

                <Link href="/dashboard/propagations" className="stat-card card--neutral">
                  <div className="text-3xl mb-2">📊</div>
                  <h3 className="text-lg font-semibold text-neutral-900">Success Rate</h3>
                  <p className="text-neutral-700 text-sm hidden sm:block">Propagation success</p>
                  <div className="stat-value text-neutral-600">
                    {isLoading ? '--' : displayStats.propagationSuccessRate}
                  </div>
                  <div className="stat-label text-neutral-600">%</div>
                </Link>
              </div>

              {/* Care Nudge — show when plants need attention */}
              {!isLoading && (displayStats.overdueCount > 0 || displayStats.careDueToday > 0) && (
                <Link
                  href="/dashboard/care"
                  className="block mt-6 p-4 rounded-2xl border transition-colors hover:shadow-md bg-gradient-to-r from-salmon-50 to-amber-50 border-salmon-200 hover:border-salmon-300"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl flex-shrink-0" role="img" aria-label="watering can">🚿</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900 text-sm">
                          {displayStats.overdueCount > 0
                            ? `${displayStats.overdueCount} overdue${displayStats.careDueToday > 0 ? ` + ${displayStats.careDueToday} due today` : ''}`
                            : `${displayStats.careDueToday} due today`}
                        </p>
                        <p className="text-xs text-neutral-600 mt-0.5">
                          Tap to open Care Tasks and log care
                        </p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              )}

              {/* Quick Links — always visible */}
              {!isLoading && displayStats.activePlants > 0 && (
                <div className="grid grid-cols-2 gap-3 mt-6">
                  <Link
                    href="/dashboard/handbook"
                    className="flex items-center gap-3 p-4 rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-teal-50 hover:shadow-md transition-shadow"
                  >
                    <span className="text-2xl flex-shrink-0">📖</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-emerald-900">Handbook</p>
                      <p className="text-xs text-emerald-700 mt-0.5">Care guides &amp; tips</p>
                    </div>
                  </Link>
                  <Link
                    href="/dashboard/plants"
                    className="flex items-center gap-3 p-4 rounded-2xl border border-mint-200/70 bg-gradient-to-br from-mint-50 to-emerald-50 hover:shadow-md transition-shadow"
                  >
                    <span className="text-2xl flex-shrink-0">🔍</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-mint-900">Browse Plants</p>
                      <p className="text-xs text-mint-700 mt-0.5">Search &amp; filter</p>
                    </div>
                  </Link>
                </div>
              )}

              {/* Calendar or Getting Started Card */}
              <div className="section--sm">
                {displayStats.fertilizerEvents.length > 0 ? (
                  <Suspense fallback={
                    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 animate-pulse h-64" />
                  }>
                    <FertilizerCalendar events={displayStats.fertilizerEvents} />
                  </Suspense>
                ) : (
                  <div className="card card--flat">
                    <div className="card-header">
                      <div className="flex-center mb-2">
                        <span className="text-2xl mr-2">🌟</span>
                        <h2 className="text-xl font-semibold text-neutral-900">Getting Started</h2>
                      </div>
                      <p className="text-neutral-600 text-sm text-center">Let&apos;s help you create your dream plant collection</p>
                    </div>
                    <div className="card-body">
                      <div className="space-y-4">
                        <div className="flex items-center text-neutral-700 step-mint">
                          <div className="step-number-mint">
                            <span className="text-mint-800 text-sm font-semibold">1</span>
                          </div>
                          <div>
                            <div className="font-medium text-neutral-900">Add your first plant</div>
                            <div className="text-sm text-neutral-600">Start tracking your collection</div>
                          </div>
                        </div>
                        <div className="flex items-center text-neutral-700 step-salmon">
                          <div className="step-number-salmon">
                            <span className="text-salmon-800 text-sm font-semibold">2</span>
                          </div>
                          <div>
                            <div className="font-medium text-neutral-900">Set up care schedules</div>
                            <div className="text-sm text-neutral-600">Never forget watering or fertilizing</div>
                          </div>
                        </div>
                        <div className="flex items-center text-neutral-700 step-lavender">
                          <div className="step-number-lavender">
                            <span className="text-lavender-800 text-sm font-semibold">3</span>
                          </div>
                          <div>
                            <div className="font-medium text-neutral-900">Track propagations</div>
                            <div className="text-sm text-neutral-600">Monitor your propagation success</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}