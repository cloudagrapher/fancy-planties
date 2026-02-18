'use client';

import { useState, memo, useMemo } from 'react';
import Image from 'next/image';
import S3Image from '@/components/shared/S3Image';
import type { EnhancedPlantInstance } from '@/lib/types/care-types';
import { careHelpers } from '@/lib/types/care-types';
import { shouldUnoptimizeImage } from '@/lib/image-loader';

interface CareActionButtonProps {
  careType: string;
  bgColor: string;
  hoverColor: string;
  icon: string;
  label: string;
  plantName: string;
  isLoading: boolean;
  onAction: (careType: string) => void;
}

function CareActionButton({ careType, bgColor, hoverColor, icon, label, plantName, isLoading, onAction }: CareActionButtonProps) {
  return (
    <button
      onClick={() => onAction(careType)}
      disabled={isLoading}
      className={`${bgColor} text-white rounded-md ${hoverColor} disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation
        flex-1 px-2 py-2 text-xs min-h-[36px] sm:flex-none sm:px-3 sm:py-1.5 sm:text-sm sm:min-h-0`}
      title={`Quick ${label.toLowerCase()}`}
      aria-label={`Quick ${label.toLowerCase()} ${plantName}`}
    >
      {isLoading ? (
        <span role="status" aria-label="Processing">...</span>
      ) : (
        <span aria-hidden="true">{icon}</span>
      )}
    </button>
  );
}

interface CareTaskCardProps {
  plant: EnhancedPlantInstance;
  onQuickCare: (plantInstanceId: number, careType: string) => Promise<void>;
  showUrgency?: boolean;
}

const CareTaskCard = memo(function CareTaskCard({ plant, onQuickCare, showUrgency = false }: CareTaskCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleQuickCare = async (careType: string) => {
    setIsLoading(true);
    try {
      await onQuickCare(plant.id, careType);
    } finally {
      setIsLoading(false);
    }
  };

  const statusInfo = useMemo(() => {
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
  }, [plant.careStatus, plant.daysUntilFertilizerDue]);

  return (
    <div className={`rounded-lg border p-3 sm:p-4 ${statusInfo.color} transition-all hover:shadow-md w-full max-w-full overflow-hidden`}>
      {/* Unified Layout — responsive via Tailwind breakpoints */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          {/* Plant Image */}
          <div className="w-12 h-12 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden relative">
            {plant.s3ImageKeys && plant.s3ImageKeys.length > 0 ? (
              <S3Image
                s3Key={plant.s3ImageKeys[0]}
                alt={plant.displayName}
                fill
                className="object-cover"
                thumbnailSize="tiny"
                sizes="48px"
              />
            ) : plant.primaryImage ? (
              <Image
                src={plant.primaryImage}
                alt={plant.displayName}
                fill
                className="object-cover"
                sizes="48px"
                unoptimized={plant.primaryImage.startsWith('data:') || shouldUnoptimizeImage(plant.primaryImage)}
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
              <h3 className="font-medium text-gray-900 truncate text-sm sm:text-base">{plant.displayName}</h3>
              {showUrgency && (
                <div className={`w-2 h-2 rounded-full ${statusInfo.urgencyColor} flex-shrink-0`} />
              )}
            </div>
            
            <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">{plant.plant.commonName}</p>
            <p className="hidden sm:block text-sm text-gray-500">{plant.location}</p>
            
            <div className="flex items-center gap-2 sm:gap-4 mt-0 sm:mt-2 text-xs">
              <span className={`font-medium ${statusInfo.textColor} truncate`}>
                {statusInfo.message}
              </span>
              {plant.daysSinceLastFertilized !== null && (
                <span className="hidden sm:inline text-gray-500">
                  Last fertilized {plant.daysSinceLastFertilized} days ago
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions — stacks horizontally, adapts sizing at sm */}
        <div className="flex gap-2 sm:ml-4 sm:flex-shrink-0">
          <CareActionButton careType="fertilizer" bgColor="bg-green-600" hoverColor="hover:bg-green-700" icon="🌱" label="Fertilize" plantName={plant.displayName} isLoading={isLoading} onAction={handleQuickCare} />
          <CareActionButton careType="water" bgColor="bg-blue-600" hoverColor="hover:bg-blue-700" icon="💧" label="Water" plantName={plant.displayName} isLoading={isLoading} onAction={handleQuickCare} />
          <CareActionButton careType="inspect" bgColor="bg-indigo-600" hoverColor="hover:bg-indigo-700" icon="🔍" label="Inspect" plantName={plant.displayName} isLoading={isLoading} onAction={handleQuickCare} />
        </div>
      </div>

      {/* Care Schedule Info */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-xs text-gray-500">
          <span className="truncate">
            Schedule: {careHelpers.parseFertilizerSchedule(plant.fertilizerSchedule)} days
          </span>
          {plant.fertilizerDue && (
            <span className="truncate sm:text-right">
              Next due: {new Date(plant.fertilizerDue).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export default CareTaskCard;