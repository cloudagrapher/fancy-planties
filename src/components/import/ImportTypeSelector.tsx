'use client';

import { useState } from 'react';
import { Database, Leaf, Sprout, Info } from 'lucide-react';

export type ImportType = 'plant_taxonomy' | 'plant_instances' | 'propagations';

interface ImportTypeOption {
  id: ImportType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredColumns: string[];
  exampleData: string;
}

const importTypes: ImportTypeOption[] = [
  {
    id: 'plant_taxonomy',
    title: 'Plant Taxonomy',
    description: 'Import plant species information (family, genus, species, common names)',
    icon: Database,
    requiredColumns: ['Family', 'Genus', 'Species', 'Common Name/Variety'],
    exampleData: 'Araceae,Monstera,Deliciosa,Monstera Deliciosa',
  },
  {
    id: 'plant_instances',
    title: 'Plant Collection',
    description: 'Import your plant instances with care schedules and locations',
    icon: Leaf,
    requiredColumns: ['Common Name/Variety', 'Location', 'Fertilizer Schedule'],
    exampleData: 'Monstera Deliciosa,Living Room,every 4 weeks',
  },
  {
    id: 'propagations',
    title: 'Propagations',
    description: 'Import propagation records with start dates and progress',
    icon: Sprout,
    requiredColumns: ['Common Name/Variety', 'Location', 'Date Started'],
    exampleData: 'Monstera Deliciosa,Propagation Station,2024-01-15',
  },
];

interface ImportTypeSelectorProps {
  selectedType: ImportType | null;
  onTypeSelect: (type: ImportType) => void;
  className?: string;
}

export function ImportTypeSelector({
  selectedType,
  onTypeSelect,
  className = '',
}: ImportTypeSelectorProps) {
  const [showDetails, setShowDetails] = useState<ImportType | null>(null);

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Select Import Type
        </h3>
        <p className="text-sm text-gray-600">
          Choose what type of data you want to import from your CSV file.
        </p>
      </div>

      <div className="grid gap-4">
        {importTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;
          const isExpanded = showDetails === type.id;

          return (
            <div
              key={type.id}
              className={`
                border rounded-xl transition-all duration-200 cursor-pointer
                ${isSelected 
                  ? 'border-primary-300 bg-primary-50 shadow-sm' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
              `}
            >
              <div
                onClick={() => onTypeSelect(type.id)}
                className="p-4"
              >
                <div className="flex items-start space-x-4">
                  <div className={`
                    p-3 rounded-lg flex-shrink-0
                    ${isSelected ? 'bg-primary-200' : 'bg-gray-100'}
                  `}>
                    <Icon className={`
                      w-6 h-6 
                      ${isSelected ? 'text-primary-600' : 'text-gray-600'}
                    `} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">
                        {type.title}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDetails(isExpanded ? null : type.id);
                        }}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <Info className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {type.description}
                    </p>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="space-y-3">
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">
                        Required Columns:
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {type.requiredColumns.map((column) => (
                          <span
                            key={column}
                            className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono text-gray-700"
                          >
                            {column}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">
                        Example CSV Row:
                      </h5>
                      <div className="p-2 bg-white border border-gray-200 rounded">
                        <code className="text-xs text-gray-700">
                          {type.exampleData}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}