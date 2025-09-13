'use client';

import { useState, useCallback, useEffect } from 'react';
import { z } from 'zod';
import { formatValidationErrors, safeValidate } from '@/lib/validation/admin-schemas';
import { useFormValidationNotifications } from './AdminNotificationSystem';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: z.ZodSchema<any>;
}

export interface FormValidationProps<T> {
  schema: z.ZodSchema<T>;
  initialData?: Partial<T>;
  onSubmit: (data: T) => Promise<void> | void;
  onValidationError?: (errors: Record<string, string>) => void;
  fields: FormField[];
  submitLabel?: string;
  resetLabel?: string;
  showResetButton?: boolean;
  disabled?: boolean;
  className?: string;
}

export function AdminValidatedForm<T extends Record<string, any>>({
  schema,
  initialData = {},
  onSubmit,
  onValidationError,
  fields,
  submitLabel = 'Submit',
  resetLabel = 'Reset',
  showResetButton = true,
  disabled = false,
  className = '',
}: FormValidationProps<T>) {
  const [formData, setFormData] = useState<Partial<T>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { notifyValidationErrors, notifyUnsavedChanges } = useFormValidationNotifications();

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData);
    setHasUnsavedChanges(hasChanges);
  }, [formData, initialData]);

  // Warn about unsaved changes on page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        notifyUnsavedChanges();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, notifyUnsavedChanges]);

  const validateField = useCallback((name: string, value: any) => {
    const field = fields.find(f => f.name === name);
    if (!field?.validation) return null;

    const result = safeValidate(field.validation, value);
    return result.success ? null : result.errors[name] || 'Invalid value';
  }, [fields]);

  const handleFieldChange = useCallback((name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Real-time validation for immediate feedback
    const fieldError = validateField(name, value);
    if (fieldError) {
      setErrors(prev => ({ ...prev, [name]: fieldError }));
    }
  }, [errors, validateField]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting || disabled) return;

    // Validate entire form
    const validation = safeValidate(schema, formData);
    
    if (!validation.success) {
      setErrors(validation.errors);
      onValidationError?.(validation.errors);
      notifyValidationErrors(validation.errors);
      
      // Focus first error field
      const firstErrorField = Object.keys(validation.errors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
      element?.focus();
      
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await onSubmit(validation.data);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Form submission error:', error);
      
      // Handle server validation errors
      if (error instanceof Error && error.message.includes('validation')) {
        try {
          const serverErrors = JSON.parse(error.message);
          setErrors(serverErrors);
          notifyValidationErrors(serverErrors);
        } catch {
          setErrors({ general: error.message });
        }
      } else {
        setErrors({ general: 'An unexpected error occurred. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [schema, formData, isSubmitting, disabled, onSubmit, onValidationError, notifyValidationErrors]);

  const handleReset = useCallback(() => {
    setFormData(initialData);
    setErrors({});
    setHasUnsavedChanges(false);
  }, [initialData]);

  const renderField = (field: FormField) => {
    const value = formData[field.name] ?? '';
    const error = errors[field.name];
    const fieldId = `field-${field.name}`;

    const commonProps = {
      id: fieldId,
      name: field.name,
      required: field.required,
      disabled: disabled || isSubmitting,
      className: `form-input ${error ? 'error' : ''}`,
      'aria-describedby': error ? `${fieldId}-error` : undefined,
    };

    let input: React.ReactNode;

    switch (field.type) {
      case 'select':
        input = (
          <select
            {...commonProps}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
          >
            <option value="">{field.placeholder || `Select ${field.label}`}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
        break;

      case 'textarea':
        input = (
          <textarea
            {...commonProps}
            value={value}
            placeholder={field.placeholder}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            rows={4}
          />
        );
        break;

      case 'checkbox':
        input = (
          <input
            {...commonProps}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => handleFieldChange(field.name, e.target.checked)}
            className={`form-checkbox ${error ? 'error' : ''}`}
          />
        );
        break;

      case 'number':
        input = (
          <input
            {...commonProps}
            type="number"
            value={value}
            placeholder={field.placeholder}
            onChange={(e) => handleFieldChange(field.name, e.target.valueAsNumber || '')}
          />
        );
        break;

      default:
        input = (
          <input
            {...commonProps}
            type={field.type}
            value={value}
            placeholder={field.placeholder}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
          />
        );
    }

    return (
      <div key={field.name} className={`form-field ${field.type === 'checkbox' ? 'checkbox-field' : ''}`}>
        <label htmlFor={fieldId} className="form-label">
          {field.label}
          {field.required && <span className="required-indicator">*</span>}
        </label>
        
        {input}
        
        {error && (
          <div id={`${fieldId}-error`} className="field-error" role="alert">
            {error}
          </div>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className={`admin-validated-form ${className}`} noValidate>
      {errors.general && (
        <div className="form-error general-error" role="alert">
          {errors.general}
        </div>
      )}

      <div className="form-fields">
        {fields.map(renderField)}
      </div>

      <div className="form-actions">
        <button
          type="submit"
          disabled={disabled || isSubmitting}
          className="submit-button primary"
        >
          {isSubmitting ? 'Submitting...' : submitLabel}
        </button>

        {showResetButton && (
          <button
            type="button"
            onClick={handleReset}
            disabled={disabled || isSubmitting || !hasUnsavedChanges}
            className="reset-button secondary"
          >
            {resetLabel}
          </button>
        )}
      </div>

      {hasUnsavedChanges && (
        <div className="unsaved-changes-indicator">
          <span className="indicator-icon">●</span>
          You have unsaved changes
        </div>
      )}
    </form>
  );
}

// Specialized form components for common admin operations
export interface UserEditFormProps {
  user?: { id: number; name: string; email: string; isCurator: boolean };
  onSubmit: (data: { name: string; email: string; isCurator: boolean }) => Promise<void>;
  disabled?: boolean;
}

export function AdminUserEditForm({ user, onSubmit, disabled }: UserEditFormProps) {
  const schema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    email: z.string().email('Invalid email address'),
    isCurator: z.boolean(),
  });

  const fields: FormField[] = [
    {
      name: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      placeholder: 'Enter full name',
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      placeholder: 'Enter email address',
    },
    {
      name: 'isCurator',
      label: 'Curator Privileges',
      type: 'checkbox',
    },
  ];

  return (
    <AdminValidatedForm
      schema={schema}
      initialData={user}
      onSubmit={onSubmit}
      fields={fields}
      submitLabel={user ? 'Update User' : 'Create User'}
      disabled={disabled}
      className="user-edit-form"
    />
  );
}

export interface PlantEditFormProps {
  plant?: {
    id: number;
    family: string;
    genus: string;
    species: string;
    cultivar?: string;
    commonName: string;
    careInstructions?: string;
    isVerified: boolean;
  };
  onSubmit: (data: {
    family: string;
    genus: string;
    species: string;
    cultivar?: string;
    commonName: string;
    careInstructions?: string;
    isVerified: boolean;
  }) => Promise<void>;
  disabled?: boolean;
}

export function AdminPlantEditForm({ plant, onSubmit, disabled }: PlantEditFormProps) {
  const schema = z.object({
    family: z.string().min(1, 'Family is required').max(100),
    genus: z.string().min(1, 'Genus is required').max(100),
    species: z.string().min(1, 'Species is required').max(100),
    cultivar: z.string().max(100).optional(),
    commonName: z.string().min(1, 'Common name is required').max(200),
    careInstructions: z.string().max(2000).optional(),
    isVerified: z.boolean(),
  });

  const fields: FormField[] = [
    {
      name: 'family',
      label: 'Family',
      type: 'text',
      required: true,
      placeholder: 'e.g., Araceae',
    },
    {
      name: 'genus',
      label: 'Genus',
      type: 'text',
      required: true,
      placeholder: 'e.g., Monstera',
    },
    {
      name: 'species',
      label: 'Species',
      type: 'text',
      required: true,
      placeholder: 'e.g., deliciosa',
    },
    {
      name: 'cultivar',
      label: 'Cultivar (Optional)',
      type: 'text',
      placeholder: 'e.g., Variegata',
    },
    {
      name: 'commonName',
      label: 'Common Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Swiss Cheese Plant',
    },
    {
      name: 'careInstructions',
      label: 'Care Instructions (Optional)',
      type: 'textarea',
      placeholder: 'Enter care instructions...',
    },
    {
      name: 'isVerified',
      label: 'Verified Plant',
      type: 'checkbox',
    },
  ];

  return (
    <AdminValidatedForm
      schema={schema}
      initialData={plant}
      onSubmit={onSubmit}
      fields={fields}
      submitLabel={plant ? 'Update Plant' : 'Create Plant'}
      disabled={disabled}
      className="plant-edit-form"
    />
  );
}