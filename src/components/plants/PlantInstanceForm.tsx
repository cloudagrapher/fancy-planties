'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PlantTaxonomySelector from './PlantTaxonomySelector';
import ImageUpload from '../shared/ImageUpload';
import type { EnhancedPlantInstance } from '@/lib/types/plant-instance-types';
import type { PlantSuggestion } from '@/lib/validation/plant-schemas';

// Form validation schemas
const plantTaxonomySchema = z.object({
  family: z.string().min(1, 'Family is required').max(100, 'Family must be less than 100 characters'),
  genus: z.string().min(1, 'Genus is required').max(100, 'Genus must be less than 100 characters'),
  species: z.string().min(1, 'Species is required').max(100, 'Species must be less than 100 characters'),
  cultivar: z.string().max(100, 'Cultivar must be less than 100 characters').optional().transform(val => val?.trim() || ''),
  commonName: z.string().min(1, 'Common name is required').max(100, 'Common name must be less than 100 characters'),
});

const plantInstanceFormSchema = z.object({
  plantId: z.number().min(1, 'Please select a plant type'),
  nickname: z.string()
    .min(1, 'Nickname is required')
    .max(100, 'Nickname must be less than 100 characters')
    .trim()
    .refine(val => val.length > 0, 'Nickname cannot be empty'),
  location: z.string()
    .min(1, 'Location is required')
    .max(100, 'Location must be less than 100 characters')
    .trim()
    .refine(val => val.length > 0, 'Location cannot be empty'),
  fertilizerSchedule: z.enum([
    'weekly', 
    'biweekly', 
    'every_2_4_weeks',
    'every_3_4_weeks', 
    'every_4_weeks',
    'every_4_6_weeks',
    'every_6_8_weeks',
    'bimonthly', 
    'quarterly'
  ], {
    message: 'Please select a fertilizer schedule'
  }),
  lastFertilized: z.string()
    .optional()
    .refine(val => !val || !isNaN(Date.parse(val)), 'Invalid date format'),
  lastRepot: z.string()
    .optional()
    .refine(val => !val || !isNaN(Date.parse(val)), 'Invalid date format'),
  notes: z.string()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional()
    .transform(val => val?.trim() || ''),
  images: z.array(z.string()).max(10, 'Maximum 10 images allowed').optional(),
  isActive: z.boolean().default(true).optional(),
  // New taxonomy fields (only used when creating new plant)
  newPlantTaxonomy: plantTaxonomySchema.optional(),
}).refine(data => {
  // Custom validation: lastFertilized cannot be in the future
  if (data.lastFertilized) {
    const fertilizerDate = new Date(data.lastFertilized);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    return fertilizerDate <= today;
  }
  return true;
}, {
  message: 'Last fertilized date cannot be in the future',
  path: ['lastFertilized']
}).refine(data => {
  // Custom validation: lastRepot cannot be in the future
  if (data.lastRepot) {
    const repotDate = new Date(data.lastRepot);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    return repotDate <= today;
  }
  return true;
}, {
  message: 'Last repot date cannot be in the future',
  path: ['lastRepot']
});

type PlantInstanceFormData = z.infer<typeof plantInstanceFormSchema>;
type PlantTaxonomyFormData = z.infer<typeof plantTaxonomySchema>;

interface PlantInstanceFormProps {
  plantInstance?: EnhancedPlantInstance;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (plantInstance: EnhancedPlantInstance) => void;
  userId: number;
}

export default function PlantInstanceForm({
  plantInstance,
  isOpen,
  onClose,
  onSuccess,
  userId,
}: PlantInstanceFormProps) {
  const [selectedPlant, setSelectedPlant] = useState<PlantSuggestion | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [isCreatingPlant, setIsCreatingPlant] = useState(false);
  const [showTaxonomyForm, setShowTaxonomyForm] = useState(false);
  const [taxonomyData, setTaxonomyData] = useState<PlantTaxonomyFormData>({
    family: '',
    genus: '',
    species: '',
    cultivar: '',
    commonName: '',
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [newNoteInput, setNewNoteInput] = useState('');
  const queryClient = useQueryClient();
  const isEditing = !!plantInstance;

  // Form setup
  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
    setValue,
    watch,
    trigger,
  } = useForm({
    resolver: zodResolver(plantInstanceFormSchema),
    mode: 'onChange',
    defaultValues: {
      plantId: 1, // Default to 1 to pass validation, will be overridden during initialization
      nickname: '',
      location: '',
      fertilizerSchedule: 'every_4_weeks' as const,
      lastFertilized: '',
      lastRepot: '',
      notes: '',
      images: [],
      isActive: true,
      newPlantTaxonomy: undefined,
    },
  });

  // Fetch user locations for autocomplete
  const { data: userLocations } = useQuery({
    queryKey: ['user-locations', userId],
    queryFn: async () => {
      const response = await fetch(`/api/plant-instances/locations?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch locations');
      return response.json() as Promise<string[]>;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Handle showing taxonomy form for new plant creation
  const handleShowTaxonomyForm = (query: string) => {
    setShowTaxonomyForm(true);
    setTaxonomyData({
      family: '',
      genus: '',
      species: '',
      cultivar: '',
      commonName: query || '',
    });
  };

  // Handle taxonomy form submission
  const handleTaxonomySubmit = (data: PlantTaxonomyFormData) => {
    setIsCreatingPlant(true);
    createPlantMutation.mutate({
      ...data,
      cultivar: data.cultivar || null,
    });
  };

  // Handle canceling taxonomy form
  const handleCancelTaxonomyForm = () => {
    setShowTaxonomyForm(false);
    setTaxonomyData({
      family: '',
      genus: '',
      species: '',
      cultivar: '',
      commonName: '',
    });
  };

  // Create new plant mutation
  const createPlantMutation = useMutation({
    mutationFn: async (plantData: any) => {
      const response = await fetch('/api/plants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(plantData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create plant');
      }

      return response.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ 
        queryKey: ['plants'],
        refetchType: 'active'
      });
      queryClient.removeQueries({ queryKey: ['plants'] });
      await queryClient.refetchQueries({ queryKey: ['plants'] });
      
      // Set the newly created plant as selected
      const newPlant: PlantSuggestion = {
        id: data.data.id,
        family: data.data.family,
        genus: data.data.genus,
        species: data.data.species,
        cultivar: data.data.cultivar,
        commonName: data.data.commonName,
        isVerified: data.data.isVerified,
      };
      
      handlePlantSelect(newPlant);
      setIsCreatingPlant(false);
      setShowTaxonomyForm(false);
    },
    onError: (error) => {
      console.error('Failed to create plant:', error);
      setIsCreatingPlant(false);
      setShowTaxonomyForm(false);
    },
  });

  // Create/update mutation
  const mutation = useMutation({
    mutationFn: async (data: PlantInstanceFormData & { fertilizerSchedule: string }) => {
      const formData = new FormData();
      
      // Add form fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          if (key === 'images' && Array.isArray(value)) {
            // Handle existing images
            value.forEach((image, index) => {
              formData.append(`existingImages[${index}]`, image);
            });
          } else {
            formData.append(key, String(value));
          }
        }
      });

      // Add new image files
      imageFiles.forEach((file, index) => {
        formData.append(`imageFiles[${index}]`, file);
      });

      const url = isEditing 
        ? `/api/plant-instances/${plantInstance.id}`
        : '/api/plant-instances';
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('API Error Response:', error);
        throw new Error(error.message || 'Failed to save plant instance');
      }

      return response.json();
    },
    onSuccess: async (data) => {
      // Triple invalidation approach for aggressive cache clearing
      const queryKeysToInvalidate = [
        ['plant-instances', userId],
        ['plant-detail'],
        ['care-dashboard', userId],
        ['plants']
      ];

      for (const queryKey of queryKeysToInvalidate) {
        await queryClient.invalidateQueries({ 
          queryKey,
          refetchType: 'active'
        });
        queryClient.removeQueries({ queryKey });
        await queryClient.refetchQueries({ queryKey });
      }
      
      // Reset form state
      reset();
      setImageFiles([]);
      setExistingImages([]);
      setSelectedPlant(null);
      setShowTaxonomyForm(false);
      setHasUnsavedChanges(false);
      
      if (onSuccess) {
        onSuccess(data);
      } else {
        // Only call onClose if no onSuccess callback provided
        onClose();
      }
    },
  });

  // Initialize form when editing
  useEffect(() => {
    if (isEditing && plantInstance) {
      const convertedSchedule = convertDatabaseScheduleToForm(plantInstance.fertilizerSchedule);
      console.log('Setting form with fertilizer schedule:', convertedSchedule);
      reset({
        plantId: plantInstance.plantId,
        nickname: plantInstance.nickname,
        location: plantInstance.location,
        fertilizerSchedule: convertedSchedule as any,
        lastFertilized: plantInstance.lastFertilized 
          ? new Date(plantInstance.lastFertilized).toISOString().split('T')[0]
          : '',
        lastRepot: plantInstance.lastRepot 
          ? new Date(plantInstance.lastRepot).toISOString().split('T')[0]
          : '',
        notes: plantInstance.notes || '',
        images: plantInstance.images || [],
        isActive: plantInstance.isActive,
      });

      setSelectedPlant({
        id: plantInstance.plant.id,
        family: plantInstance.plant.family,
        genus: plantInstance.plant.genus,
        species: plantInstance.plant.species,
        commonName: plantInstance.plant.commonName,
        isVerified: plantInstance.plant.isVerified,
      });

      setExistingImages(plantInstance.images || []);
    } else {
      reset();
      setSelectedPlant(null);
      setImageFiles([]);
      setExistingImages([]);
      setShowTaxonomyForm(false);
      setTaxonomyData({
        family: '',
        genus: '',
        species: '',
        cultivar: '',
        commonName: '',
      });
    }
  }, [isEditing, plantInstance, reset]);

  // Handle plant selection
  const handlePlantSelect = (plant: PlantSuggestion | null) => {
    if (plant) {
      setSelectedPlant(plant);
      setValue('plantId', plant.id, { shouldValidate: true });
    } else {
      setSelectedPlant(null);
      setValue('plantId', 0, { shouldValidate: true });
    }
  };

  // Handle image changes
  const handleImageChange = (files: File[]) => {
    setImageFiles(files);
    // Don't update form's images field - keep existingImages separate
    // Just trigger validation to ensure form is valid
    trigger();
  };

  // Handle existing image removal
  const handleRemoveExistingImage = (index: number) => {
    const newImages = existingImages.filter((_, i) => i !== index);
    setExistingImages(newImages);
    // Don't update form's images field - keep existingImages separate
    trigger();
  };

  // Convert enum fertilizer schedule to expected format
  const convertFertilizerSchedule = (schedule: string): string => {
    const scheduleMap = {
      'weekly': '7 days',
      'biweekly': '2 weeks', 
      'every_2_4_weeks': '3 weeks', // Average of 2-4 weeks
      'every_3_4_weeks': '4 weeks', // Average of 3-4 weeks
      'every_4_weeks': '4 weeks',
      'every_4_6_weeks': '5 weeks', // Average of 4-6 weeks
      'every_6_8_weeks': '7 weeks', // Average of 6-8 weeks
      'bimonthly': '2 months',
      'quarterly': '3 months'
    };
    return scheduleMap[schedule as keyof typeof scheduleMap] || schedule;
  };

  // Convert database fertilizer schedule back to form enum
  const convertDatabaseScheduleToForm = (schedule: string): string => {
    console.log('Converting database schedule:', schedule);
    if (!schedule) return 'every_4_weeks';
    
    const reverseMap = {
      // New format matches (what we send to API)
      '7 days': 'weekly',
      '2 weeks': 'biweekly',
      '3 weeks': 'every_2_4_weeks',
      '4 weeks': 'every_4_weeks',
      '5 weeks': 'every_4_6_weeks',
      '7 weeks': 'every_6_8_weeks',
      '2 months': 'bimonthly',
      '3 months': 'quarterly',
      // Legacy formats that might exist in database
      '1 week': 'weekly',
      'every 2 weeks': 'biweekly',
      'every 2-4 weeks': 'every_2_4_weeks',
      'every 3-4 weeks': 'every_3_4_weeks', 
      'every 4 weeks': 'every_4_weeks',
      'every 4-6 weeks': 'every_4_6_weeks',
      'every 6-8 weeks': 'every_6_8_weeks',
      '1 month': 'every_4_weeks',
      'monthly': 'every_4_weeks',
      'bimonthly': 'bimonthly',
      'quarterly': 'quarterly',
    };
    
    const result = reverseMap[schedule as keyof typeof reverseMap] || 'every_4_weeks';
    console.log('Converted to:', result);
    return result;
  };

  // Handle form submission
  const onSubmit = (data: PlantInstanceFormData) => {
    const submitData = {
      ...data,
      fertilizerSchedule: convertFertilizerSchedule(data.fertilizerSchedule),
      images: existingImages, // Always use current existingImages state
    };
    console.log('Form submission data:', submitData);
    console.log('Existing images being submitted:', existingImages);
    console.log('Original fertilizer schedule:', data.fertilizerSchedule);
    console.log('Converted fertilizer schedule:', convertFertilizerSchedule(data.fertilizerSchedule));
    mutation.mutate(submitData as any);
  };

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(isDirty || imageFiles.length > 0 || showTaxonomyForm);
  }, [isDirty, imageFiles.length, showTaxonomyForm]);

  // Warn about unsaved changes before page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    if (isOpen && hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOpen, hasUnsavedChanges]);

  // Handle close with unsaved changes warning
  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) return;
    }
    onClose();
  };

  // Close modal on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
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
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative h-full flex items-end sm:items-center justify-center p-4 pb-20 sm:pb-4">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-full overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Plant' : 'Add New Plant'}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              aria-label="Close form"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-auto max-h-[60vh] sm:max-h-[70vh]">
            <div className="p-6 space-y-6">
              {/* Plant Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plant Type *
                </label>
                <PlantTaxonomySelector
                  selectedPlant={selectedPlant}
                  onSelect={handlePlantSelect}
                  disabled={isCreatingPlant || showTaxonomyForm}
                  onAddNew={handleShowTaxonomyForm}
                />
                {isCreatingPlant && (
                  <div className="mt-2 flex items-center text-sm text-primary-600">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating new plant type...
                  </div>
                )}
                {createPlantMutation.isError && (
                  <div className="mt-2 text-sm text-red-600">
                    Failed to create plant: {createPlantMutation.error instanceof Error ? createPlantMutation.error.message : 'Unknown error'}
                  </div>
                )}
                {errors.plantId && (
                  <div className="mt-1 text-sm text-red-600">{errors.plantId.message}</div>
                )}

                {/* New Plant Taxonomy Form */}
                {showTaxonomyForm && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-blue-900">Create New Plant Type</h3>
                      <button
                        type="button"
                        onClick={handleCancelTaxonomyForm}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Common Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Common Name *
                        </label>
                        <input
                          type="text"
                          value={taxonomyData.commonName}
                          onChange={(e) => setTaxonomyData(prev => ({ ...prev, commonName: e.target.value }))}
                          placeholder="e.g., Monstera Deliciosa"
                          className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Family */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Family *
                          </label>
                          <input
                            type="text"
                            value={taxonomyData.family}
                            onChange={(e) => setTaxonomyData(prev => ({ ...prev, family: e.target.value }))}
                            placeholder="e.g., Araceae"
                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        {/* Genus */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Genus *
                          </label>
                          <input
                            type="text"
                            value={taxonomyData.genus}
                            onChange={(e) => setTaxonomyData(prev => ({ ...prev, genus: e.target.value }))}
                            placeholder="e.g., Monstera"
                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Species */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Species *
                          </label>
                          <input
                            type="text"
                            value={taxonomyData.species}
                            onChange={(e) => setTaxonomyData(prev => ({ ...prev, species: e.target.value }))}
                            placeholder="e.g., deliciosa"
                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        {/* Cultivar */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cultivar (optional)
                          </label>
                          <input
                            type="text"
                            value={taxonomyData.cultivar}
                            onChange={(e) => setTaxonomyData(prev => ({ ...prev, cultivar: e.target.value }))}
                            placeholder="e.g., 'Variegata'"
                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3 pt-2">
                        <button
                          type="button"
                          onClick={handleCancelTaxonomyForm}
                          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const isValid = taxonomyData.family && taxonomyData.genus && taxonomyData.species && taxonomyData.commonName;
                            if (isValid) {
                              handleTaxonomySubmit(taxonomyData);
                            }
                          }}
                          disabled={!taxonomyData.family || !taxonomyData.genus || !taxonomyData.species || !taxonomyData.commonName}
                          className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Create Plant Type
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
                    Nickname *
                  </label>
                  <Controller
                    name="nickname"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        id="nickname"
                        type="text"
                        placeholder="My favorite monstera"
                        className={`w-full px-3 py-2 bg-white text-gray-900 placeholder-gray-500 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                          errors.nickname ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                    )}
                  />
                  {errors.nickname && (
                    <p className="mt-1 text-sm text-red-600">{errors.nickname.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                  </label>
                  <Controller
                    name="location"
                    control={control}
                    render={({ field }) => (
                      <div className="relative">
                        <input
                          {...field}
                          id="location"
                          type="text"
                          placeholder="Living room window"
                          className={`w-full px-3 py-2 bg-white text-gray-900 placeholder-gray-500 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                            errors.location ? 'border-red-300' : 'border-gray-300'
                          }`}
                          onChange={(e) => {
                            field.onChange(e);
                            setLocationInput(e.target.value);
                            setShowLocationSuggestions(e.target.value.length > 0);
                          }}
                          onFocus={() => setShowLocationSuggestions(field.value.length > 0)}
                          onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                        />
                        
                        {/* Location suggestions dropdown */}
                        {showLocationSuggestions && userLocations && userLocations.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                            {userLocations
                              .filter(location => 
                                location.toLowerCase().includes(field.value.toLowerCase())
                              )
                              .slice(0, 5)
                              .map((location) => (
                                <button
                                  key={location}
                                  type="button"
                                  onClick={() => {
                                    field.onChange(location);
                                    setLocationInput(location);
                                    setShowLocationSuggestions(false);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none first:rounded-t-lg last:rounded-b-lg"
                                >
                                  <div className="flex items-center">
                                    <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {location}
                                  </div>
                                </button>
                              ))}
                            
                            {/* Common location suggestions */}
                            {field.value.length > 0 && !userLocations.some(loc => 
                              loc.toLowerCase().includes(field.value.toLowerCase())
                            ) && (
                              <div className="border-t border-gray-100">
                                <div className="px-3 py-2 text-xs text-gray-500 font-medium">Suggestions:</div>
                                {[
                                  'Living room window',
                                  'Kitchen counter',
                                  'Bedroom windowsill',
                                  'Bathroom shelf',
                                  'Office desk',
                                  'Balcony',
                                  'Greenhouse',
                                  'Outdoor garden',
                                ].filter(suggestion => 
                                  suggestion.toLowerCase().includes(field.value.toLowerCase())
                                ).slice(0, 3).map((suggestion) => (
                                  <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => {
                                      field.onChange(suggestion);
                                      setLocationInput(suggestion);
                                      setShowLocationSuggestions(false);
                                    }}
                                    className="w-full px-3 py-2 text-left text-gray-600 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                                  >
                                    <div className="flex items-center">
                                      <svg className="w-4 h-4 text-gray-300 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                      </svg>
                                      {suggestion}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  />
                  {errors.location && (
                    <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
                  )}
                  
                  {/* Location tips */}
                  <p className="mt-1 text-xs text-gray-500">
                    Be specific about lighting and conditions (e.g., "South-facing kitchen window")
                  </p>
                </div>
              </div>

              {/* Care Schedule */}
              <div>
                <label htmlFor="fertilizerSchedule" className="block text-sm font-medium text-gray-700 mb-2">
                  Fertilizer Schedule *
                </label>
                <Controller
                  name="fertilizerSchedule"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-3">
                      <select
                        {...field}
                        id="fertilizerSchedule"
                        className={`w-full px-3 py-2 bg-white text-gray-900 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                          errors.fertilizerSchedule ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="weekly">Weekly (every 7 days) - High maintenance</option>
                        <option value="biweekly">Every 2 weeks - Regular care</option>
                        <option value="every_2_4_weeks">Every 2-4 weeks - Variable schedule</option>
                        <option value="every_3_4_weeks">Every 3-4 weeks - Moderate care</option>
                        <option value="every_4_weeks">Every 4 weeks - Standard monthly</option>
                        <option value="every_4_6_weeks">Every 4-6 weeks - Extended care</option>
                        <option value="every_6_8_weeks">Every 6-8 weeks - Low maintenance</option>
                        <option value="bimonthly">Bi-monthly (every 60 days) - Very low maintenance</option>
                        <option value="quarterly">Quarterly (every 90 days) - Minimal care</option>
                      </select>
                      
                      {/* Schedule preview */}
                      {field.value && watch('lastFertilized') && (
                        <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
                          <div className="flex items-center text-sm">
                            <svg className="w-4 h-4 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-primary-800">
                              {(() => {
                                const lastFert = new Date(watch('lastFertilized') || '');
                                const currentSchedule = watch('fertilizerSchedule');
                                const scheduleMap = {
                                  weekly: 7,
                                  biweekly: 14,
                                  every_2_4_weeks: 21,    // Average of 2-4 weeks
                                  every_3_4_weeks: 24,    // Average of 3-4 weeks  
                                  every_4_weeks: 28,      // 4 weeks
                                  every_4_6_weeks: 35,    // Average of 4-6 weeks
                                  every_6_8_weeks: 49,    // Average of 6-8 weeks
                                  bimonthly: 60,
                                  quarterly: 90
                                };
                                const days = scheduleMap[currentSchedule as keyof typeof scheduleMap];
                                const nextDue = new Date(lastFert);
                                nextDue.setDate(nextDue.getDate() + days);
                                return `Next fertilizer due: ${nextDue.toLocaleDateString()}`;
                              })()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                />
                {errors.fertilizerSchedule && (
                  <p className="mt-1 text-sm text-red-600">{errors.fertilizerSchedule.message}</p>
                )}
                
                <p className="mt-1 text-xs text-gray-500">
                  Choose based on your plant's needs and your availability for care
                </p>
              </div>

              {/* Care History */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Fertilized
                  </label>
                  <Controller
                    name="lastFertilized"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Repotted
                  </label>
                  <Controller
                    name="lastRepot"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    )}
                  />
                </div>
              </div>

              {/* Notes & Observations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes & Observations
                </label>
                
                {/* Existing Notes History */}
                {watch('notes') && watch('notes')?.trim() && (
                  <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Previous Notes:</h4>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {watch('notes')}
                    </div>
                  </div>
                )}
                
                {/* New Note Input */}
                <div className="space-y-2">
                  <textarea
                    value={newNoteInput}
                    onChange={(e) => setNewNoteInput(e.target.value)}
                    rows={3}
                    placeholder="Add a new observation or note..."
                    className="w-full px-3 py-2 bg-white text-gray-900 placeholder-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        const newNote = newNoteInput.trim();
                        if (newNote) {
                          const timestamp = new Date().toLocaleDateString();
                          const existingNotes = watch('notes') || '';
                          const updatedNotes = existingNotes 
                            ? `${existingNotes}\n\n[${timestamp}] ${newNote}`
                            : `[${timestamp}] ${newNote}`;
                          setValue('notes', updatedNotes);
                          setNewNoteInput(''); // Clear the input
                        }
                      }
                    }}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                      Press Cmd/Ctrl + Enter to add note
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const newNote = newNoteInput.trim();
                        if (newNote) {
                          const timestamp = new Date().toLocaleDateString();
                          const existingNotes = watch('notes') || '';
                          const updatedNotes = existingNotes 
                            ? `${existingNotes}\n\n[${timestamp}] ${newNote}`
                            : `[${timestamp}] ${newNote}`;
                          setValue('notes', updatedNotes);
                          setNewNoteInput(''); // Clear the input
                        }
                      }}
                      disabled={!newNoteInput.trim()}
                      className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Note
                    </button>
                  </div>
                </div>
                
                {/* Hidden field for form submission */}
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <input type="hidden" {...field} />
                  )}
                />
                
                {errors.notes && (
                  <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
                )}
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photos
                </label>
                
                {/* Existing Images */}
                {existingImages.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Current Photos</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {existingImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image}
                            alt={`Plant photo ${index + 1}`}
                            className="w-full aspect-square object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingImage(index)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                          {index === 0 && (
                            <div className="absolute bottom-1 left-1 bg-primary-500 text-white text-xs px-1 rounded">
                              Primary
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Image Upload */}
                <ImageUpload
                  onImagesChange={handleImageChange}
                  maxImages={6 - existingImages.length}
                  acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                  maxSizePerImage={5 * 1024 * 1024} // 5MB
                />
              </div>

              {/* Active Status (for editing) */}
              {isEditing && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Plant Status</h4>
                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <div className="space-y-3">
                        <label className="flex items-start cursor-pointer">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={onChange}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mt-0.5"
                          />
                          <div className="ml-3">
                            <span className="text-sm font-medium text-gray-700">
                              Keep this plant active in my collection
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {value 
                                ? 'This plant will appear in your main collection and care reminders'
                                : 'This plant will be archived and hidden from your main collection'
                              }
                            </p>
                          </div>
                        </label>
                        
                        {!value && (
                          <div className="bg-amber-50 border border-amber-200 rounded p-3">
                            <div className="flex items-start">
                              <svg className="w-4 h-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              <div className="text-xs text-amber-800">
                                <p className="font-medium">Archiving this plant</p>
                                <p>Care history will be preserved, but the plant won't appear in your active collection or receive care reminders.</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Validation Summary */}
            {Object.keys(errors).length > 0 && (
              <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {Object.entries(errors).map(([field, error]) => (
                        <li key={field}>
                          • {field === 'plantId' ? 'Plant type' : 
                             field === 'fertilizerSchedule' ? 'Fertilizer schedule' :
                             field.charAt(0).toUpperCase() + field.slice(1)}: {error.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center text-sm text-gray-500">
                {!isValid && Object.keys(errors).length === 0 && (
                  <span>Fill in required fields to continue</span>
                )}
                {isValid && (
                  <span className="text-green-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Ready to save
                  </span>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={mutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending || (!selectedPlant && !isEditing)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {mutation.isPending ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {isEditing ? 'Updating...' : 'Adding...'}
                    </span>
                  ) : (
                    isEditing ? 'Update Plant' : 'Add Plant'
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Error Display */}
          {mutation.isError && (
            <div className="p-4 bg-red-50 border-t border-red-200">
              <p className="text-sm text-red-600">
                {mutation.error instanceof Error ? mutation.error.message : 'An error occurred'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}