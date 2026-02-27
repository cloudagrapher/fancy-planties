'use client';

import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface CSVPreviewRow {
  [key: string]: string | number | boolean | null | undefined;
}

interface CSVPreviewProps {
  data: CSVPreviewRow[];
  errors: string[];
  isValid: boolean;
  className?: string;
}

export function CSVPreview({ data, errors, isValid, className = '' }: CSVPreviewProps) {
  if (data.length === 0 && errors.length === 0) {
    return null;
  }

  const headers = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center space-x-2">
        {isValid ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
        <h3 className="text-lg font-semibold text-gray-900">
          CSV Preview
        </h3>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900 mb-2">
                Validation Errors:
              </h4>
              <ul className="space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700">
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {data.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-700">
              Preview ({data.length} row{data.length !== 1 ? 's' : ''} shown)
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.slice(0, 5).map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {headers.map((header) => (
                      <td
                        key={header}
                        className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate"
                        title={row[header] != null ? String(row[header]) : undefined}
                      >
                        {row[header] || (
                          <span className="text-gray-400 italic">empty</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {data.length > 5 && (
            <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                ... and {data.length - 5} more rows
              </p>
            </div>
          )}
        </div>
      )}

      {isValid && data.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-sm font-medium text-green-900">
              CSV file is valid and ready for import!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}