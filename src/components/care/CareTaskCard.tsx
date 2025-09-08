'use client';

import { useState } from 'react';
import type { EnhancedPlantInstance } from '@/lib/types/care-types';
import { careHelpers } from '@/lib/types/care-types';

interface CareTaskCardProps {
  plant: EnhancedPlantInstance;
  onQuickCare: (plantInstanceId: number, careType: string) => Promise<void>;
  showUrgency?: boolean;
}

export default function CareTaskCard({ plant, onQuickCare, showUrgency = false }: CareTaskCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleQuickCare = async (careType: string) => {
    setIsLoading(true);
    try {
      await onQuickCare(plant.id, careType);
    } finally {
      setIsLoading(false);
    }
  };

  const getCareStatusInfo = () => {
    switch (plant.careStatus) {
      case 'overdue':
        return {
          color: 'border-red-200 bg-red-50',
          textColor: 'text-red-800',
          urgencyColor: 'bg-red-500',
          message: `${Math.abs(plant.daysUntilFertilizerDue || 0)} days overdue`,
        };
      case 'due_today':
        return {
          color: 'border-amber-200 bg-amber-50',
          textColor: 'text-amber-800',
          urgencyColor: 'bg-amber-500',
          message: 'Due today',
        };
      case 'due_soon':
        return {
          color: 'border-yellow-200 bg-yellow-50',
          textColor: 'text-yellow-800',
          urgencyColor: 'bg-yellow-500',
          message: `Due in ${plant.daysUntilFertilizerDue} days`,
        };
      default:
        return {
          color: 'border-green-200 bg-green-50',
          textColor: 'text-green-800',
          urgencyColor: 'bg-green-500',
          message: 'Recently cared for',
        };
    }
  };

  const statusInfo = getCareStatusInfo();

  return (
    <div className={`rounded-lg border p-4 ${statusInfo.color} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {/* Plant Image */}
          <div className="w-12 h-12 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
            {plant.primaryImage ? (
              <img
                src={plant.primaryImage}
                alt={plant.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                🌱
              </div>
            )}
          </div>

          {/* Plant Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-medium text-gray-900 truncate">{plant.displayName}</h3>
              {showUrgency && (
                <div className={`w-2 h-2 rounded-full ${statusInfo.urgencyColor}`} />
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-1">{plant.plant.commonName}</p>
            <p className="text-sm text-gray-500">{plant.location}</p>
            
            <div className="flex items-center space-x-4 mt-2 text-xs">
              <span className={`font-medium ${statusInfo.textColor}`}>
                {statusInfo.message}
              </span>
              {plant.daysSinceLastFertilized !== null && (
                <span className="text-gray-500">
                  Last fertilized {plant.daysSinceLastFertilized} days ago
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-2 ml-4">
          <button
            onClick={() => handleQuickCare('fertilizer')}
            disabled={isLoading}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Quick fertilize"
          >
            {isLoading ? '...' : '🌱'}
          </button>
          
          <button
            onClick={() => handleQuickCare('water')}
            disabled={isLoading}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Quick water"
          >
            {isLoading ? '...' : '💧'}
          </button>
          
          <button
            onClick={() => handleQuickCare('inspect')}
            disabled={isLoading}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Quick inspect"
          >
            {isLoading ? '...' : '🔍'}
          </button>
        </div>
      </div>

      {/* Care Schedule Info */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Schedule: {careHelpers.parseFertilizerSchedule(plant.fertilizerSchedule)} days
          </span>
          {plant.fertilizerDue && (
            <span>
              Next due: {new Date(plant.fertilizerDue).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}