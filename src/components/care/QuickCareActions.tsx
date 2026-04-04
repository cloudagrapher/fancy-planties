'use client';

import { useState } from 'react';
import type { QuickCareAction } from '@/lib/types/care-types';
import type { EnhancedPlantInstance } from '@/lib/types/plant-instance-types';
import { careHelpers } from '@/lib/types/care-types';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface QuickCareActionsProps {
  plantInstance: EnhancedPlantInstance;
  onCareAction: (careType: string, notes?: string) => void;
  isLoading?: boolean;
  /** Render a single-row compact layout for sticky footers */
  compact?: boolean;
}

export default function QuickCareActions({ 
  plantInstance, 
  onCareAction, 
  isLoading = false,
  compact = false,
}: QuickCareActionsProps) {
  const [selectedAction, setSelectedAction] = useState<QuickCareAction | null>(null);
  const [notes, setNotes] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);

  // Get default quick care actions
  const actions = careHelpers.getDefaultQuickCareActions();

  // Lock body scroll when notes modal is open (prevents background scroll on mobile)
  useScrollLock(showNotesModal);
  const focusTrapRef = useFocusTrap<HTMLDivElement>(showNotesModal);

  const closeModal = () => {
    if (!isLoading) {
      setShowNotesModal(false);
      setSelectedAction(null);
      setNotes('');
    }
  };

  useEscapeKey(closeModal, showNotesModal && !isLoading);

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
      <div className={compact ? "flex gap-2" : "grid grid-cols-2 sm:grid-cols-3 gap-3"}>
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            disabled={!action.isEnabled || isLoading}
            aria-label={`Log ${action.label} care`}
            className={compact
              ? `flex items-center justify-center gap-1.5 flex-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                  action.isEnabled && !isLoading
                    ? `${action.color} hover:shadow-md active:scale-95`
                    : 'bg-gray-100 cursor-not-allowed opacity-50'
                }`
              : `flex flex-col items-center justify-center p-4 rounded-lg transition-all min-h-[72px] ${
                  action.isEnabled && !isLoading
                    ? `${action.color} hover:shadow-md active:scale-95`
                    : 'bg-gray-100 cursor-not-allowed opacity-50'
                }`
            }
          >
            <span className={compact ? "text-base" : "text-2xl mb-2"} aria-hidden="true">{action.icon}</span>
            <span className={`font-medium text-white ${compact ? "text-xs" : "text-sm"}`}>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Notes Modal */}
      {showNotesModal && selectedAction && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-care-modal-title"
        >
          <div
            ref={focusTrapRef}
            className="bg-white rounded-lg max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="quick-care-modal-title" className="text-lg font-semibold mb-4">
              Log {selectedAction.label} for {plantInstance.displayName}
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                {selectedAction.description}
              </p>
              
              <label htmlFor="care-notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                id="care-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this care activity..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none text-base"
                rows={3}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:space-x-3 gap-2 sm:gap-0">
              <button
                onClick={closeModal}
                disabled={isLoading}
                className="btn btn--ghost min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCare}
                disabled={isLoading}
                className={`btn btn--primary min-h-[44px] ${isLoading ? 'btn--loading' : ''}`}
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
