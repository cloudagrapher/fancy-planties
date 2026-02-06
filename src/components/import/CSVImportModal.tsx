'use client';

import { useState, useCallback } from 'react';
import { X, Upload, FileText, CheckCircle } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { ImportTypeSelector, type ImportType } from './ImportTypeSelector';
import { CSVPreview } from './CSVPreview';
import { ImportProgress } from './ImportProgress';
import type { ImportProgress as ImportProgressType } from '@/lib/validation/csv-schemas';
import { apiFetch } from '@/lib/api-client';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (summary: any) => void;
}

type Step = 'select-type' | 'upload-file' | 'preview' | 'importing' | 'complete';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  preview: any[];
}

export function CSVImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: CSVImportModalProps) {
  const [step, setStep] = useState<Step>('select-type');
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetModal = () => {
    setStep('select-type');
    setImportType(null);
    setSelectedFile(null);
    setFileContent('');
    setValidation(null);
    setImportId(null);
    setIsLoading(false);
    setError(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleTypeSelect = (type: ImportType) => {
    setImportType(type);
    setStep('upload-file');
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setIsLoading(true);
    setError(null);

    try {
      // Read file content
      const content = await readFileAsText(file);
      setFileContent(content);

      // Validate CSV content
      if (importType) {
        const response = await apiFetch('/api/import/csv/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            importType,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to validate CSV');
        }

        const validationResult = await response.json();
        setValidation(validationResult);
        setStep('preview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setIsLoading(false);
    }
  }, [importType]);

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleStartImport = async () => {
    if (!selectedFile || !importType || !fileContent) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/api/import/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: {
            name: selectedFile.name,
            size: selectedFile.size,
            type: selectedFile.type,
            content: fileContent,
          },
          importType,
          config: {
            skipEmptyRows: true,
            createMissingPlants: true,
            handleDuplicates: 'skip',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start import');
      }

      const result = await response.json();
      setImportId(result.importId);
      setStep('importing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start import');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportComplete = (progress: ImportProgressType) => {
    setStep('complete');
    onImportComplete?.(progress.summary);
  };

  const handleImportError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const getStepTitle = () => {
    switch (step) {
      case 'select-type':
        return 'Import CSV Data';
      case 'upload-file':
        return 'Upload CSV File';
      case 'preview':
        return 'Preview & Confirm';
      case 'importing':
        return 'Importing Data';
      case 'complete':
        return 'Import Complete';
      default:
        return 'Import CSV Data';
    }
  };

  const canGoBack = step !== 'select-type' && step !== 'importing';
  const canGoNext = 
    (step === 'select-type' && importType) ||
    (step === 'upload-file' && selectedFile) ||
    (step === 'preview' && validation?.isValid);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content--large">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            {getStepTitle()}
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className={`modal-close ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isLoading ? 'Please wait...' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          {error && (
            <div className="mb-6 card card-body bg-red-50 border border-red-200">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {step === 'select-type' && (
            <ImportTypeSelector
              selectedType={importType}
              onTypeSelect={handleTypeSelect}
            />
          )}

          {step === 'upload-file' && (
            <div className="space-y-6">
              <div className="text-center">
                <Upload className="w-12 h-12 text-primary-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">
                  Upload your {importType?.replace('_', ' ')} CSV file
                </h3>
                <p className="text-neutral-600">
                  Make sure your CSV file has the required columns for this import type.
                </p>
              </div>
              <FileUpload
                onFileSelect={handleFileSelect}
                acceptedTypes={['.csv', 'text/csv']}
              />
            </div>
          )}

          {step === 'preview' && validation && (
            <div className="space-y-6">
              <div className="text-center">
                <FileText className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Review your data
                </h3>
                <p className="text-gray-600">
                  Check the preview below and confirm the import when ready.
                </p>
              </div>
              <CSVPreview
                data={validation.preview}
                errors={validation.errors}
                isValid={validation.isValid}
              />
            </div>
          )}

          {step === 'importing' && importId && (
            <ImportProgress
              importId={importId}
              onComplete={handleImportComplete}
              onError={handleImportError}
            />
          )}

          {step === 'complete' && (
            <div className="text-center space-y-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Import completed successfully!
                </h3>
                <p className="text-gray-600">
                  Your CSV data has been imported into your plant collection.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-2">
            {canGoBack && (
              <button
                onClick={() => {
                  if (step === 'upload-file') setStep('select-type');
                  else if (step === 'preview') setStep('upload-file');
                }}
                disabled={isLoading}
                className={`btn btn--outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Back
              </button>
            )}
          </div>

          <div className="flex space-x-2">
            {step === 'complete' ? (
              <button
                onClick={handleClose}
                className="btn btn--primary"
              >
                Done
              </button>
            ) : step === 'preview' && validation?.isValid ? (
              <button
                onClick={handleStartImport}
                disabled={isLoading}
                className={`btn btn--primary ${isLoading ? 'btn--loading' : ''}`}
              >
                {isLoading ? 'Starting...' : 'Start Import'}
              </button>
            ) : (
              <button
                onClick={handleClose}
                disabled={isLoading}
                className={`btn btn--outline ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CSVImportModal;