'use client';

import { useState } from 'react';
import { createPlantSchema, type CreatePlant } from '@/lib/validation/plant-schemas';
import type { TaxonomyValidationResult } from '@/lib/types/plant-types';
import { apiFetch } from '@/lib/api-client';

interface PlantTaxonomyFormProps {
  onSubmit: (plant: CreatePlant) => void;
  onCancel: () => void;
  initialData?: Partial<CreatePlant>;
  isLoading?: boolean;
  className?: string;
}

interface FormState {
  family: string;
  genus: string;
  species: string;
  cultivar: string;
  commonName: string;
  careInstructions: string;
  errors: Record<string, string>;
  validation: TaxonomyValidationResult | null;
  isValidating: boolean;
}

export default function PlantTaxonomyForm({
  onSubmit,
  onCancel,
  initialData = {},
  isLoading = false,
  className = '',
}: PlantTaxonomyFormProps) {
  const [formState, setFormState] = useState<FormState>({
    family: initialData.family || '',
    genus: initialData.genus || '',
    species: initialData.species || '',
    cultivar: initialData.cultivar || '',
    commonName: initialData.commonName || '',
    careInstructions: initialData.careInstructions || '',
    errors: {},
    validation: null,
    isValidating: false,
  });

  // Validate form data
  const validateForm = () => {
    try {
      createPlantSchema.parse({
        family: formState.family,
        genus: formState.genus,
        species: formState.species,
        cultivar: formState.cultivar || undefined,
        commonName: formState.commonName,
        careInstructions: formState.careInstructions || undefined,
      });
      
      setFormState(prev => ({ ...prev, errors: {} }));
      return true;
    } catch (error: unknown) {
      const errors: Record<string, string> = {};
      
      if (error && typeof error === 'object' && 'errors' in error) {
        const zodError = error as { errors: Array<{ path: string[]; message: string }> };
        zodError.errors.forEach((err) => {
          if (err.path && err.path.length > 0) {
            errors[err.path[0]] = err.message;
          }
        });
      }
      
      setFormState(prev => ({ ...prev, errors }));
      return false;
    }
  };

  // Validate taxonomy for duplicates
  const validateTaxonomy = async () => {
    if (!formState.family || !formState.genus || !formState.species || !formState.commonName) {
      return;
    }

    setFormState(prev => ({ ...prev, isValidating: true }));

    try {
      const response = await apiFetch('/api/plants/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          family: formState.family,
          genus: formState.genus,
          species: formState.species,
          cultivar: formState.cultivar || undefined,
          commonName: formState.commonName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFormState(prev => ({ 
          ...prev, 
          validation: data.data,
          isValidating: false 
        }));
      }
    } catch (error) {
      console.error('Validation error:', error);
      setFormState(prev => ({ ...prev, isValidating: false }));
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof FormState, value: string) => {
    setFormState(prev => ({
      ...prev,
      [field]: value,
      errors: { ...prev.errors, [field]: '' }, // Clear field error
      validation: null, // Clear validation when data changes
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const plantData: CreatePlant = {
      family: formState.family,
      genus: formState.genus,
      species: formState.species,
      cultivar: formState.cultivar || undefined,
      commonName: formState.commonName,
      careInstructions: formState.careInstructions || undefined,
      isVerified: false, // New plants are not verified by default
    };

    onSubmit(plantData);
  };

  // Auto-validate taxonomy when key fields change
  const handleTaxonomyFieldChange = (field: keyof FormState, value: string) => {
    handleInputChange(field, value);
    
    // Debounce validation
    setTimeout(() => {
      validateTaxonomy();
    }, 500);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Add New Plant Type
        </h3>
        <p className="text-sm text-gray-600">
          Create a new plant taxonomy entry. All fields are required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Common Name */}
        <div>
          <label htmlFor="commonName" className="block text-sm font-medium text-gray-700 mb-1">
            Common Name *
          </label>
          <input
            id="commonName"
            type="text"
            value={formState.commonName}
            onChange={(e) => handleTaxonomyFieldChange('commonName', e.target.value)}
            placeholder="e.g., Monstera Deliciosa, Snake Plant"
            className={`
              w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300
              ${formState.errors.commonName ? 'border-red-300 focus:ring-red-300' : 'border-gray-300'}
            `}
          />
          {formState.errors.commonName && (
            <p className="mt-1 text-sm text-red-600">{formState.errors.commonName}</p>
          )}
        </div>

        {/* Scientific Name Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Family */}
          <div>
            <label htmlFor="family" className="block text-sm font-medium text-gray-700 mb-1">
              Family *
            </label>
            <input
              id="family"
              type="text"
              value={formState.family}
              onChange={(e) => handleTaxonomyFieldChange('family', e.target.value)}
              placeholder="e.g., Araceae"
              className={`
                w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300
                ${formState.errors.family ? 'border-red-300 focus:ring-red-300' : 'border-gray-300'}
              `}
            />
            {formState.errors.family && (
              <p className="mt-1 text-sm text-red-600">{formState.errors.family}</p>
            )}
          </div>

          {/* Genus */}
          <div>
            <label htmlFor="genus" className="block text-sm font-medium text-gray-700 mb-1">
              Genus *
            </label>
            <input
              id="genus"
              type="text"
              value={formState.genus}
              onChange={(e) => handleTaxonomyFieldChange('genus', e.target.value)}
              placeholder="e.g., Monstera"
              className={`
                w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300
                ${formState.errors.genus ? 'border-red-300 focus:ring-red-300' : 'border-gray-300'}
              `}
            />
            {formState.errors.genus && (
              <p className="mt-1 text-sm text-red-600">{formState.errors.genus}</p>
            )}
          </div>

          {/* Species */}
          <div>
            <label htmlFor="species" className="block text-sm font-medium text-gray-700 mb-1">
              Species *
            </label>
            <input
              id="species"
              type="text"
              value={formState.species}
              onChange={(e) => handleTaxonomyFieldChange('species', e.target.value)}
              placeholder="e.g., deliciosa"
              className={`
                w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300
                ${formState.errors.species ? 'border-red-300 focus:ring-red-300' : 'border-gray-300'}
              `}
            />
            {formState.errors.species && (
              <p className="mt-1 text-sm text-red-600">{formState.errors.species}</p>
            )}
          </div>
        </div>

        {/* Cultivar */}
        <div>
          <label htmlFor="cultivar" className="block text-sm font-medium text-gray-700 mb-1">
            Cultivar (Optional)
          </label>
          <input
            id="cultivar"
            type="text"
            value={formState.cultivar}
            onChange={(e) => handleTaxonomyFieldChange('cultivar', e.target.value)}
            placeholder="e.g., 'Thai Constellation', 'Variegata'"
            className={`
              w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300
              ${formState.errors.cultivar ? 'border-red-300 focus:ring-red-300' : 'border-gray-300'}
            `}
          />
          <p className="mt-1 text-xs text-gray-500">
            Specific cultivar or variety name (if applicable)
          </p>
          {formState.errors.cultivar && (
            <p className="mt-1 text-sm text-red-600">{formState.errors.cultivar}</p>
          )}
        </div>

        {/* Care Instructions */}
        <div>
          <label htmlFor="careInstructions" className="block text-sm font-medium text-gray-700 mb-1">
            Care Instructions (Optional)
          </label>
          <textarea
            id="careInstructions"
            value={formState.careInstructions}
            onChange={(e) => handleInputChange('careInstructions', e.target.value)}
            placeholder="Basic care instructions for this plant type..."
            rows={3}
            className={`
              w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300
              ${formState.errors.careInstructions ? 'border-red-300 focus:ring-red-300' : 'border-gray-300'}
            `}
          />
          {formState.errors.careInstructions && (
            <p className="mt-1 text-sm text-red-600">{formState.errors.careInstructions}</p>
          )}
        </div>

        {/* Validation Results */}
        {formState.isValidating && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="animate-spin h-4 w-4 border-2 border-primary-300 border-t-transparent rounded-full"></div>
            <span>Checking for duplicates...</span>
          </div>
        )}

        {formState.validation && (
          <div className="space-y-2">
            {/* Errors */}
            {formState.validation.errors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-red-800">Validation Errors</span>
                </div>
                <ul className="text-sm text-red-700 space-y-1">
                  {formState.validation.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {formState.validation.warnings.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-yellow-800">Warnings</span>
                </div>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {formState.validation.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Duplicates */}
            {formState.validation.duplicates.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-red-800">Existing Plants Found</span>
                </div>
                <div className="space-y-2">
                  {formState.validation.duplicates.map((duplicate) => (
                    <div key={duplicate.id} className="text-sm text-red-700 bg-white p-2 rounded border">
                      <div className="font-medium">{duplicate.commonName}</div>
                      <div className="text-xs italic">{duplicate.genus} {duplicate.species}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              isLoading || 
              formState.isValidating || 
              (formState.validation ? !formState.validation.isValid : false)
            }
            className="px-4 py-2 text-sm font-medium text-white bg-primary-400 border border-transparent rounded-md hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Creating...</span>
              </div>
            ) : (
              'Create Plant Type'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}