'use client';

import { useState, useEffect } from 'react';
import type { EnhancedCareHistory } from '@/lib/types/care-types';
import { careHelpers } from '@/lib/types/care-types';

interface CareHistoryTimelineProps {
  plantInstanceId: number;
  limit?: number;
  showPlantName?: boolean;
}

export default function CareHistoryTimeline({ 
  plantInstanceId, 
  limit = 10, 
  showPlantName = false 
}: CareHistoryTimelineProps) {
  const [careHistory, setCareHistory] = useState<EnhancedCareHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCareHistory();
  }, [plantInstanceId, limit]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCareHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/care/history/${plantInstanceId}?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to load care history');
      }
      const data = await response.json();
      setCareHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load care history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse flex space-x-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={loadCareHistory}
          className="mt-2 text-primary-600 hover:text-primary-700 text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  if (careHistory.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">📝</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Care History</h3>
        <p className="text-gray-600 text-sm">
          Start logging care activities to see your plant&apos;s care timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Care History</h3>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        <div className="space-y-6">
          {careHistory.map((care) => {
            const careTypeDisplay = careHelpers.getCareTypeDisplay(care.careType as 'fertilizer' | 'water' | 'repot' | 'prune' | 'inspect' | 'other');

            
            return (
              <div key={care.id} className="relative flex items-start space-x-4">
                {/* Timeline dot */}
                <div className={`
                  relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 bg-white
                  ${careTypeDisplay.color.includes('green') ? 'border-green-500' :
                    careTypeDisplay.color.includes('blue') ? 'border-blue-500' :
                    careTypeDisplay.color.includes('amber') ? 'border-amber-500' :
                    careTypeDisplay.color.includes('purple') ? 'border-purple-500' :
                    careTypeDisplay.color.includes('indigo') ? 'border-indigo-500' :
                    'border-gray-500'
                  }
                `}>
                  <span className="text-lg">{careTypeDisplay.icon}</span>
                </div>

                {/* Care event content */}
                <div className="flex-1 min-w-0 pb-6">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {careTypeDisplay.label}
                      {showPlantName && care.plantInstance && (
                        <span className="text-gray-500 ml-2">
                          • {care.plantInstance.nickname || care.plantInstance.plant?.commonName}
                        </span>
                      )}
                    </h4>
                    <time className="text-xs text-gray-500">
                      {care.formattedDate}
                    </time>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    {careTypeDisplay.description}
                  </p>

                  {/* Care details */}
                  <div className="space-y-1">
                    {care.fertilizerType && (
                      <p className="text-xs text-gray-500">
                        <span className="font-medium">Fertilizer:</span> {care.fertilizerType}
                      </p>
                    )}
                    {care.potSize && (
                      <p className="text-xs text-gray-500">
                        <span className="font-medium">Pot Size:</span> {care.potSize}
                      </p>
                    )}
                    {care.soilType && (
                      <p className="text-xs text-gray-500">
                        <span className="font-medium">Soil Type:</span> {care.soilType}
                      </p>
                    )}
                    {care.notes && (
                      <p className="text-xs text-gray-700 bg-gray-50 rounded p-2 mt-2">
                        {care.notes}
                      </p>
                    )}
                  </div>

                  {/* Images */}
                  {care.images && care.images.length > 0 && (
                    <div className="flex space-x-2 mt-3">
                      {care.images.slice(0, 3).map((image, imgIndex) => (
                        <img
                          key={imgIndex}
                          src={image}
                          alt={`Care photo ${imgIndex + 1}`}
                          className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                        />
                      ))}
                      {care.images.length > 3 && (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                          <span className="text-xs text-gray-500">+{care.images.length - 3}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Care timing indicator */}
                  <div className="flex items-center space-x-2 mt-2">
                    <div className={`
                      w-2 h-2 rounded-full
                      ${care.daysSinceCare <= 1 ? 'bg-green-400' :
                        care.daysSinceCare <= 7 ? 'bg-yellow-400' :
                        'bg-gray-400'
                      }
                    `}></div>
                    <span className="text-xs text-gray-500">
                      {care.daysSinceCare === 0 ? 'Today' :
                       care.daysSinceCare === 1 ? 'Yesterday' :
                       `${care.daysSinceCare} days ago`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {careHistory.length >= limit && (
        <div className="text-center pt-4 border-t border-gray-200">
          <button
            onClick={() => loadCareHistory()}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Load more history
          </button>
        </div>
      )}
    </div>
  );
}