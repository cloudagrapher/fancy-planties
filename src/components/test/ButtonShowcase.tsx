'use client';

import { useState } from 'react';

export default function ButtonShowcase() {
  const [isLoading, setIsLoading] = useState(false);
  const [toggleChecked, setToggleChecked] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [radioValue, setRadioValue] = useState('option1');
  const [selectValue, setSelectValue] = useState('');
  const [activeTab, setActiveTab] = useState('tab1');
  const [progress, setProgress] = useState(65);

  const handleLoadingTest = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 3000);
  };

  return (
    <div className="p-8 space-y-12 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Design System Showcase</h1>
        <p className="text-gray-600">Testing the comprehensive button and interactive component system</p>
      </div>

      {/* Button Variants */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">Button Variants</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">Primary Buttons</h3>
            <div className="flex flex-wrap gap-3">
              <button className="btn btn--primary">Primary</button>
              <button className="btn btn--primary btn--sm">Small Primary</button>
              <button className="btn btn--primary btn--lg">Large Primary</button>
              <button className="btn btn--primary" disabled>Disabled</button>
              <button 
                className={`btn btn--primary ${isLoading ? 'btn--loading' : ''}`}
                onClick={handleLoadingTest}
              >
                {isLoading ? 'Loading...' : 'Test Loading'}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">Secondary & Tertiary</h3>
            <div className="flex flex-wrap gap-3">
              <button className="btn btn--secondary">Secondary</button>
              <button className="btn btn--tertiary">Tertiary</button>
              <button className="btn btn--outline">Outline</button>
              <button className="btn btn--ghost">Ghost</button>
              <button className="btn btn--danger">Danger</button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">Icon Buttons</h3>
            <div className="flex flex-wrap gap-3">
              <button className="btn btn--icon btn--primary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button className="btn btn--icon btn--secondary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <button className="btn btn--icon btn--outline">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">Button Group</h3>
            <div className="btn-group">
              <button className="btn btn--outline">Left</button>
              <button className="btn btn--primary">Center</button>
              <button className="btn btn--outline">Right</button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">Full Width Button</h3>
            <button className="btn btn--primary btn--full">Full Width Button</button>
          </div>
        </div>
      </section>

      {/* Interactive Components */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">Interactive Components</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Toggle Switch */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">Toggle Switch</h3>
            <label className="flex items-center gap-3">
              <div 
                className={`toggle ${toggleChecked ? 'toggle--checked' : ''}`}
                onClick={() => setToggleChecked(!toggleChecked)}
              >
                <div className="toggle-thumb"></div>
              </div>
              <span className="text-sm text-gray-700">Enable notifications</span>
            </label>
          </div>

          {/* Checkbox */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">Checkbox</h3>
            <label className="checkbox">
              <input 
                type="checkbox" 
                className="checkbox-input"
                checked={checkboxChecked}
                onChange={(e) => setCheckboxChecked(e.target.checked)}
              />
              <div className="checkbox-box">
                <svg className="checkbox-checkmark" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="checkbox-label">I agree to the terms</span>
            </label>
          </div>

          {/* Radio Buttons */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">Radio Buttons</h3>
            <div className="space-y-2">
              {['option1', 'option2', 'option3'].map((option) => (
                <label key={option} className="radio">
                  <input 
                    type="radio" 
                    className="radio-input"
                    name="radio-group"
                    value={option}
                    checked={radioValue === option}
                    onChange={(e) => setRadioValue(e.target.value)}
                  />
                  <div className="radio-circle">
                    <div className="radio-dot"></div>
                  </div>
                  <span className="radio-label">Option {option.slice(-1)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Select Dropdown */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">Select Dropdown</h3>
            <div className="select">
              <select 
                className="select-input"
                value={selectValue}
                onChange={(e) => setSelectValue(e.target.value)}
              >
                <option value="">Choose an option</option>
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
                <option value="option3">Option 3</option>
              </select>
              <svg className="select-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">Badges</h2>
        <div className="flex flex-wrap gap-3">
          <span className="badge badge--primary">Primary</span>
          <span className="badge badge--secondary">Secondary</span>
          <span className="badge badge--success">Success</span>
          <span className="badge badge--warning">Warning</span>
          <span className="badge badge--error">Error</span>
          <span className="badge badge--neutral">Neutral</span>
        </div>
      </section>

      {/* Tabs */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">Tab Navigation</h2>
        <div>
          <div className="tabs">
            {['tab1', 'tab2', 'tab3'].map((tab) => (
              <button
                key={tab}
                className={`tab ${activeTab === tab ? 'tab--active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                Tab {tab.slice(-1)}
              </button>
            ))}
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-700">Content for {activeTab}</p>
          </div>
        </div>
      </section>

      {/* Progress Bar */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">Progress Bar</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="progress">
              <div 
                className="progress-bar progress-bar--animated" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              className="btn btn--sm btn--outline"
              onClick={() => setProgress(Math.max(0, progress - 10))}
            >
              -10%
            </button>
            <button 
              className="btn btn--sm btn--outline"
              onClick={() => setProgress(Math.min(100, progress + 10))}
            >
              +10%
            </button>
          </div>
        </div>
      </section>

      {/* Alerts */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">Alerts</h2>
        <div className="space-y-4">
          <div className="alert alert--success">
            <svg className="alert-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="alert-content">
              <div className="alert-title">Success!</div>
              <div className="alert-message">Your plant has been successfully added to your collection.</div>
            </div>
          </div>

          <div className="alert alert--warning">
            <svg className="alert-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="alert-content">
              <div className="alert-title">Warning</div>
              <div className="alert-message">Some plants need fertilizing soon.</div>
            </div>
          </div>

          <div className="alert alert--error">
            <svg className="alert-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="alert-content">
              <div className="alert-title">Error</div>
              <div className="alert-message">Failed to save plant data. Please try again.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Skeleton Loading */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">Skeleton Loading</h2>
        <div className="space-y-4">
          <div className="skeleton skeleton--title"></div>
          <div className="skeleton skeleton--text"></div>
          <div className="skeleton skeleton--text"></div>
          <div className="flex gap-4">
            <div className="skeleton skeleton--avatar"></div>
            <div className="flex-1 space-y-2">
              <div className="skeleton skeleton--text"></div>
              <div className="skeleton skeleton--text"></div>
            </div>
          </div>
          <div className="skeleton skeleton--button"></div>
        </div>
      </section>

      {/* Spinner */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">Loading Spinners</h2>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="spinner spinner--sm"></div>
            <p className="text-sm text-gray-600 mt-2">Small</p>
          </div>
          <div className="text-center">
            <div className="spinner"></div>
            <p className="text-sm text-gray-600 mt-2">Default</p>
          </div>
          <div className="text-center">
            <div className="spinner spinner--lg"></div>
            <p className="text-sm text-gray-600 mt-2">Large</p>
          </div>
        </div>
      </section>

      {/* Tooltips */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">Tooltips</h2>
        <div className="flex gap-4">
          <div className="tooltip">
            <button className="btn btn--primary">Hover me</button>
            <div className="tooltip-content">This is a helpful tooltip</div>
          </div>
          <div className="tooltip">
            <button className="btn btn--secondary">Another button</button>
            <div className="tooltip-content">More information here</div>
          </div>
        </div>
      </section>

      {/* Pagination */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">Pagination</h2>
        <div className="pagination">
          <button className="pagination-item pagination-item--disabled">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button className="pagination-item pagination-item--active">1</button>
          <button className="pagination-item">2</button>
          <button className="pagination-item">3</button>
          <span className="pagination-item pagination-item--disabled">...</span>
          <button className="pagination-item">10</button>
          <button className="pagination-item">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </section>
    </div>
  );
}