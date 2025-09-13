'use client';

import { useState } from 'react';
import type { BulkOperationProgress } from '@/hooks/useBulkOperations';

export interface BulkAction {
  id: string;
  label: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'danger';
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export interface BulkOperationsToolbarProps {
  selectedCount: number;
  totalCount: number;
  actions: BulkAction[];
  progress: BulkOperationProgress | null;
  onAction: (actionId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onExport?: () => void;
}

export default function BulkOperationsToolbar({
  selectedCount,
  totalCount,
  actions,
  progress,
  onAction,
  onSelectAll,
  onClearSelection,
  onExport,
}: BulkOperationsToolbarProps) {
  const [confirmingAction, setConfirmingAction] = useState<string | null>(null);

  const handleActionClick = (action: BulkAction) => {
    if (action.requiresConfirmation) {
      setConfirmingAction(action.id);
    } else {
      onAction(action.id);
    }
  };

  const handleConfirmAction = () => {
    if (confirmingAction) {
      onAction(confirmingAction);
      setConfirmingAction(null);
    }
  };

  if (progress?.isRunning) {
    return (
      <div className="bulk-operations-progress">
        <div className="progress-header">
          <h3>Processing {progress.total} items...</h3>
          <div className="progress-stats">
            <span className="completed">✓ {progress.completed}</span>
            {progress.failed > 0 && (
              <span className="failed">✗ {progress.failed}</span>
            )}
          </div>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ 
              width: `${((progress.completed + progress.failed) / progress.total) * 100}%` 
            }}
          />
        </div>
        {progress.errors.length > 0 && (
          <div className="progress-errors">
            <details>
              <summary>{progress.errors.length} errors occurred</summary>
              <ul>
                {progress.errors.map((error, index) => (
                  <li key={index}>
                    Item {error.id}: {error.error}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>
    );
  }

  if (selectedCount === 0) {
    return (
      <div className="bulk-operations-empty">
        <button 
          onClick={onSelectAll}
          className="select-all-btn"
        >
          Select All ({totalCount})
        </button>
        {onExport && (
          <button 
            onClick={onExport}
            className="export-btn"
          >
            📊 Export All
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bulk-operations-toolbar">
      <div className="selection-info">
        <span className="selected-count">
          {selectedCount} selected
        </span>
        <button 
          onClick={onClearSelection}
          className="clear-selection-btn"
        >
          Clear
        </button>
      </div>

      <div className="bulk-actions">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            className={`bulk-action-btn ${action.variant}`}
            disabled={selectedCount === 0}
          >
            <span className="action-icon">{action.icon}</span>
            {action.label}
          </button>
        ))}
        
        {onExport && (
          <button 
            onClick={onExport}
            className="bulk-action-btn secondary"
          >
            📊 Export Selected
          </button>
        )}
      </div>

      {confirmingAction && (
        <div className="confirmation-modal">
          <div className="modal-content">
            <h3>Confirm Action</h3>
            <p>
              {actions.find(a => a.id === confirmingAction)?.confirmationMessage || 
               `Are you sure you want to perform this action on ${selectedCount} items?`}
            </p>
            <div className="modal-actions">
              <button 
                onClick={() => setConfirmingAction(null)}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmAction}
                className="confirm-btn danger"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}