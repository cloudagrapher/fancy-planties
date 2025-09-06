'use client';

import { useState } from 'react';
import PlantSelector from './PlantSelector';
import { usePlantSelection } from '@/hooks/usePlantSelection';

export default function PlantSelectorExample() {
  const [showExample, setShowExample] = useState(false);
  
  const { selectedPlant, selectPlant } = usePlantSelection({
    onSelectionChange: (plant) => {
      console.log('Plant selection changed:', plant);
    },
  });

  if (!showExample) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Plant Taxonomy Selector Demo
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          This component demonstrates the PlantTaxonomySelector with autocomplete search,
          fuzzy matching, and the ability to add new plant types.
        </p>
        <button
          onClick={() => setShowExample(true)}
          className="px-4 py-2 bg-primary-400 text-white rounded-md hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          Show Demo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Demo Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Plant Taxonomy Selector Demo
          </h3>
          <p className="text-sm text-gray-600">
            Try searching for plants or adding new ones
          </p>
        </div>
        <button
          onClick={() => setShowExample(false)}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
        >
          Hide Demo
        </button>
      </div>

      {/* Plant Selector */}
      <div className="max-w-md">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Plant Type
        </label>
        <PlantSelector
          onPlantSelect={selectPlant}
          selectedPlant={selectedPlant}
          placeholder="Search for a plant type..."
          showQuickSelect={true}
          autoFocus={false}
        />
      </div>

      {/* Selection Display */}
      {selectedPlant && (
        <div className="bg-white p-4 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Selected Plant Details
          </h4>
          <div className="space-y-1 text-sm">
            <div>
              <span className="font-medium">ID:</span> {selectedPlant.id}
            </div>
            <div>
              <span className="font-medium">Common Name:</span> {selectedPlant.commonName}
            </div>
            <div>
              <span className="font-medium">Scientific Name:</span>{' '}
              <em>{selectedPlant.genus} {selectedPlant.species}</em>
            </div>
            <div>
              <span className="font-medium">Family:</span> {selectedPlant.family}
            </div>
            <div>
              <span className="font-medium">Verified:</span>{' '}
              <span className={selectedPlant.isVerified ? 'text-green-600' : 'text-gray-500'}>
                {selectedPlant.isVerified ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          How to Use
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Start typing to search for existing plants</li>
          <li>• Use arrow keys to navigate search results</li>
          <li>• Press Enter to select a highlighted result</li>
          <li>• Click &quot;Add new plant&quot; if your plant isn&apos;t found</li>
          <li>• View recent and popular plants when the field is empty</li>
        </ul>
      </div>

      {/* Features List */}
      <div className="bg-green-50 p-4 border border-green-200 rounded-lg">
        <h4 className="text-sm font-medium text-green-900 mb-2">
          Features Implemented
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-green-800">
          <div>✓ Autocomplete search with real-time suggestions</div>
          <div>✓ Fuzzy matching across all taxonomy fields</div>
          <div>✓ &quot;Add new plant type&quot; functionality</div>
          <div>✓ Quick-add form for new taxonomy entries</div>
          <div>✓ Recent selections and popular plants</div>
          <div>✓ Keyboard navigation support</div>
          <div>✓ Loading states and error handling</div>
          <div>✓ Duplicate validation</div>
          <div>✓ Mobile-responsive design</div>
          <div>✓ TypeScript type safety</div>
        </div>
      </div>
    </div>
  );
}