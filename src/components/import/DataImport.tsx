'use client';

import { useState } from 'react';
import { Upload, FileText, Database, History } from 'lucide-react';
import { CSVImportModal } from './CSVImportModal';
import { ImportHistory } from './ImportHistory';

interface DataImportProps {
  className?: string;
}

export function DataImport({ className = '' }: DataImportProps) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import');

  const handleImportComplete = (summary: any) => {
    // Refresh the history when import completes
    if (activeTab === 'history') {
      // The ImportHistory component will automatically refresh
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Data Import
        </h2>
        <p className="text-gray-600">
          Import your plant data from CSV files to quickly populate your collection.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('import')}
            className={`
              py-2 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'import'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Import Data
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`
              py-2 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'history'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <History className="w-4 h-4 inline mr-2" />
            Import History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Quick Start Section */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-primary-200 rounded-lg">
                <Database className="w-6 h-6 text-primary-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-primary-900 mb-2">
                  Quick Start Guide
                </h3>
                <p className="text-primary-700 mb-4">
                  Import your existing plant data to get started quickly. We support three types of CSV imports:
                </p>
                <ul className="space-y-2 text-sm text-primary-700">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-primary-400 rounded-full mr-3"></span>
                    <strong>Plant Taxonomy:</strong> Species information (family, genus, species, common names)
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-primary-400 rounded-full mr-3"></span>
                    <strong>Plant Collection:</strong> Your plant instances with care schedules and locations
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-primary-400 rounded-full mr-3"></span>
                    <strong>Propagations:</strong> Propagation records with start dates and progress
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Import Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">
                  Import from CSV
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                Upload a CSV file with your plant data. We'll guide you through the process and validate your data.
              </p>
              <button
                onClick={() => setShowImportModal(true)}
                className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Start CSV Import
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gray-200 rounded-lg">
                  <Database className="w-5 h-5 text-gray-500" />
                </div>
                <h3 className="font-semibold text-gray-500">
                  Other Import Methods
                </h3>
              </div>
              <p className="text-gray-500 mb-4">
                Additional import methods like JSON, Excel, or API integrations will be available in future updates.
              </p>
              <button
                disabled
                className="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
          </div>

          {/* CSV Format Help */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              CSV Format Requirements
            </h3>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Plant Taxonomy</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Required columns:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Family</li>
                    <li>Genus</li>
                    <li>Species</li>
                    <li>Common Name/Variety</li>
                  </ul>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Plant Collection</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Required columns:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Common Name/Variety</li>
                    <li>Location</li>
                    <li>Fertilizer Schedule</li>
                  </ul>
                  <p><strong>Optional:</strong> Last Fertilized, Last Repot</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Propagations</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Required columns:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Common Name/Variety</li>
                    <li>Location</li>
                    <li>Date Started</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <ImportHistory />
      )}

      {/* CSV Import Modal */}
      <CSVImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}