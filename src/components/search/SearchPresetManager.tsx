'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { 
  SearchPreset,
  EnhancedPlantInstanceFilter 
} from '@/lib/validation/plant-schemas';
import type { PlantInstanceSortField } from '@/lib/types/plant-instance-types';

interface SearchPresetManagerProps {
  currentFilters: EnhancedPlantInstanceFilter;
  currentSortBy: PlantInstanceSortField;
  currentSortOrder: 'asc' | 'desc';
  onPresetSelect: (presetId: string) => void;
  onPresetSave?: (preset: SearchPreset) => void;
}

export default function SearchPresetManager({
  currentFilters,
  currentSortBy,
  currentSortOrder,
  onPresetSelect,
  onPresetSave,
}: SearchPresetManagerProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch user's search presets
  const { data: presets, isLoading } = useQuery({
    queryKey: ['search-presets'],
    queryFn: async () => {
      const response = await fetch('/api/search/presets');
      if (!response.ok) throw new Error('Failed to fetch presets');
      const data = await response.json();
      return data.data.presets as SearchPreset[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Save preset mutation
  const savePresetMutation = useMutation({
    mutationFn: async (presetData: {
      name: string;
      description: string;
      filters: EnhancedPlantInstanceFilter;
      sortBy: PlantInstanceSortField;
      sortOrder: 'asc' | 'desc';
      isDefault: boolean;
    }) => {
      const response = await fetch('/api/search/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(presetData),
      });
      
      if (!response.ok) throw new Error('Failed to save preset');
      const data = await response.json();
      return data.data.preset as SearchPreset;
    },
    onSuccess: (preset) => {
      queryClient.invalidateQueries({ queryKey: ['search-presets'] });
      onPresetSave?.(preset);
      setShowSaveDialog(false);
      setPresetName('');
      setPresetDescription('');
      setIsDefault(false);
    },
  });

  // Handle preset save
  const handleSavePreset = () => {
    if (!presetName.trim()) return;

    savePresetMutation.mutate({
      name: presetName.trim(),
      description: presetDescription.trim(),
      filters: currentFilters,
      sortBy: currentSortBy,
      sortOrder: currentSortOrder,
      isDefault,
    });
  };

  // Handle preset selection
  const handlePresetSelect = (presetId: string) => {
    onPresetSelect(presetId);
  };

  // Check if current search can be saved (has meaningful filters)
  const canSaveCurrentSearch = () => {
    return !!(
      currentFilters.searchQuery ||
      currentFilters.location ||
      currentFilters.overdueOnly ||
      currentFilters.dueSoonDays ||
      currentFilters.isActive !== undefined
    );
  };

  return (
    <div className="space-y-4">
      {/* Preset List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">Saved Searches</h3>
          {canSaveCurrentSearch() && (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              Save Current Search
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 h-12 rounded-lg"></div>
            ))}
          </div>
        ) : presets && presets.length > 0 ? (
          <div className="space-y-2">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {preset.name}
                    </h4>
                    {preset.isDefault && (
                      <span className="px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  {preset.description && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {preset.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-400">
                      Sort: {preset.sortBy} ({preset.sortOrder})
                    </span>
                    {preset.filters.location && (
                      <span className="text-xs text-gray-400">
                        • Location: {preset.filters.location}
                      </span>
                    )}
                    {preset.filters.overdueOnly && (
                      <span className="text-xs text-red-600">
                        • Overdue only
                      </span>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => handlePresetSelect(preset.id!)}
                  className="ml-3 px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                  Apply
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <p className="text-sm">No saved searches yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Create a search with filters to save it
            </p>
          </div>
        )}
      </div>

      {/* Save Preset Dialog */}
      {showSaveDialog && (
        <div className="modal-overlay">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Save Search Preset
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preset Name *
                </label>
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="e.g., Overdue Plants in Living Room"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  maxLength={100}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  placeholder="Describe what this search is for..."
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  maxLength={500}
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="isDefault" className="text-sm text-gray-700">
                  Set as default search
                </label>
              </div>

              {/* Current Search Preview */}
              <div className="bg-gray-50 p-3 rounded-md">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Current Search Settings:
                </h4>
                <div className="text-xs text-gray-600 space-y-1">
                  {currentFilters.searchQuery && (
                    <div>Query: "{currentFilters.searchQuery}"</div>
                  )}
                  {currentFilters.location && (
                    <div>Location: {currentFilters.location}</div>
                  )}
                  {currentFilters.overdueOnly && (
                    <div>Filter: Overdue plants only</div>
                  )}
                  {currentFilters.dueSoonDays && (
                    <div>Filter: Due within {currentFilters.dueSoonDays} days</div>
                  )}
                  <div>Sort: {currentSortBy} ({currentSortOrder})</div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim() || savePresetMutation.isPending}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {savePresetMutation.isPending ? 'Saving...' : 'Save Preset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}