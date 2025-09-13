'use client';

import { useState } from 'react';
import type { PlantWithDetails } from '@/lib/db/queries/admin-plants';
import PlantReviewCard from './PlantReviewCard';

interface PlantApprovalQueueProps {
  pendingPlants: PlantWithDetails[];
  totalCount: number;
}

export default function PlantApprovalQueue({ 
  pendingPlants: initialPlants, 
  totalCount: initialCount 
}: PlantApprovalQueueProps) {
  const [plants, setPlants] = useState(initialPlants);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  const handlePlantProcessed = (plantId: number) => {
    // Remove the processed plant from the list
    setPlants(prev => prev.filter(p => p.id !== plantId));
    setTotalCount(prev => prev - 1);
    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(plantId);
      return newSet;
    });
  };

  const handleProcessingStart = (plantId: number) => {
    setProcessingIds(prev => new Set(prev).add(plantId));
  };

  const handleProcessingEnd = (plantId: number) => {
    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(plantId);
      return newSet;
    });
  };

  if (plants.length === 0) {
    return (
      <div className="admin-empty-state">
        <div className="admin-empty-icon">✅</div>
        <h3>All caught up!</h3>
        <p>No plants are currently pending approval.</p>
      </div>
    );
  }

  return (
    <div className="plant-approval-queue">
      <div className="approval-queue-header">
        <div className="approval-stats">
          <span className="approval-count">
            {totalCount} plant{totalCount !== 1 ? 's' : ''} pending
          </span>
          {processingIds.size > 0 && (
            <span className="processing-count">
              {processingIds.size} processing...
            </span>
          )}
        </div>
      </div>

      <div className="approval-queue-list">
        {plants.map((plant) => (
          <PlantReviewCard
            key={plant.id}
            plant={plant}
            isProcessing={processingIds.has(plant.id)}
            onProcessed={handlePlantProcessed}
            onProcessingStart={handleProcessingStart}
            onProcessingEnd={handleProcessingEnd}
          />
        ))}
      </div>
    </div>
  );
}