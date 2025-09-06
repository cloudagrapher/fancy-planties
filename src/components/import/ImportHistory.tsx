'use client';

import { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Clock, AlertTriangle, MoreVertical, Trash2, Download } from 'lucide-react';
import type { ImportProgress } from '@/lib/validation/csv-schemas';

interface ImportHistoryProps {
  className?: string;
}

export function ImportHistory({ className = '' }: ImportHistoryProps) {
  const [imports, setImports] = useState<ImportProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchImports();
  }, []);

  const fetchImports = async () => {
    try {
      const response = await fetch('/api/import/csv');
      if (!response.ok) {
        throw new Error('Failed to fetch imports');
      }

      const data = await response.json();
      setImports(data.imports);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load imports');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'processing':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'completed':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const formatImportType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString();
  };

  const getDuration = (startTime: Date | string, endTime?: Date | string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.round((end.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) {
      return `${duration}s`;
    } else if (duration < 3600) {
      return `${Math.round(duration / 60)}m`;
    } else {
      return `${Math.round(duration / 3600)}h`;
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-2 text-gray-600">Loading import history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (imports.length === 0) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No imports yet
        </h3>
        <p className="text-gray-600">
          Your CSV import history will appear here once you start importing data.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Import History
        </h3>
        <button
          onClick={fetchImports}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {imports.map((importItem) => (
          <div
            key={importItem.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                {getStatusIcon(importItem.status)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900 truncate">
                      {importItem.fileName}
                    </h4>
                    <span className={`
                      px-2 py-1 text-xs font-medium rounded-full border
                      ${getStatusColor(importItem.status)}
                    `}>
                      {getStatusText(importItem.status)}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{formatImportType(importItem.importType)}</span>
                    <span>•</span>
                    <span>{formatDate(importItem.startTime)}</span>
                    <span>•</span>
                    <span>{getDuration(importItem.startTime, importItem.endTime)}</span>
                  </div>

                  {/* Progress for active imports */}
                  {importItem.status === 'processing' && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Processing...</span>
                        <span>{importItem.processedRows} / {importItem.totalRows}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${importItem.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Results for completed imports */}
                  {importItem.status === 'completed' && importItem.summary && (
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-600">
                      <span className="text-green-600">
                        ✓ {importItem.summary.successfulImports} imported
                      </span>
                      {importItem.summary.errors.length > 0 && (
                        <span className="text-red-600">
                          ✗ {importItem.summary.errors.length} errors
                        </span>
                      )}
                      {importItem.summary.conflicts.length > 0 && (
                        <span className="text-yellow-600">
                          ⚠ {importItem.summary.conflicts.length} conflicts
                        </span>
                      )}
                    </div>
                  )}

                  {/* Errors for failed imports */}
                  {importItem.status === 'failed' && importItem.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-red-600">
                        {importItem.errors[0].message}
                      </p>
                    </div>
                  )}

                  {/* Conflicts indicator */}
                  {importItem.conflicts.length > 0 && (
                    <div className="mt-2 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <span className="text-xs text-yellow-700">
                        {importItem.conflicts.length} conflicts need resolution
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions menu */}
              <div className="relative">
                <button className="p-1 hover:bg-gray-100 rounded-full">
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
                {/* TODO: Add dropdown menu for actions like view details, download report, etc. */}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}