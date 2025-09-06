'use client';

import { useState, useEffect } from 'react';
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
  averageDaysToEstablished: number;
}

interface PropagationDashboardProps {
  userId: number;
}

export default function PropagationDashboard({ userId }: PropagationDashboardProps) {
  const [propagations, setPropagations] = useState<PropagationWithDetails[]>([]);
  const [stats, setStats] = useState<PropagationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // Fetch propagations and stats
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch propagations
      const propResponse = await fetch('/api/propagations');
      if (!propResponse.ok) {
        throw new Error('Failed to fetch propagations');
      }
      const propData = await propResponse.json();
      setPropagations(propData);

      // Fetch stats
      const statsResponse = await fetch('/api/propagations/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load propagations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  // Status configuration
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
    planted: {
      label: 'Planted',
      icon: Clock,
      color: 'bg-purple-100 text-purple-800',
      description: 'Planted and establishing'
    },
    established: {
      label: 'Established',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-800',
      description: 'Successfully established'
    }
  };

  const handlePropagationUpdate = () => {
    fetchData(); // Refresh data after updates
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="max-w-4xl mx-auto px-4 py-6">
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
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-600 text-lg font-medium mb-2">Error Loading Propagations</div>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Propagations</h1>
            <p className="text-gray-600 mt-1">
              Track your plant propagation progress
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Propagation
          </button>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{stats.totalPropagations}</div>
              <div className="text-sm text-gray-600">Total Propagations</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-green-600">{stats.successRate}%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{stats.averageDaysToEstablished}</div>
              <div className="text-sm text-gray-600">Avg Days to Establish</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-purple-600">
                {stats.byStatus.started + stats.byStatus.rooting + stats.byStatus.planted}
              </div>
              <div className="text-sm text-gray-600">Active Propagations</div>
            </div>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedStatus(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedStatus === null
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
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
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
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
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
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
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
    </div>
  );
}