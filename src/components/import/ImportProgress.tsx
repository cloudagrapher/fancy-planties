'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Loader2, Clock, FileText } from 'lucide-react';
import type { ImportProgress as ImportProgressType } from '@/lib/validation/csv-schemas';

interface ImportProgressProps {
  importId: string;
  onComplete?: (progress: ImportProgressType) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function ImportProgress({
  importId,
  onComplete,
  onError,
  className = '',
}: ImportProgressProps) {
  const [progress, setProgress] = useState<ImportProgressType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/import/csv/${importId}`);
        
        if (response.status === 404) {
          // Import might have completed and been cleaned up
          const errorData = await response.json().catch(() => ({}));
          
          if (errorData.message?.includes('completed successfully')) {
            // Treat as successful completion
            const completedProgress: ImportProgressType = {
              id: importId,
              userId: 0, // Will be filled by onComplete handler
              fileName: 'Import completed',
              importType: 'plant_instances',
              status: 'completed',
              progress: 100,
              totalRows: 0,
              processedRows: 0,
              errors: [],
              conflicts: [],
              startTime: new Date(),
              endTime: new Date(),
            };
            setProgress(completedProgress);
            onComplete?.(completedProgress);
            clearInterval(intervalId);
            return;
          } else {
            throw new Error('Import not found - it may have expired');
          }
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch progress');
        }

        const data = await response.json();
        setProgress(data.progress);

        if (data.progress.status === 'completed') {
          onComplete?.(data.progress);
          clearInterval(intervalId);
        } else if (data.progress.status === 'failed') {
          onError?.(data.progress.errors[0]?.message || 'Import failed');
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error('Error fetching progress:', error);
        onError?.(error instanceof Error ? error.message : 'Unknown error');
        clearInterval(intervalId);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchProgress();

    // Poll for updates every 2 seconds
    intervalId = setInterval(fetchProgress, 2000);

    return () => clearInterval(intervalId);
  }, [importId, onComplete, onError]);

  if (loading || !progress) {
    return (
      <div className={`flex-center p-8 ${className}`}>
        <div className="spinner spinner--primary" />
        <span className="loading-text">Loading import status...</span>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'pending':
        return <Clock className="w-6 h-6 text-warning" />;
      case 'processing':
        return <div className="spinner spinner--primary" />;
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-success" />;
      case 'failed':
        return <XCircle className="w-6 h-6 text-error" />;
      default:
        return <FileText className="w-6 h-6 text-neutral-500" />;
    }
  };

  const getStatusText = () => {
    switch (progress.status) {
      case 'pending':
        return 'Waiting to start...';
      case 'processing':
        return 'Processing CSV data...';
      case 'completed':
        return 'Import completed successfully!';
      case 'failed':
        return 'Import failed';
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'pending':
        return 'text-warning';
      case 'processing':
        return 'text-info';
      case 'completed':
        return 'text-success';
      case 'failed':
        return 'text-error';
      default:
        return 'text-neutral-700';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status Header */}
      <div className="flex-start space-x-3">
        {getStatusIcon()}
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">
            Import Progress
          </h3>
          <p className={`text-sm ${getStatusColor()}`}>
            {getStatusText()}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {progress.status === 'processing' && (
        <div className="space-y-2">
          <div className="flex-between text-sm text-neutral-600">
            <span>Processing rows...</span>
            <span>{progress.processedRows} / {progress.totalRows}</span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* File Info */}
      <div className="card card-body">
        <div className="grid-responsive text-sm">
          <div>
            <span className="font-medium text-neutral-700">File:</span>
            <p className="text-neutral-600 truncate">{progress.fileName}</p>
          </div>
          <div>
            <span className="font-medium text-neutral-700">Type:</span>
            <p className="text-neutral-600 capitalize">
              {progress.importType.replace('_', ' ')}
            </p>
          </div>
          <div>
            <span className="font-medium text-neutral-700">Started:</span>
            <p className="text-neutral-600">
              {new Date(progress.startTime).toLocaleString()}
            </p>
          </div>
          {progress.endTime && (
            <div>
              <span className="font-medium text-neutral-700">Completed:</span>
              <p className="text-neutral-600">
                {new Date(progress.endTime).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Results Summary */}
      {progress.status === 'completed' && progress.summary && (
        <div className="card card--mint card-body">
          <h4 className="font-medium text-success mb-3">Import Summary</h4>
          <div className="grid-responsive text-sm">
            <div>
              <span className="font-medium text-success">Total Rows:</span>
              <p className="text-success">{progress.summary.totalRows}</p>
            </div>
            <div>
              <span className="font-medium text-success">Successful:</span>
              <p className="text-success">{progress.summary.successfulImports}</p>
            </div>
            <div>
              <span className="font-medium text-success">Errors:</span>
              <p className="text-success">{progress.summary.errors.length}</p>
            </div>
            <div>
              <span className="font-medium text-success">Conflicts:</span>
              <p className="text-success">{progress.summary.conflicts.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Errors */}
      {progress.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-red-900 mb-2">Errors:</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {progress.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-700">
                    {error.field && (
                      <span className="font-medium">Row {error.rowIndex + 1}, {error.field}: </span>
                    )}
                    {error.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conflicts */}
      {progress.conflicts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-yellow-900 mb-2">
                Conflicts Require Resolution:
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {progress.conflicts.map((conflict, index) => (
                  <div key={index} className="text-sm text-yellow-700">
                    <span className="font-medium">Row {conflict.rowIndex + 1}: </span>
                    {conflict.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}