'use client';

import { useState } from 'react';
import type { PlantWithDetails } from '@/lib/db/queries/admin-plants';
import PlantEditForm from './PlantEditForm';

interface PlantReviewCardProps {
  plant: PlantWithDetails;
  isProcessing: boolean;
  onProcessed: (plantId: number) => void;
  onProcessingStart: (plantId: number) => void;
  onProcessingEnd: (plantId: number) => void;
}

export default function PlantReviewCard({
  plant,
  isProcessing,
  onProcessed,
  onProcessingStart,
  onProcessingEnd,
}: PlantReviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = async () => {
    try {
      onProcessingStart(plant.id);
      
      const response = await fetch(`/api/admin/plants/${plant.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve plant');
      }

      onProcessed(plant.id);
    } catch (error) {
      console.error('Failed to approve plant:', error);
      alert(error instanceof Error ? error.message : 'Failed to approve plant');
      onProcessingEnd(plant.id);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      onProcessingStart(plant.id);
      
      const response = await fetch(`/api/admin/plants/${plant.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject plant');
      }

      onProcessed(plant.id);
      setShowRejectDialog(false);
      setRejectReason('');
    } catch (error) {
      console.error('Failed to reject plant:', error);
      alert(error instanceof Error ? error.message : 'Failed to reject plant');
      onProcessingEnd(plant.id);
    }
  };

  const handleEditSave = async (updatedPlant: Partial<PlantWithDetails>) => {
    try {
      onProcessingStart(plant.id);
      
      const response = await fetch(`/api/admin/plants/${plant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPlant),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update plant');
      }

      setIsEditing(false);
      onProcessingEnd(plant.id);
    } catch (error) {
      console.error('Failed to update plant:', error);
      alert(error instanceof Error ? error.message : 'Failed to update plant');
      onProcessingEnd(plant.id);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`plant-review-card ${isProcessing ? 'processing' : ''}`}>
      <div className="plant-review-header">
        <div className="plant-info">
          <h3 className="plant-name">{plant.commonName}</h3>
          <div className="plant-taxonomy">
            <span className="taxonomy-part">{plant.family}</span>
            <span className="taxonomy-separator">→</span>
            <span className="taxonomy-part">{plant.genus}</span>
            <span className="taxonomy-separator">→</span>
            <span className="taxonomy-part">{plant.species}</span>
            {plant.cultivar && (
              <>
                <span className="taxonomy-separator">→</span>
                <span className="taxonomy-part cultivar">'{plant.cultivar}'</span>
              </>
            )}
          </div>
        </div>
        
        <div className="plant-meta">
          <div className="submission-info">
            <span className="submitted-by">
              Submitted by: {plant.createdByName || 'Unknown'}
            </span>
            <span className="submitted-date">
              {formatDate(plant.createdAt)}
            </span>
          </div>
          
          <div className="usage-stats">
            <span className="stat">
              {plant.instanceCount} instance{plant.instanceCount !== 1 ? 's' : ''}
            </span>
            <span className="stat">
              {plant.propagationCount} propagation{plant.propagationCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {plant.careInstructions && (
        <div className="plant-care-instructions">
          <h4>Care Instructions</h4>
          <p>{plant.careInstructions}</p>
        </div>
      )}

      {isEditing ? (
        <PlantEditForm
          plant={plant}
          onSave={handleEditSave}
          onCancel={() => setIsEditing(false)}
          isLoading={isProcessing}
        />
      ) : (
        <div className="plant-review-actions">
          <div className="primary-actions">
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="btn btn-success"
            >
              {isProcessing ? 'Processing...' : '✓ Approve'}
            </button>
            
            <button
              onClick={() => setIsEditing(true)}
              disabled={isProcessing}
              className="btn btn-secondary"
            >
              ✏️ Edit & Approve
            </button>
            
            <button
              onClick={() => setShowRejectDialog(true)}
              disabled={isProcessing}
              className="btn btn-danger"
            >
              ✗ Reject
            </button>
          </div>
        </div>
      )}

      {showRejectDialog && (
        <div className="reject-dialog">
          <div className="reject-dialog-content">
            <h4>Reject Plant Submission</h4>
            <p>Please provide a reason for rejecting this plant:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (e.g., duplicate entry, incorrect taxonomy, insufficient information...)"
              rows={3}
              className="reject-reason-input"
            />
            <div className="reject-dialog-actions">
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || isProcessing}
                className="btn btn-danger"
              >
                {isProcessing ? 'Processing...' : 'Confirm Rejection'}
              </button>
              <button
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectReason('');
                }}
                disabled={isProcessing}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}