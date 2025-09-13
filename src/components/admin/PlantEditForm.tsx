'use client';

import { useState, useEffect } from 'react';
import type { PlantWithDetails } from '@/lib/db/queries/admin-plants';

interface PlantEditFormProps {
  plant: PlantWithDetails;
  onSave: (updatedPlant: Partial<PlantWithDetails>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

interface TaxonomyOptions {
  families: string[];
  genera: string[];
  species: string[];
}

export default function PlantEditForm({
  plant,
  onSave,
  onCancel,
  isLoading,
}: PlantEditFormProps) {
  const [formData, setFormData] = useState({
    family: plant.family,
    genus: plant.genus,
    species: plant.species,
    cultivar: plant.cultivar || '',
    commonName: plant.commonName,
    careInstructions: plant.careInstructions || '',
  });
  
  const [taxonomyOptions, setTaxonomyOptions] = useState<TaxonomyOptions>({
    families: [],
    genera: [],
    species: [],
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load taxonomy options for autocomplete
  useEffect(() => {
    const loadTaxonomyOptions = async () => {
      try {
        const response = await fetch('/api/admin/plants/taxonomy-options');
        if (response.ok) {
          const options = await response.json();
          setTaxonomyOptions(options);
        }
      } catch (error) {
        console.error('Failed to load taxonomy options:', error);
      }
    };

    loadTaxonomyOptions();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.family.trim()) {
      newErrors.family = 'Family is required';
    }
    if (!formData.genus.trim()) {
      newErrors.genus = 'Genus is required';
    }
    if (!formData.species.trim()) {
      newErrors.species = 'Species is required';
    }
    if (!formData.commonName.trim()) {
      newErrors.commonName = 'Common name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const updatedData = {
      ...formData,
      cultivar: formData.cultivar.trim() || null,
      careInstructions: formData.careInstructions.trim() || null,
    };

    onSave(updatedData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getFilteredOptions = (options: string[], currentValue: string) => {
    if (!currentValue) return options.slice(0, 10);
    return options
      .filter(option => 
        option.toLowerCase().includes(currentValue.toLowerCase())
      )
      .slice(0, 10);
  };

  return (
    <form onSubmit={handleSubmit} className="plant-edit-form">
      <div className="form-section">
        <h4>Edit Plant Information</h4>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="family">Family *</label>
            <input
              id="family"
              type="text"
              value={formData.family}
              onChange={(e) => handleInputChange('family', e.target.value)}
              className={errors.family ? 'error' : ''}
              list="family-options"
              disabled={isLoading}
            />
            <datalist id="family-options">
              {getFilteredOptions(taxonomyOptions.families, formData.family).map(family => (
                <option key={family} value={family} />
              ))}
            </datalist>
            {errors.family && <span className="error-message">{errors.family}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="genus">Genus *</label>
            <input
              id="genus"
              type="text"
              value={formData.genus}
              onChange={(e) => handleInputChange('genus', e.target.value)}
              className={errors.genus ? 'error' : ''}
              list="genus-options"
              disabled={isLoading}
            />
            <datalist id="genus-options">
              {getFilteredOptions(taxonomyOptions.genera, formData.genus).map(genus => (
                <option key={genus} value={genus} />
              ))}
            </datalist>
            {errors.genus && <span className="error-message">{errors.genus}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="species">Species *</label>
            <input
              id="species"
              type="text"
              value={formData.species}
              onChange={(e) => handleInputChange('species', e.target.value)}
              className={errors.species ? 'error' : ''}
              list="species-options"
              disabled={isLoading}
            />
            <datalist id="species-options">
              {getFilteredOptions(taxonomyOptions.species, formData.species).map(species => (
                <option key={species} value={species} />
              ))}
            </datalist>
            {errors.species && <span className="error-message">{errors.species}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="cultivar">Cultivar</label>
            <input
              id="cultivar"
              type="text"
              value={formData.cultivar}
              onChange={(e) => handleInputChange('cultivar', e.target.value)}
              placeholder="Optional cultivar name"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="commonName">Common Name *</label>
          <input
            id="commonName"
            type="text"
            value={formData.commonName}
            onChange={(e) => handleInputChange('commonName', e.target.value)}
            className={errors.commonName ? 'error' : ''}
            disabled={isLoading}
          />
          {errors.commonName && <span className="error-message">{errors.commonName}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="careInstructions">Care Instructions</label>
          <textarea
            id="careInstructions"
            value={formData.careInstructions}
            onChange={(e) => handleInputChange('careInstructions', e.target.value)}
            rows={4}
            placeholder="Optional care instructions"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-success"
        >
          {isLoading ? 'Saving...' : '✓ Save & Approve'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="btn btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}