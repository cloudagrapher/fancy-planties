'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import FertilizerCalendar from '@/components/calendar/FertilizerCalendar';
import type { DashboardStats } from '@/app/api/dashboard/route';

interface DashboardClientProps {
  user: {
    id: number;
    name: string;
    email: string;
    createdAt: string;
  };
}

export default function DashboardClient({ user }: DashboardClientProps) {
  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      return response.json() as Promise<DashboardStats>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const displayStats = stats || {
    totalPlants: 0,
    activePlants: 0,
    careDueToday: 0,
    totalPropagations: 0,
    activePropagations: 0,
    successfulPropagations: 0,
    propagationSuccessRate: 0
  };

  return (
    <div className="page">
      <div className="container">
        <div className="page-content">
          {/* Header */}
          <div className="flex-between" style={{ marginBottom: '24px' }}>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900" style={{ marginBottom: '4px' }}>
                Hey {user.name}! ✨
              </h1>
              <p className="text-neutral-600 text-sm">
                Your plants are looking great today
              </p>
            </div>
            <Link 
              href="/dashboard/profile"
              className="btn btn--ghost btn--sm text-neutral-600 flex items-center gap-2"
            >
              <span>👤</span>
              Profile
            </Link>
          </div>

          {/* Main Dashboard */}
          <div className="card card--dreamy">
            <div className="card-body">

              {/* Stats Grid */}
              <div className="stats-grid">
                <div className="stat-card card--mint">
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🌱</div>
                  <h3 className="text-lg font-semibold text-mint-900">Plants</h3>
                  <p className="text-mint-700 text-sm" style={{ marginBottom: '12px' }}>Manage your plant collection</p>
                  <div className="stat-value text-mint-600">
                    {isLoading ? '--' : displayStats.activePlants}
                  </div>
                  <div className="stat-label text-mint-600">
                    {displayStats.activePlants === 1 ? 'active plant' : 'active plants'}
                  </div>
                </div>

                <div className="stat-card card--salmon">
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💧</div>
                  <h3 className="text-lg font-semibold text-salmon-900">Care Tasks</h3>
                  <p className="text-salmon-700 text-sm" style={{ marginBottom: '12px' }}>Track care schedules</p>
                  <div className="stat-value text-salmon-600">
                    {isLoading ? '--' : displayStats.careDueToday}
                  </div>
                  <div className="stat-label text-salmon-600">due today</div>
                </div>

                <div className="stat-card card--lavender">
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🌿</div>
                  <h3 className="text-lg font-semibold text-lavender-900">Propagations</h3>
                  <p className="text-lavender-700 text-sm" style={{ marginBottom: '12px' }}>Monitor propagation progress</p>
                  <div className="stat-value text-lavender-600">
                    {isLoading ? '--' : displayStats.activePropagations}
                  </div>
                  <div className="stat-label text-lavender-600">active</div>
                </div>

                <div className="stat-card card--neutral">
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📊</div>
                  <h3 className="text-lg font-semibold text-neutral-900">Success Rate</h3>
                  <p className="text-neutral-700 text-sm" style={{ marginBottom: '12px' }}>Propagation success</p>
                  <div className="stat-value text-neutral-600">
                    {isLoading ? '--' : displayStats.propagationSuccessRate}
                  </div>
                  <div className="stat-label text-neutral-600">%</div>
                </div>
              </div>

              {/* Fertilizer Calendar */}
              <div className="section--sm">
                <FertilizerCalendar />
              </div>

              {/* Getting Started Card */}
              <div className="card card--flat" style={{ marginTop: '24px' }}>
                <div className="card-header">
                  <div className="flex-center" style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.5rem', marginRight: '8px' }}>🌟</span>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}