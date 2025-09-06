'use client';

import { useState } from 'react';
import type { QuickCareAction } from '@/lib/types/care-types';

interface QuickCareActionsProps {
  actions: QuickCareAction[];
  onQuickCare: (plantInstanceId: number, careType: string) => Promise<void>;
}

export default function QuickCareActions({ actions, onQuickCare }: QuickCareActionsProps) {
  const [selectedPlants, setSelectedPlants] = useState<number[]>([]);
  const [showPlantSelector, setShowPlantSelector] = useState(false);
  const [selectedAction, setSelectedAction] = useState<QuickCareAction | null>(null);

  const handleActionClick = (action: QuickCareAction) => {
    setSelectedAction(action);
    setShowPlantSelector(true);
  };

  const handleBulkCare = async () => {
    if (!selectedAction || selectedPlants.length === 0) return;

    try {
      // For now, we'll just call the individual care function for each plant
      // In a real implementation, you might want to create a bulk API endpoint
      for (const plantId of selectedPlants) {
        await onQuickCare(plantId, selectedAction.careType);
      }
      
      // Reset state
      setSelectedPlants([]);
      setShowPlantSelector(false);
      setSelectedAction(null);
    } catch (error) {
      console.error('Error with bulk care:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Care Actions</h2>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            disabled={!action.isEnabled}
            className={`
              flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed transition-all
              ${action.isEnabled
                ? `${action.color} border-gray-300 hover:border-gray-400 hover:shadow-md`
                : 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
              }
            `}
          >
            <span className="text-2xl mb-2">{action.icon}</span>
            <span className="text-sm font-medium text-white">{action.label}</span>
            <span className="text-xs text-white opacity-90 text-center mt-1">
              {action.description}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">
          Tap an action to quickly log care for your plants
        </p>
      </div>

      {/* Plant Selector Modal - Simplified for now */}
      {showPlantSelector && selectedAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              Select Plants for {selectedAction.label}
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                {selectedAction.description}
              </p>
              
              {/* Placeholder for plant selection */}
              <div className="text-center py-8 text-gray-500">
                <p>Plant selection will be implemented</p>
                <p className="text-xs">when plant instances are available</p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowPlantSelector(false);
                  setSelectedAction(null);
                  setSelectedPlants([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkCare}
                disabled={selectedPlants.length === 0}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Apply Care ({selectedPlants.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}