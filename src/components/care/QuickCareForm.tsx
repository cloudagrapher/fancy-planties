'use client';

import { useState } from 'react';
import type { CareType } from '@/lib/types/care-types';
import { careHelpers } from '@/lib/types/care-types';

interface QuickCareFormProps {
  plantInstanceId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultCareType?: CareType;
}

export default function QuickCareForm({ 
  plantInstanceId, 
  onSuccess, 
  onCancel,
  defaultCareType = 'fertilizer'
}: QuickCareFormProps) {
  const [formData, setFormData] = useState({
    plantInstanceId: plantInstanceId || 0,
    careType: defaultCareType,
    careDate: new Date().toISOString().split('T')[0], // Today's date
    notes: '',
    fertilizerType: '',
    potSize: '',
    soilType: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const careTypes: { value: CareType; label: string; icon: string }[] = [
    { value: 'fertilizer', label: 'Fertilizer', icon: '🌱' },
    { value: 'water', label: 'Water', icon: '💧' },
    { value: 'repot', label: 'Repot', icon: '🪴' },
    { value: 'prune', label: 'Prune', icon: '✂️' },
    { value: 'inspect', label: 'Inspect', icon: '🔍' },
    { value: 'other', label: 'Other', icon: '📝' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/care/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          careDate: new Date(formData.careDate),
          plantInstanceId: Number(formData.plantInstanceId),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to log care');
      }

      // Reset form
      setFormData({
        plantInstanceId: plantInstanceId || 0,
        careType: defaultCareType,
        careDate: new Date().toISOString().split('T')[0],
        notes: '',
        fertilizerType: '',
        potSize: '',
        soilType: '',
      });

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log care');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Care Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Care Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          {careTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleInputChange('careType', type.value)}
              className={`
                flex flex-col items-center p-3 rounded-lg border-2 transition-all
                ${formData.careType === type.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }
              `}
            >
              <span className="text-lg mb-1">{type.icon}</span>
              <span className="text-xs font-medium">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Care Date */}
      <div>
        <label htmlFor="careDate" className="block text-sm font-medium text-gray-700 mb-1">
          Care Date
        </label>
        <input
          type="date"
          id="careDate"
          value={formData.careDate}
          onChange={(e) => handleInputChange('careDate', e.target.value)}
          max={new Date().toISOString().split('T')[0]} // Can't be in the future
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          required
        />
      </div>

      {/* Conditional Fields */}
      {formData.careType === 'fertilizer' && (
        <div>
          <label htmlFor="fertilizerType" className="block text-sm font-medium text-gray-700 mb-1">
            Fertilizer Type (Optional)
          </label>
          <input
            type="text"
            id="fertilizerType"
            value={formData.fertilizerType}
            onChange={(e) => handleInputChange('fertilizerType', e.target.value)}
            placeholder="e.g., Liquid fertilizer, Slow-release pellets"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      )}

      {formData.careType === 'repot' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="potSize" className="block text-sm font-medium text-gray-700 mb-1">
              Pot Size (Optional)
            </label>
            <input
              type="text"
              id="potSize"
              value={formData.potSize}
              onChange={(e) => handleInputChange('potSize', e.target.value)}
              placeholder="e.g., 6 inch, 15cm"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label htmlFor="soilType" className="block text-sm font-medium text-gray-700 mb-1">
              Soil Type (Optional)
            </label>
            <input
              type="text"
              id="soilType"
              value={formData.soilType}
              onChange={(e) => handleInputChange('soilType', e.target.value)}
              placeholder="e.g., Potting mix, Cactus soil"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Any additional observations or notes..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
        />
      </div>

      {/* Plant Instance Selection (if not provided) */}
      {!plantInstanceId && (
        <div>
          <label htmlFor="plantInstanceId" className="block text-sm font-medium text-gray-700 mb-1">
            Plant
          </label>
          <select
            id="plantInstanceId"
            value={formData.plantInstanceId}
            onChange={(e) => handleInputChange('plantInstanceId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          >
            <option value="">Select a plant...</option>
            {/* Plant options will be populated dynamically */}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Plant selection will be implemented when plant instances are available
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !formData.plantInstanceId}
          className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Logging...' : 'Log Care'}
        </button>
      </div>

      {/* Care Type Description */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-sm text-gray-600">
          <span className="font-medium">
            {careTypes.find(t => t.value === formData.careType)?.icon} {careTypes.find(t => t.value === formData.careType)?.label}:
          </span>
          {' '}
          {careHelpers.getCareTypeDisplay(formData.careType).description}
        </p>
      </div>
    </form>
  );
}