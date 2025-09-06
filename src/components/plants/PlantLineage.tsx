'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { EnhancedPlantInstance } from '@/lib/types/plant-instance-types';
import type { Propagation } from '@/lib/db/schema';

interface PlantLineageProps {
  plant: EnhancedPlantInstance;
  propagations: Propagation[];
  parentPlant?: EnhancedPlantInstance;
}

export default function PlantLineage({ plant, propagations, parentPlant }: PlantLineageProps) {
  const [selectedPropagation, setSelectedPropagation] = useState<Propagation | null>(null);

  // Get status color for propagation
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'started':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'rooting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'planted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'established':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'started':
        return '🌱';
      case 'rooting':
        return '🌿';
      case 'planted':
        return '🪴';
      case 'established':
        return '🌳';
      default:
        return '❓';
    }
  };

  // Calculate days since propagation started
  const getDaysSinceStarted = (dateStarted: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(dateStarted).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Parent Plant Section */}
      {parentPlant && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <span className="mr-2">👨‍👩‍👧‍👦</span>
            Parent Plant
          </h3>
          
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <div className="flex items-start space-x-4">
              {/* Parent plant image */}
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {parentPlant.primaryImage ? (
                  <Image
                    src={parentPlant.primaryImage}
                    alt={parentPlant.displayName}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    🌱
                  </div>
                )}
              </div>
              
              {/* Parent plant info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">{parentPlant.displayName}</h4>
                <p className="text-sm text-gray-600 italic">
                  {parentPlant.plant.genus} {parentPlant.plant.species}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  📍 {parentPlant.location}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  This plant was propagated from the parent plant
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Plant Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <span className="mr-2">🌱</span>
          Current Plant
        </h3>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-start space-x-4">
            {/* Current plant image */}
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              {plant.primaryImage ? (
                <Image
                  src={plant.primaryImage}
                  alt={plant.displayName}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  🌱
                </div>
              )}
            </div>
            
            {/* Current plant info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate">{plant.displayName}</h4>
              <p className="text-sm text-gray-600 italic">
                {plant.plant.genus} {plant.plant.species}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                📍 {plant.location}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Added {new Date(plant.createdAt).toLocaleDateString()} • 
                {getDaysSinceStarted(plant.createdAt)} days old
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Propagations Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <span className="mr-2">🌿</span>
          Propagations from this Plant
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({propagations.length})
          </span>
        </h3>
        
        {propagations.length > 0 ? (
          <div className="space-y-3">
            {propagations.map((propagation) => (
              <div
                key={propagation.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => setSelectedPropagation(
                  selectedPropagation?.id === propagation.id ? null : propagation
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Propagation image */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {propagation.images && propagation.images.length > 0 ? (
                        <Image
                          src={propagation.images[0]}
                          alt={propagation.nickname}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                          {getStatusIcon(propagation.status)}
                        </div>
                      )}
                    </div>
                    
                    {/* Propagation info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">{propagation.nickname}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(propagation.status)}`}>
                          {getStatusIcon(propagation.status)} {propagation.status}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-500">
                        📍 {propagation.location}
                      </p>
                      
                      <p className="text-xs text-gray-500 mt-1">
                        Started {new Date(propagation.dateStarted).toLocaleDateString()} • 
                        {getDaysSinceStarted(propagation.dateStarted)} days ago
                      </p>
                    </div>
                  </div>
                  
                  {/* Expand/collapse icon */}
                  <div className="ml-2 flex-shrink-0">
                    <svg 
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        selectedPropagation?.id === propagation.id ? 'rotate-180' : ''
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                {/* Expanded details */}
                {selectedPropagation?.id === propagation.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    {/* Progress timeline */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-700">Progress Timeline</h5>
                      <div className="flex items-center space-x-2">
                        {['started', 'rooting', 'planted', 'established'].map((status, index) => (
                          <div key={status} className="flex items-center">
                            <div className={`w-3 h-3 rounded-full border-2 ${
                              propagation.status === status || 
                              ['started', 'rooting', 'planted', 'established'].indexOf(propagation.status) > index
                                ? 'bg-primary-500 border-primary-500'
                                : 'bg-gray-200 border-gray-300'
                            }`} />
                            {index < 3 && (
                              <div className={`w-8 h-0.5 ${
                                ['started', 'rooting', 'planted', 'established'].indexOf(propagation.status) > index
                                  ? 'bg-primary-500'
                                  : 'bg-gray-200'
                              }`} />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Started</span>
                        <span>Rooting</span>
                        <span>Planted</span>
                        <span>Established</span>
                      </div>
                    </div>
                    
                    {/* Notes */}
                    {propagation.notes && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-1">Notes</h5>
                        <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                          {propagation.notes}
                        </p>
                      </div>
                    )}
                    
                    {/* Images */}
                    {propagation.images && propagation.images.length > 1 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Photos</h5>
                        <div className="flex space-x-2 overflow-x-auto">
                          {propagation.images.slice(1).map((image, index) => (
                            <div key={index} className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                              <Image
                                src={image}
                                alt={`${propagation.nickname} photo ${index + 2}`}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🌿</div>
            <p className="text-sm">No propagations yet</p>
            <p className="text-xs mt-1">
              Start propagating this plant to build your collection
            </p>
          </div>
        )}
      </div>

      {/* Lineage Summary */}
      {(parentPlant || propagations.length > 0) && (
        <div className="bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
            <span className="mr-2">📊</span>
            Lineage Summary
          </h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Generation:</span>
              <span className="ml-2 font-medium">
                {parentPlant ? '2nd (Propagation)' : '1st (Original)'}
              </span>
            </div>
            
            <div>
              <span className="text-gray-600">Offspring:</span>
              <span className="ml-2 font-medium">
                {propagations.length} propagation{propagations.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            {propagations.length > 0 && (
              <>
                <div>
                  <span className="text-gray-600">Success Rate:</span>
                  <span className="ml-2 font-medium">
                    {Math.round((propagations.filter(p => p.status === 'established').length / propagations.length) * 100)}%
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-600">Active Props:</span>
                  <span className="ml-2 font-medium">
                    {propagations.filter(p => p.status !== 'established').length}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}