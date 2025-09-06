'use client';

import { useState } from 'react';
import type { QuickCareAction, CareType } from '@/lib/types/care-types';
import type { EnhancedPlantInstance } from '@/lib/types/plant-instance-types';
import { careHelpers } from '@/lib/types/care-types';

interface QuickCareActionsProps {
  plantInstance: EnhancedPlantInstance;
  onCareAction: (careType: string, notes?: string) => void;
  isLoading?: boolean;
}

export default function QuickCareActions({ 
  plantInstance, 
  onCareAction, 
  isLoading = false 
}: QuickCareActionsProps) {
  const [selectedAction, setSelectedAction] = useState<QuickCareAction | null>(null);
  const [notes, setNotes] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);

  // Get default quick care actions
  const actions = careHelpers.getDefaultQuickCareActions();

  const handleActionClick = (action: QuickCareAction) => {
    setSelectedAction(action);
    setShowNotesModal(true);
  };

  const handleSubmitCare = () => {
    if (!selectedAction) return;
    
    onCareAction(selectedAction.careType, notes || undefined);
    
    // Reset state
    setSelectedAction(null);
    setNotes('');
    setShowNotesModal(false);
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            disabled={!action.isEnabled || isLoading}
            className={`
              flex flex-col items-center justify-center p-4 rounded-lg transition-all
              ${action.isEnabled && !isLoading
                ? `${action.color} hover:shadow-md`
                : 'bg-gray-100 cursor-not-allowed opacity-50'
              }
            `}
          >
            <span className="text-2xl mb-2">{action.icon}</span>
            <span className="text-sm font-medium text-white">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Notes Modal */}
      {showNotesModal && selectedAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              Log {selectedAction.label} for {plantInstance.displayName}
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                {selectedAction.description}
              </p>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this care activity..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                rows={3}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setSelectedAction(null);
                  setNotes('');
                }}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCare}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Logging...' : `Log ${selectedAction.label}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}