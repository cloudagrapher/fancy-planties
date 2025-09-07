'use client';

import { useState } from 'react';
import type { CareType } from '@/lib/types/care-types';
import { careHelpers } from '@/lib/types/care-types';
import { useOffline } from '@/hooks/useOffline';
import { useServiceWorker } from '@/lib/utils/service-worker';

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
  const { isOnline, addPendingCareEntry } = useOffline();
  const { registerBackgroundSync } = useServiceWorker();
  
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
      if (isOnline) {
        // Online: Submit directly to API
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
      } else {
        // Offline: Add to pending queue
        const pendingId = addPendingCareEntry({
          plantInstanceId: Number(formData.plantInstanceId),
          careType: formData.careType as CareType,
          notes: formData.notes || undefined,
        });

        // Register for background sync
        registerBackgroundSync();

        console.log('Care entry queued for sync:', pendingId);
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

      {/* Offline Mode Indicator */}
      {!isOnline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-yellow-800 text-sm">
              <span className="font-medium">Offline Mode:</span> Care will be logged when you're back online.
            </p>
          </div>
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
              className={`btn ${formData.careType === type.value ? 'btn--primary' : 'btn--outline'} flex-col h-auto py-3`}
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
      <div className="form-actions">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn btn--outline btn--full"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !formData.plantInstanceId}
          className={`btn btn--primary btn--full ${isSubmitting ? 'btn--loading' : ''}`}
        >
          {isSubmitting ? 'Logging...' : isOnline ? 'Log Care' : 'Queue for Sync'}
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