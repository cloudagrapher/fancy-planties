'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import type { EnhancedPlantInstance } from '@/lib/types/plant-instance-types';
import type { EnhancedCareHistory, CareTimelineEntry } from '@/lib/types/care-types';
import type { Propagation } from '@/lib/db/schema';
import { careHelpers } from '@/lib/types/care-types';
import { plantInstanceHelpers } from '@/lib/types/plant-instance-types';
import CareHistoryTimeline from '../care/CareHistoryTimeline';
import PlantNotes from './PlantNotes';
import PlantImageGallery from './PlantImageGallery';
import PlantLineage from './PlantLineage';
import QuickCareActions from '../care/QuickCareActions';
import { shouldUnoptimizeImage } from '@/lib/image-loader';
import { apiFetch } from '@/lib/api-client';

interface PlantDetailModalProps {
  plantId: number;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (plant: EnhancedPlantInstance) => void;
  onCareLog?: (plantId: number, careType: string) => void;
}

interface PlantDetailData {
  plant: EnhancedPlantInstance;
  careHistory: EnhancedCareHistory[];
  propagations: Propagation[];
  parentPlant?: EnhancedPlantInstance;
}

export default function PlantDetailModal({
  plantId,
  isOpen,
  onClose,
  onEdit,
  onCareLog,
}: PlantDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'care' | 'notes' | 'lineage'>('overview');
  const [isImageGalleryOpen, setIsImageGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const queryClient = useQueryClient();

  // Fetch plant detail data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['plant-detail', plantId],
    queryFn: async (): Promise<PlantDetailData> => {
      // Fetch plant details first (needed to determine parentInstanceId)
      const response = await apiFetch(`/api/plant-instances/${plantId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch plant details');
      }
      const plant = await response.json();

      // Fetch care history, propagations, and parent plant in parallel
      const [careHistory, propagations, parentPlant] = await Promise.all([
        apiFetch(`/api/care/history/${plantId}`)
          .then(r => r.ok ? r.json() : [])
          .catch(() => []),
        apiFetch(`/api/propagations?parentInstanceId=${plantId}`)
          .then(r => r.ok ? r.json() : [])
          .catch(() => []),
        plant.parentInstanceId
          ? apiFetch(`/api/plant-instances/${plant.parentInstanceId}`)
              .then(r => r.ok ? r.json() : undefined)
              .catch(() => undefined)
          : Promise.resolve(undefined),
      ]);

      return {
        plant,
        careHistory,
        propagations,
        parentPlant,
      };
    },
    enabled: isOpen && plantId > 0,
    staleTime: 1000 * 5, // 5 seconds (much more responsive to changes) 
    gcTime: 1000 * 60 * 2, // Keep cached data for 2 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Quick care mutation
  const quickCareMutation = useMutation({
    mutationFn: async ({ careType, notes }: { careType: string; notes?: string }) => {
      const response = await apiFetch('/api/care/quick-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantInstanceId: plantId,
          careType,
          careDate: new Date().toISOString(),
          notes,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to log care');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Refetch plant data and invalidate related queries
      refetch();
      queryClient.invalidateQueries({ queryKey: ['plant-instances'] });
      queryClient.invalidateQueries({ queryKey: ['care-dashboard'] });
    },
  });

  // Handle quick care action
  const handleQuickCare = (careType: string, notes?: string) => {
    quickCareMutation.mutate({ careType, notes });
    if (onCareLog) {
      onCareLog(plantId, careType);
    }
  };

  // Handle image click
  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setIsImageGalleryOpen(true);
  };

  // Handle edit
  const handleEdit = () => {
    if (data?.plant && onEdit) {
      onEdit(data.plant);
    }
  };

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content modal-content--large"
        onClick={(e) => e.stopPropagation()}
      >
          {isLoading ? (
            <PlantDetailSkeleton />
          ) : error ? (
            <PlantDetailError error={error} onRetry={() => refetch()} onClose={onClose} />
          ) : data ? (
            <>
              {/* Header */}
              <div className="modal-header">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={onClose}
                    className="modal-close"
                    aria-label="Close modal"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div>
                    <h2 className="modal-title">{data.plant.displayName}</h2>
                    <p className="text-sm text-gray-600 italic">
                      {data.plant.plant.genus} {data.plant.plant.species}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Care Status Badge */}
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${plantInstanceHelpers.getCareStatusColor(data.plant.careStatus)}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${plantInstanceHelpers.getCareUrgencyColor(data.plant.careUrgency)}`} />
                    {data.plant.careStatus === 'overdue' && 'Overdue'}
                    {data.plant.careStatus === 'due_today' && 'Due Today'}
                    {data.plant.careStatus === 'due_soon' && 'Due Soon'}
                    {data.plant.careStatus === 'healthy' && 'Healthy'}
                    {data.plant.careStatus === 'unknown' && 'No Schedule'}
                  </div>
                  
                  <button
                    onClick={handleEdit}
                    className="btn btn--icon btn--ghost"
                    aria-label="Edit plant"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="modal-tabs">
                {[
                  { id: 'overview', label: 'Overview', icon: '🌱' },
                  { id: 'care', label: 'Care History', icon: '💚' },
                  { id: 'notes', label: 'Notes', icon: '📝' },
                  { id: 'lineage', label: 'Lineage', icon: '🌿' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'overview' | 'care' | 'notes' | 'lineage')}
                    className={`tab ${activeTab === tab.id ? 'tab--active' : ''}`}
                  >
                    <span className="tab-emoji">{tab.icon}</span>
                    <span className="tab-label">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="modal-body modal-body--no-padding">
                <div className="overflow-auto max-h-96 sm:max-h-[60vh]">
                {activeTab === 'overview' && (
                  <PlantOverview 
                    plant={data.plant}
                    onImageClick={handleImageClick}
                    onQuickCare={handleQuickCare}
                    isLoading={quickCareMutation.isPending}
                  />
                )}
                
                {activeTab === 'care' && (
                  <CareHistoryTimeline 
                    careHistory={data.careHistory}
                    plantInstance={data.plant}
                  />
                )}
                
                {activeTab === 'notes' && (
                  <PlantNotes 
                    plantId={plantId}
                    initialNotes={data.plant.notes || ''}
                    onNotesUpdate={() => refetch()}
                  />
                )}
                
                {activeTab === 'lineage' && (
                  <PlantLineage 
                    plant={data.plant}
                    propagations={data.propagations}
                    parentPlant={data.parentPlant}
                  />
                )}
                </div>
              </div>
            </>
          ) : null}
      </div>

      {/* Image Gallery Modal */}
      {isImageGalleryOpen && data?.plant.images && (
        <PlantImageGallery
          images={data.plant.images}
          initialIndex={selectedImageIndex}
          plantName={data.plant.displayName}
          isOpen={isImageGalleryOpen}
          onClose={() => setIsImageGalleryOpen(false)}
        />
      )}
    </div>
  );
}

// Plant Overview Component
function PlantOverview({ 
  plant, 
  onImageClick, 
  onQuickCare, 
  isLoading 
}: { 
  plant: EnhancedPlantInstance;
  onImageClick: (index: number) => void;
  onQuickCare: (careType: string, notes?: string) => void;
  isLoading: boolean;
}) {
  return (
    <div className="p-6 space-y-6">
      {/* Plant Images */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Photos</h3>
        {plant.images && plant.images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {plant.images.slice(0, 6).map((image, index) => (
              <button
                key={index}
                onClick={() => onImageClick(index)}
                className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
              >
                <Image
                  src={image}
                  alt={`${plant.displayName} photo ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 33vw"
                  unoptimized={shouldUnoptimizeImage(image)}
                />
                {index === 0 && (
                  <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    Primary
                  </div>
                )}
              </button>
            ))}
            {plant.images.length > 6 && (
              <button
                onClick={() => onImageClick(6)}
                className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">+{plant.images.length - 6}</div>
                  <div className="text-xs">more</div>
                </div>
              </button>
            )}
          </div>
        ) : (
          <div className="aspect-video rounded-lg bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">📷</div>
              <p className="text-sm">No photos yet</p>
            </div>
          </div>
        )}
      </div>

      {/* Plant Information */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Plant Information</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Location</label>
              <p className="text-gray-900">{plant.location}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Family</label>
              <p className="text-gray-900">{plant.plant.family}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Common Name</label>
              <p className="text-gray-900">{plant.plant.commonName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Added</label>
              <p className="text-gray-900">
                {new Date(plant.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Care Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Care Schedule</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Fertilizer Schedule</label>
              <p className="text-gray-900 capitalize">{plant.fertilizerSchedule}</p>
            </div>
            {plant.lastFertilized && (
              <div>
                <label className="text-sm font-medium text-gray-700">Last Fertilized</label>
                <p className="text-gray-900">
                  {new Date(plant.lastFertilized).toLocaleDateString()}
                  <span className="text-sm text-gray-500 ml-2">
                    ({plant.daysSinceLastFertilized} days ago)
                  </span>
                </p>
              </div>
            )}
            {plant.fertilizerDue && (
              <div>
                <label className="text-sm font-medium text-gray-700">Next Fertilizer Due</label>
                <p className={`font-medium ${
                  plant.careStatus === 'overdue' ? 'text-red-600' :
                  plant.careStatus === 'due_today' ? 'text-amber-600' :
                  plant.careStatus === 'due_soon' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {new Date(plant.fertilizerDue).toLocaleDateString()}
                  {plant.daysUntilFertilizerDue !== null && (
                    <span className="text-sm ml-2">
                      ({plant.daysUntilFertilizerDue > 0 ? `in ${plant.daysUntilFertilizerDue} days` : 
                        plant.daysUntilFertilizerDue === 0 ? 'today' : 
                        `${Math.abs(plant.daysUntilFertilizerDue)} days overdue`})
                    </span>
                  )}
                </p>
              </div>
            )}
            {plant.lastRepot && (
              <div>
                <label className="text-sm font-medium text-gray-700">Last Repotted</label>
                <p className="text-gray-900">
                  {new Date(plant.lastRepot).toLocaleDateString()}
                  <span className="text-sm text-gray-500 ml-2">
                    ({plant.daysSinceLastRepot} days ago)
                  </span>
                </p>
              </div>
            )}
            {plant.lastFlush && (
              <div>
                <label className="text-sm font-medium text-gray-700">Last Flushed</label>
                <p className="text-gray-900">
                  {new Date(plant.lastFlush).toLocaleDateString()}
                  <span className="text-sm text-gray-500 ml-2">
                    ({plant.daysSinceLastFlush} days ago)
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Care Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        <QuickCareActions
          plantInstance={plant}
          onCareAction={onQuickCare}
          isLoading={isLoading}
        />
      </div>

      {/* Care Instructions */}
      {plant.plant.careInstructions && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Care Instructions</h3>
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <p className="text-gray-700 whitespace-pre-wrap">{plant.plant.careInstructions}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Loading skeleton
function PlantDetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full" />
          <div>
            <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
        </div>
        <div className="w-20 h-8 bg-gray-200 rounded-full" />
      </div>
      
      <div className="flex border-b border-gray-200">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 p-4">
            <div className="h-4 bg-gray-200 rounded w-16 mx-auto" />
          </div>
        ))}
      </div>
      
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square bg-gray-200 rounded-lg" />
          ))}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-32" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-20 mb-1" />
                  <div className="h-5 bg-gray-200 rounded w-full" />
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-32" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                  <div className="h-5 bg-gray-200 rounded w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Error component
function PlantDetailError({ 
  error, 
  onRetry, 
  onClose 
}: { 
  error: Error;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Error Loading Plant</h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          aria-label="Close error dialog"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button
          onClick={onRetry}
          className="btn btn--primary"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}