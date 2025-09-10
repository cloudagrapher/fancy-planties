'use client';

import { useState, useEffect } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';
import Image from 'next/image';
import PlantTaxonomySelector from '../plants/PlantTaxonomySelector';
import type { Propagation, Plant, PlantInstance } from '@/lib/db/schema';
import type { PlantSuggestion } from '@/lib/validation/plant-schemas';

interface PropagationWithDetails extends Propagation {
  plant: Plant;
  parentInstance?: PlantInstance;
}

interface PropagationFormProps {
  propagation?: PropagationWithDetails;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  plantId: number | null;
  parentInstanceId: number | null;
  nickname: string;
  location: string;
  dateStarted: string;
  status: 'started' | 'rooting' | 'planted' | 'established';
  sourceType: 'internal' | 'external';
  externalSource: 'gift' | 'trade' | 'purchase' | 'other' | null;
  externalSourceDetails: string;
  notes: string;
  images: string[];
}

export default function PropagationForm({ propagation, onClose, onSuccess }: PropagationFormProps) {
  const [formData, setFormData] = useState<FormData>({
    plantId: propagation?.plantId || null,
    parentInstanceId: propagation?.parentInstanceId || null,
    nickname: propagation?.nickname || '',
    location: propagation?.location || '',
    dateStarted: propagation?.dateStarted 
      ? new Date(propagation.dateStarted).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    status: propagation?.status || 'started',
    sourceType: (propagation as any)?.sourceType || 'internal',
    externalSource: (propagation as any)?.externalSource || null,
    externalSourceDetails: (propagation as any)?.externalSourceDetails || '',
    notes: propagation?.notes || '',
    images: propagation?.images || [],
  });

  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [parentInstances, setParentInstances] = useState<PlantInstance[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load plant data if editing
  useEffect(() => {
    if (propagation?.plant) {
      setSelectedPlant(propagation.plant);
    }
  }, [propagation]);

  // Load parent instances when plant is selected
  useEffect(() => {
    if (formData.plantId) {
      fetchParentInstances(formData.plantId);
    }
  }, [formData.plantId]);

  const fetchParentInstances = async (plantId: number) => {
    try {
      const response = await fetch(`/api/plant-instances?plantId=${plantId}&isActive=true`);
      if (response.ok) {
        const result = await response.json();
        // Extract instances from the API response structure
        const instances = result.instances || result || [];
        setParentInstances(instances);
      }
    } catch (error) {
      console.error('Error fetching parent instances:', error);
      setParentInstances([]);
    }
  };

  const handlePlantSelect = (plant: PlantSuggestion | null) => {
    if (plant) {
      // Convert PlantSuggestion to Plant for compatibility
      const plantData: Plant = {
        id: plant.id,
        family: plant.family,
        genus: plant.genus,
        species: plant.species,
        cultivar: plant.cultivar || null,
        commonName: plant.commonName,
        careInstructions: null,
        defaultImage: null,
        createdBy: null,
        isVerified: plant.isVerified,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setSelectedPlant(plantData);
      setFormData(prev => ({
        ...prev,
        plantId: plant.id,
        parentInstanceId: null, // Reset parent selection when plant changes
      }));
    } else {
      setSelectedPlant(null);
      setFormData(prev => ({
        ...prev,
        plantId: null,
        parentInstanceId: null,
      }));
    }
  };

  const handleAddNewPlant = (query: string) => {
    // For now, we'll just show an alert. In a full implementation,
    // this would open a plant creation form
    alert(`Add new plant functionality would be implemented here for: ${query}`);
  };

  const handleImageUpload = (imageData: string) => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, imageData],
    }));
  };

  const handleImageRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.plantId) {
      newErrors.plantId = 'Please select a plant type';
    }
    if (!formData.nickname.trim()) {
      newErrors.nickname = 'Nickname is required';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    if (!formData.dateStarted) {
      newErrors.dateStarted = 'Start date is required';
    }
    if (formData.sourceType === 'internal' && !formData.parentInstanceId) {
      newErrors.parentInstanceId = 'Parent plant is required for internal propagations';
    }
    if (formData.sourceType === 'external' && !formData.externalSource) {
      newErrors.externalSource = 'External source is required for external propagations';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const url = propagation 
        ? `/api/propagations/${propagation.id}`
        : '/api/propagations';
      
      const method = propagation ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          dateStarted: new Date(formData.dateStarted),
          // Ensure proper null values for unused fields
          parentInstanceId: formData.sourceType === 'internal' ? formData.parentInstanceId : null,
          externalSource: formData.sourceType === 'external' ? formData.externalSource : null,
          externalSourceDetails: formData.sourceType === 'external' ? formData.externalSourceDetails : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save propagation');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving propagation:', error);
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to save propagation'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="absolute inset-2 sm:inset-8 bg-white rounded-2xl shadow-xl flex flex-col border border-slate-200/70 max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {propagation ? 'Edit Propagation' : 'Add New Propagation'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Plant Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plant Type *
            </label>
            <PlantTaxonomySelector
              selectedPlant={selectedPlant ? {
                id: selectedPlant.id,
                family: selectedPlant.family,
                genus: selectedPlant.genus,
                species: selectedPlant.species,
                cultivar: selectedPlant.cultivar,
                commonName: selectedPlant.commonName,
                isVerified: selectedPlant.isVerified,
              } : null}
              onSelect={handlePlantSelect}
              onAddNew={handleAddNewPlant}
              placeholder="Search for plant type..."
            />
            {errors.plantId && (
              <p className="mt-1 text-sm text-red-600">{errors.plantId}</p>
            )}
          </div>

          {/* Source Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Propagation Source *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="sourceType"
                  value="internal"
                  checked={formData.sourceType === 'internal'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    sourceType: e.target.value as 'internal' | 'external',
                    parentInstanceId: null, // Reset selections when changing type
                    externalSource: null,
                    externalSourceDetails: '',
                  }))}
                  className="mr-2 text-primary-600"
                />
                <div>
                  <div className="font-medium text-gray-900 text-sm">From My Plants</div>
                  <div className="text-xs text-gray-500">Propagated from one of your existing plants</div>
                </div>
              </label>
              
              <label className="flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="sourceType"
                  value="external"
                  checked={formData.sourceType === 'external'}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    sourceType: e.target.value as 'internal' | 'external',
                    parentInstanceId: null, // Reset selections when changing type
                    externalSource: null,
                    externalSourceDetails: '',
                  }))}
                  className="mr-2 text-primary-600"
                />
                <div>
                  <div className="font-medium text-gray-900 text-sm">External Source</div>
                  <div className="text-xs text-gray-500">Gift, trade, purchase, or other source</div>
                </div>
              </label>
            </div>
          </div>

          {/* Parent Plant Instance - Only for Internal */}
          {formData.sourceType === 'internal' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent Plant *
              </label>
              {parentInstances.length > 0 ? (
                <select
                  value={formData.parentInstanceId || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    parentInstanceId: e.target.value ? parseInt(e.target.value) : null
                  }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.parentInstanceId ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select parent plant</option>
                  {parentInstances.map((instance) => (
                    <option key={instance.id} value={instance.id}>
                      {instance.nickname} - {instance.location}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    No existing plants of this type found. You'll need to add a plant instance first, or select "External Source" instead.
                  </p>
                </div>
              )}
              {errors.parentInstanceId && (
                <p className="mt-1 text-sm text-red-600">{errors.parentInstanceId}</p>
              )}
            </div>
          )}

          {/* External Source Details - Only for External */}
          {formData.sourceType === 'external' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source Type *
                </label>
                <select
                  value={formData.externalSource || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    externalSource: e.target.value as FormData['externalSource']
                  }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.externalSource ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select source type</option>
                  <option value="gift">Gift (received from someone)</option>
                  <option value="trade">Trade/Swap (exchanged with someone)</option>
                  <option value="purchase">Purchase (bought from store/online)</option>
                  <option value="other">Other</option>
                </select>
                {errors.externalSource && (
                  <p className="mt-1 text-sm text-red-600">{errors.externalSource}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source Details (Optional)
                </label>
                <textarea
                  value={formData.externalSourceDetails}
                  onChange={(e) => setFormData(prev => ({ ...prev, externalSourceDetails: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Gift from Sarah, Purchased at Home Depot, Trade with local plant group..."
                />
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nickname *
              </label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., Monstera Cutting #1"
              />
              {errors.nickname && (
                <p className="mt-1 text-sm text-red-600">{errors.nickname}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., Propagation Station, Kitchen Window"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">{errors.location}</p>
              )}
            </div>
          </div>

          {/* Date and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Started *
              </label>
              <input
                type="date"
                value={formData.dateStarted}
                onChange={(e) => setFormData(prev => ({ ...prev, dateStarted: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {errors.dateStarted && (
                <p className="mt-1 text-sm text-red-600">{errors.dateStarted}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  status: e.target.value as FormData['status']
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="started">Started</option>
                <option value="rooting">Rooting</option>
                <option value="planted">Planted</option>
                <option value="established">Established</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Add any notes about the propagation method, progress, or observations..."
            />
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Images
            </label>
            
            {/* Existing Images */}
            {formData.images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative group">
                    <Image
                      src={image}
                      alt={`Propagation image ${index + 1}`}
                      width={80}
                      height={80}
                      className="w-full h-16 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleImageRemove(index)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-2 h-2" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Image Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary-400 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target?.result) {
                        handleImageUpload(event.target.result as string);
                      }
                    };
                    reader.readAsDataURL(file);
                  });
                }}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                <p className="text-sm text-gray-600">
                  Click to upload images
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG up to 5MB each
                </p>
              </label>
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          </div>
          
          {/* Form Actions */}
          <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting 
                ? (propagation ? 'Updating...' : 'Creating...') 
                : (propagation ? 'Update Propagation' : 'Create Propagation')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}