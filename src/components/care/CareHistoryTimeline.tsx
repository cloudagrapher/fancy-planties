'use client';

import { useState, useEffect } from 'react';
import type { EnhancedCareHistory } from '@/lib/types/care-types';
import type { EnhancedPlantInstance } from '@/lib/types/plant-instance-types';
import { careHelpers } from '@/lib/types/care-types';

interface CareHistoryTimelineProps {
  careHistory: EnhancedCareHistory[];
  plantInstance: EnhancedPlantInstance;
  limit?: number;
  showPlantName?: boolean;
}

export default function CareHistoryTimeline({ 
  careHistory,
  plantInstance,
  limit = 10, 
  showPlantName = false 
}: CareHistoryTimelineProps) {
  // Display limited history if limit is specified
  const displayHistory = limit ? careHistory.slice(0, limit) : careHistory;

  if (displayHistory.length === 0) {
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
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Care History</h3>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        <div className="space-y-6">
          {displayHistory.map((care) => {
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

      {careHistory.length > limit && (
        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Showing {displayHistory.length} of {careHistory.length} care events
          </p>
        </div>
      )}
    </div>
  );
}