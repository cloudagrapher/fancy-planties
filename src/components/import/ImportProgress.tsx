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
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        <span className="ml-2 text-gray-600">Loading import status...</span>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'pending':
        return <Clock className="w-6 h-6 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="w-6 h-6 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return <FileText className="w-6 h-6 text-gray-500" />;
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
        return 'text-yellow-700';
      case 'processing':
        return 'text-blue-700';
      case 'completed':
        return 'text-green-700';
      case 'failed':
        return 'text-red-700';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status Header */}
      <div className="flex items-center space-x-3">
        {getStatusIcon()}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
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
          <div className="flex justify-between text-sm text-gray-600">
            <span>Processing rows...</span>
            <span>{progress.processedRows} / {progress.totalRows}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* File Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">File:</span>
            <p className="text-gray-600 truncate">{progress.fileName}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Type:</span>
            <p className="text-gray-600 capitalize">
              {progress.importType.replace('_', ' ')}
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Started:</span>
            <p className="text-gray-600">
              {new Date(progress.startTime).toLocaleString()}
            </p>
          </div>
          {progress.endTime && (
            <div>
              <span className="font-medium text-gray-700">Completed:</span>
              <p className="text-gray-600">
                {new Date(progress.endTime).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Results Summary */}
      {progress.status === 'completed' && progress.summary && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-3">Import Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-green-700">Total Rows:</span>
              <p className="text-green-600">{progress.summary.totalRows}</p>
            </div>
            <div>
              <span className="font-medium text-green-700">Successful:</span>
              <p className="text-green-600">{progress.summary.successfulImports}</p>
            </div>
            <div>
              <span className="font-medium text-green-700">Errors:</span>
              <p className="text-green-600">{progress.summary.errors.length}</p>
            </div>
            <div>
              <span className="font-medium text-green-700">Conflicts:</span>
              <p className="text-green-600">{progress.summary.conflicts.length}</p>
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