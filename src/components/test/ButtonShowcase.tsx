'use client';

import { useState } from 'react';

/**
 * ButtonShowcase component to demonstrate all button variants and states
 * This component showcases the comprehensive button system implementation
 */
export default function ButtonShowcase() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadingTest = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className="p-6 space-y-8 bg-white rounded-xl shadow-soft">
      <h2 className="text-2xl font-semibold text-gray-900">Button System Showcase</h2>
      
      {/* Button Variants */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800">Button Variants</h3>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn--primary">Primary</button>
          <button className="btn btn--secondary">Secondary</button>
          <button className="btn btn--tertiary">Tertiary</button>
          <button className="btn btn--outline">Outline</button>
          <button className="btn btn--ghost">Ghost</button>
          <button className="btn btn--danger">Danger</button>
        </div>
      </div>

      {/* Button Sizes */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800">Button Sizes</h3>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn--primary btn--sm">Small</button>
          <button className="btn btn--primary">Default</button>
          <button className="btn btn--primary btn--lg">Large</button>
        </div>
      </div>

      {/* Button States */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800">Button States</h3>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn--primary">Normal</button>
          <button className="btn btn--primary" disabled>Disabled</button>
          <button 
            className={`btn btn--primary ${isLoading ? 'btn--loading' : ''}`}
            onClick={handleLoadingTest}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Click to Load'}
          </button>
        </div>
      </div>

      {/* Icon Buttons */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800">Icon Buttons</h3>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn--primary btn--icon">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button className="btn btn--secondary btn--icon btn--sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <button className="btn btn--outline btn--icon btn--lg">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Full Width Buttons */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800">Full Width Buttons</h3>
        <div className="space-y-2">
          <button className="btn btn--primary btn--full">Full Width Primary</button>
          <button className="btn btn--outline btn--full">Full Width Outline</button>
        </div>
      </div>

      {/* Button Groups */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800">Button Groups</h3>
        <div className="btn-group">
          <button className="btn btn--outline">Left</button>
          <button className="btn btn--primary">Center</button>
          <button className="btn btn--outline">Right</button>
        </div>
      </div>

      {/* Buttons with Icons and Text */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800">Buttons with Icons</h3>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn--primary">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Plant
          </button>
          <button className="btn btn--secondary">
            💧 Water
          </button>
          <button className="btn btn--tertiary">
            🌱 Propagate
          </button>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800">Floating Action Button</h3>
        <p className="text-sm text-gray-600">
          The FAB appears in the bottom right corner (check the bottom of the page)
        </p>
        <button className="btn btn--fab btn--primary">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}