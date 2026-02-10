'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { Plus, TrendingUp, Clock, CheckCircle, Sprout } from 'lucide-react';
import PropagationCard from './PropagationCard';
import PropagationForm from './PropagationForm';
import type { Propagation, Plant, PlantInstance } from '@/lib/db/schema';

interface PropagationWithDetails extends Propagation {
  plant: Plant;
  parentInstance?: PlantInstance;
}

interface PropagationStats {
  totalPropagations: number;
  byStatus: Record<string, number>;
  successRate: number;
  averageDaysToReady: number;
}

export default function PropagationDashboard() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // Fetch propagations using React Query
  const {
    data: propagations = [],
    isLoading: propagationsLoading,
    error: propagationsError,
    refetch: refetchPropagations
  } = useQuery({
    queryKey: ['propagations'],
    queryFn: async (): Promise<PropagationWithDetails[]> => {
      const response = await apiFetch('/api/propagations');
      if (!response.ok) {
        throw new Error('Failed to fetch propagations');
      }
      return response.json();
    },
    staleTime: 1000 * 10, // 10 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch propagation stats using React Query  
  const {
    data: stats = null,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['propagations', 'stats'],
    queryFn: async (): Promise<PropagationStats> => {
      const response = await apiFetch('/api/propagations/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch propagation statistics');
      }
      return response.json();
    },
    staleTime: 1000 * 10, // 10 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  const loading = propagationsLoading || statsLoading;
  const error = propagationsError || statsError;

  // Group propagations by status
  const groupedPropagations = propagations.reduce((acc, prop) => {
    if (!acc[prop.status]) {
      acc[prop.status] = [];
    }
    acc[prop.status].push(prop);
    return acc;
  }, {} as Record<string, PropagationWithDetails[]>);

  // Filter propagations based on selected status
  const filteredPropagations = selectedStatus 
    ? groupedPropagations[selectedStatus] || []
    : propagations;

  // Status configuration - Updated enum values
  // Note: Status values changed from ['started', 'rooting', 'planted', 'established']
  //       to ['started', 'rooting', 'ready', 'planted']
  // 'established' was renamed to 'ready' to better reflect the propagation stage
  const statusConfig = {
    started: {
      label: 'Started',
      icon: Sprout,
      color: 'bg-blue-100 text-blue-800',
      description: 'Recently started propagations'
    },
    rooting: {
      label: 'Rooting',
      icon: TrendingUp,
      color: 'bg-yellow-100 text-yellow-800',
      description: 'Developing root systems'
    },
    ready: {  // Changed from 'established' to 'ready'
      label: 'Ready',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-800',
      description: 'Ready to be planted'
    },
    planted: {
      label: 'Planted',
      icon: Clock,
      color: 'bg-purple-100 text-purple-800',
      description: 'Planted and establishing'
    }
  };

  const handlePropagationUpdate = async () => {
    // Invalidate and refetch propagation data after updates
    await Promise.all([
      queryClient.invalidateQueries({ 
        queryKey: ['propagations'],
        refetchType: 'all'
      }),
      queryClient.invalidateQueries({ 
        queryKey: ['propagations', 'stats'],
        refetchType: 'all'
      })
    ]);
    setShowAddForm(false); // Close the form modal
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl shadow-sm border border-red-200/70 bg-red-50/70 backdrop-blur p-6 text-center">
        <div className="text-red-600 text-lg font-medium mb-2">Error Loading Propagations</div>
        <p className="text-red-600 mb-4">
          {error instanceof Error ? error.message : 'Failed to load propagations'}
        </p>
        <button
          onClick={() => {
            refetchPropagations();
            refetchStats();
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        {/* Mobile: Stacked layout */}
        <div className="flex flex-col gap-4 sm:hidden">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Propagations</h1>
            <p className="text-sm text-gray-600">
              Track your plant propagation progress
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center w-full px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-lg font-semibold text-base"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Propagation
          </button>
        </div>

        {/* Desktop: Horizontal layout */}
        <div className="hidden sm:flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Propagations</h1>
            <p className="text-gray-600">
              Track your plant propagation progress
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-md font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Propagation
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-emerald-50/70 backdrop-blur p-6">
            <div className="text-2xl font-bold text-emerald-600">{stats.totalPropagations}</div>
            <div className="text-sm text-emerald-700">Total Propagations</div>
          </div>
          <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-green-50/70 backdrop-blur p-6">
            <div className="text-2xl font-bold text-green-600">{stats.successRate}%</div>
            <div className="text-sm text-green-700">Success Rate</div>
          </div>
          <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-sky-50/70 backdrop-blur p-6">
            <div className="text-2xl font-bold text-sky-600">{stats.averageDaysToReady}</div>
            <div className="text-sm text-sky-700">Avg Days to Ready</div>
          </div>
          <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-amber-50/70 backdrop-blur p-6">
            <div className="text-2xl font-bold text-amber-600">
              {(stats.byStatus.started || 0) + (stats.byStatus.rooting || 0) + (stats.byStatus.planted || 0)}
            </div>
            <div className="text-sm text-amber-700">Active Propagations</div>
          </div>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedStatus(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedStatus === null
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-white/50 text-gray-700 hover:bg-white/70 border border-slate-200/70'
          }`}
        >
          All ({propagations.length})
        </button>
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = groupedPropagations[status]?.length || 0;
          const Icon = config.icon;
          
          return (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedStatus === status
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white/50 text-gray-700 hover:bg-white/70 border border-slate-200/70'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Propagations List */}
      {filteredPropagations.length > 0 ? (
        <div className="space-y-4">
          {filteredPropagations.map((propagation) => (
            <PropagationCard
              key={propagation.id}
              propagation={propagation}
              onUpdate={handlePropagationUpdate}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-white/50 backdrop-blur p-8 text-center">
          <div className="text-6xl mb-4">🌿</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {selectedStatus ? `No ${statusConfig[selectedStatus as keyof typeof statusConfig]?.label} Propagations` : 'No Propagations Yet'}
          </h2>
          <p className="text-gray-600 mb-6">
            {selectedStatus 
              ? `You don't have any propagations in the ${statusConfig[selectedStatus as keyof typeof statusConfig]?.label.toLowerCase()} stage.`
              : 'Start tracking your plant propagations to monitor their progress.'
            }
          </p>
          {!selectedStatus && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Start First Propagation
            </button>
          )}
        </div>
      )}

      {/* Add Propagation Modal */}
      {showAddForm && (
        <PropagationForm
          onClose={() => setShowAddForm(false)}
          onSuccess={handlePropagationUpdate}
        />
      )}
    </div>
  );
}