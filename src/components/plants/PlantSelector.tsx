'use client';

import { useState } from 'react';
import PlantTaxonomySelector from './PlantTaxonomySelector';
import PlantTaxonomyForm from './PlantTaxonomyForm';
import type { PlantSuggestion } from '@/lib/validation/plant-schemas';
import type { CreatePlant } from '@/lib/validation/plant-schemas';

interface PlantSelectorProps {
  onPlantSelect: (plant: PlantSuggestion) => void;
  selectedPlant?: PlantSuggestion | null;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showQuickSelect?: boolean;
  autoFocus?: boolean;
}

type ViewMode = 'selector' | 'add-form';

export default function PlantSelector({
  onPlantSelect,
  selectedPlant,
  placeholder,
  disabled = false,
  className = '',
  showQuickSelect = true,
  autoFocus = false,
}: PlantSelectorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('selector');
  const [addFormQuery, setAddFormQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Handle plant selection from selector
  const handlePlantSelect = (plant: PlantSuggestion | null) => {
    if (plant) {
      onPlantSelect(plant);
    }
  };

  // Handle "add new" from selector
  const handleAddNew = (query: string) => {
    setAddFormQuery(query);
    setViewMode('add-form');
  };

  // Handle form submission
  const handleFormSubmit = async (plantData: CreatePlant) => {
    setIsCreating(true);
    
    try {
      const response = await fetch('/api/plants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(plantData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create plant');
      }

      const result = await response.json();
      const newPlant: PlantSuggestion = {
        id: result.data.id,
        family: result.data.family,
        genus: result.data.genus,
        species: result.data.species,
        commonName: result.data.commonName,
        isVerified: result.data.isVerified,
      };

      // Select the newly created plant
      onPlantSelect(newPlant);
      
      // Return to selector view
      setViewMode('selector');
      setAddFormQuery('');
    } catch (error) {
      console.error('Error creating plant:', error);
      // TODO: Show error toast/notification
    } finally {
      setIsCreating(false);
    }
  };

  // Handle form cancellation
  const handleFormCancel = () => {
    setViewMode('selector');
    setAddFormQuery('');
  };

  // Parse initial form data from query
  const getInitialFormData = (): Partial<CreatePlant> => {
    if (!addFormQuery) return {};

    // Try to parse common patterns
    const query = addFormQuery.trim();
    
    // If query looks like "Genus species" (scientific name)
    const scientificMatch = query.match(/^([A-Z][a-z]+)\s+([a-z]+)$/);
    if (scientificMatch) {
      return {
        genus: scientificMatch[1],
        species: scientificMatch[2],
        commonName: query,
      };
    }

    // Otherwise, use as common name
    return {
      commonName: query,
    };
  };

  if (viewMode === 'add-form') {
    return (
      <div className={className}>
        <PlantTaxonomyForm
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          initialData={getInitialFormData()}
          isLoading={isCreating}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <PlantTaxonomySelector
        onSelect={handlePlantSelect}
        onAddNew={handleAddNew}
        selectedPlant={selectedPlant}
        placeholder={placeholder}
        disabled={disabled}
        showQuickSelect={showQuickSelect}
        autoFocus={autoFocus}
      />
      
      {/* Selected Plant Display */}
      {selectedPlant && (
        <div className="mt-3 p-3 bg-primary-50 border border-primary-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-primary-900">
                  {selectedPlant.commonName}
                </span>
                {selectedPlant.isVerified && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                    ✓ Verified
                  </span>
                )}
              </div>
              <div className="text-xs text-primary-700 italic">
                {selectedPlant.genus} {selectedPlant.species}
              </div>
              <div className="text-xs text-primary-600">
                Family: {selectedPlant.family}
              </div>
            </div>
            
            <button
              onClick={() => handlePlantSelect(null)}
              className="flex-shrink-0 ml-2 p-1 text-primary-600 hover:text-primary-800 hover:bg-primary-100 rounded"
              title="Clear selection"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}