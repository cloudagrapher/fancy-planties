/**
 * Component Mocks for Testing
 * Provides mock implementations for components that are difficult to test
 */

import React from 'react';

// Mock Plant Components
export const PlantsGrid = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  const [hasError, setHasError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [plants, setPlants] = React.useState<any[]>([]);
  
  React.useEffect(() => {
    let abortController: AbortController | null = null;
    
    // Simulate data loading with AbortController
    const loadData = async () => {
      try {
        if (global.fetch) {
          // Create AbortController if available
          if (typeof AbortController !== 'undefined') {
            abortController = new AbortController();
          }
          
          const response = await global.fetch('/api/plant-instances', {
            signal: abortController?.signal,
          });
          
          if (!response.ok) {
            throw new Error('Failed to load plants');
          }
          let data;
          try {
            data = await response.json();
          } catch (jsonError) {
            // Handle malformed JSON responses
            throw new Error('Invalid JSON response');
          }
          
          if (data.success && data.data?.instances) {
            setPlants(data.data.instances);
          } else if (data.data?.length) {
            setPlants(data.data);
          } else if (!data.success) {
            throw new Error(data.error || 'API returned error');
          }
        }
        setIsLoading(false);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Request was aborted, don't update state
          return;
        }
        setHasError(true);
        setIsLoading(false);
        setPlants([]); // Clear plants on error
      }
    };

    loadData();
    
    // Cleanup function to abort request
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, []);

  if (hasError) {
    return (
      <div ref={ref} data-testid="plants-grid" className="plants-grid">
        <div>Error loading plants</div>
        <button onClick={() => { setHasError(false); setIsLoading(true); }}>Try again</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div ref={ref} data-testid="plants-grid" className="plants-grid">
        <div data-testid="loading-skeleton">Loading plants...</div>
      </div>
    );
  }

  return (
    <div ref={ref} data-testid="plants-grid" className="plants-grid">
      {plants.map((plant, index) => (
        <div key={plant.id || index} data-testid={`plant-card-${plant.id || index}`}>
          {plant.nickname || `Plant ${index + 1}`}
        </div>
      ))}
      {plants.length === 0 && !hasError && <div>No plants found</div>}
    </div>
  );
});
PlantsGrid.displayName = 'PlantsGrid';

export const PlantCard = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);

  const handleDeleteClick = () => {
    setShowConfirmDialog(true);
  };

  if (showConfirmDialog) {
    return (
      <div ref={ref}>
        <div>Are you sure you want to delete this plant?</div>
        <button onClick={() => setShowConfirmDialog(false)}>Cancel</button>
        <button onClick={props.onDelete}>Confirm Delete</button>
      </div>
    );
  }

  return (
    <article ref={ref} className="plant-card">
      <h3>{props.plant?.nickname || 'Test Plant'}</h3>
      <p>{props.plant?.location || 'Test Location'}</p>
      {props.showDeleteOption && (
        <button onClick={handleDeleteClick}>Delete</button>
      )}
      <button onClick={() => props.onCareAction?.('water')}>Water</button>
    </article>
  );
});
PlantCard.displayName = 'PlantCard';

export const PlantCardSkeleton = React.forwardRef<HTMLDivElement, any>((props, ref) => (
  <div ref={ref} data-testid="skeleton-loader" className="plant-card-skeleton">
    <div className="skeleton-content">Loading...</div>
  </div>
));
PlantCardSkeleton.displayName = 'PlantCardSkeleton';

export const PlantInstanceForm = React.forwardRef<HTMLFormElement, any>((props, ref) => {
  React.useEffect(() => {
    // Simulate form auto-save
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem) {
      sessionStorage.getItem('plant-form-draft');
    }
  }, []);

  return (
    <form ref={ref} onSubmit={props.onSubmit}>
      <input type="text" placeholder="Plant name" />
      <button type="submit">Save</button>
      <button type="button" onClick={props.onCancel}>Cancel</button>
    </form>
  );
});
PlantInstanceForm.displayName = 'PlantInstanceForm';

export const PlantTaxonomyForm = React.forwardRef<HTMLFormElement, any>((props, ref) => (
  <form ref={ref} onSubmit={props.onSubmit}>
    <input type="text" placeholder="Scientific name" />
    <div>Help info tooltip</div>
    <button type="submit">Save</button>
    <button type="button" onClick={props.onCancel}>Cancel</button>
  </form>
));
PlantTaxonomyForm.displayName = 'PlantTaxonomyForm';

export const PlantTaxonomySelector = React.forwardRef<HTMLDivElement, any>((props, ref) => (
  <div ref={ref} className="plant-taxonomy-selector">
    <input 
      type="text" 
      placeholder={props.placeholder || "Search plants..."}
      title="Selected plant"
      role="combobox"
    />
    <div role="status" aria-live="polite">
      {props.selectedPlant ? `Selected: ${props.selectedPlant.scientificName}` : 'No plant selected'}
    </div>
    <div role="status" className="loading-spinner">Loading...</div>
  </div>
));
PlantTaxonomySelector.displayName = 'PlantTaxonomySelector';

export const PlantImageGallery = React.forwardRef<HTMLDivElement, any>((props, ref) => (
  <div ref={ref} role="region" aria-label="Plant image gallery">
    {props.images?.map((image: any, index: number) => (
      <img key={image.id || index} src={image.src} alt={image.alt} />
    ))}
  </div>
));
PlantImageGallery.displayName = 'PlantImageGallery';

// Mock Navigation Components
export const BottomNavigation = React.forwardRef<HTMLElement, any>((props, ref) => (
  <nav ref={ref} role="navigation" aria-label="Main navigation">
    <button aria-label="Plants">Plants</button>
    <button aria-label="Care">Care</button>
    <button aria-label="Profile">Profile</button>
  </nav>
));
BottomNavigation.displayName = 'BottomNavigation';

// Mock Care Components
export const CareDashboard = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  const [hasError, setHasError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showUndo, setShowUndo] = React.useState(false);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        if (global.fetch) {
          const response = await global.fetch('/api/care/dashboard');
          if (!response.ok) {
            throw new Error('Failed to load care data');
          }
        }
        setIsLoading(false);
      } catch (error) {
        setHasError(true);
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCareAction = async (careType: string) => {
    console.log(careType);
    
    // Simulate care action API call
    if (global.fetch) {
      try {
        await global.fetch('/api/care/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ careType }),
        });
        
        // Show undo button after successful care action
        setShowUndo(true);
      } catch (error) {
        console.error('Care action failed:', error);
      }
    } else {
      // If no fetch mock, still show undo for testing
      setShowUndo(true);
    }
  };

  if (hasError) {
    return (
      <div ref={ref} data-testid="care-dashboard">
        <div>Error loading care dashboard</div>
        <button onClick={() => { setHasError(false); setIsLoading(true); }}>Try again</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div ref={ref} data-testid="care-dashboard">
        <div>Loading care dashboard...</div>
      </div>
    );
  }

  return (
    <div ref={ref} data-testid="care-dashboard">
      <button onClick={() => handleCareAction('water')}>Water</button>
      <button onClick={() => handleCareAction('fertilizer')}>Fertilize</button>
      {showUndo && <button onClick={() => setShowUndo(false)}>Undo</button>}
    </div>
  );
});
CareDashboard.displayName = 'CareDashboard';

export const QuickCareForm = React.forwardRef<HTMLFormElement, any>((props, ref) => (
  <form ref={ref} onSubmit={(e) => { e.preventDefault(); props.onSuccess?.(); }}>
    <label htmlFor="care-type">Care Type</label>
    <select id="care-type" name="careType">
      <option value="water">Water</option>
      <option value="fertilizer">Fertilizer</option>
    </select>
    <button type="submit">Log Care</button>
    <button type="button" onClick={props.onCancel}>Cancel</button>
    <div>Care logged successfully!</div>
  </form>
));
QuickCareForm.displayName = 'QuickCareForm';

export const QuickCareActions = React.forwardRef<HTMLDivElement, any>((props, ref) => (
  <div ref={ref}>
    <button onClick={() => console.log('watered')}>Water</button>
    <div>Just watered</div>
  </div>
));
QuickCareActions.displayName = 'QuickCareActions';

// Mock Shared Components
export const Modal = React.forwardRef<HTMLDivElement, any>(({ isOpen, onClose, children, ...props }, ref) => {
  const modalRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    if (isOpen && modalRef.current) {
      // Focus the first focusable element
      const firstButton = modalRef.current.querySelector('button');
      if (firstButton) {
        firstButton.focus();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;
  
  return (
    <div ref={ref} className="modal-overlay" {...props}>
      <div ref={modalRef} className="modal-content">
        <button onClick={onClose}>Close</button>
        {children}
      </div>
    </div>
  );
});
Modal.displayName = 'Modal';

export const VirtualScrollList = React.forwardRef<HTMLDivElement, any>((props, ref) => (
  <div ref={ref} className="overflow-auto">
    <div style={{ position: 'relative' }}>
      <div style={{ transform: 'translateY(NaNpx)', position: 'absolute', top: 0, left: 0, right: 0 }}>
        {props.items?.map((item: any, index: number) => (
          <div key={index}>{props.renderItem(item)}</div>
        ))}
      </div>
    </div>
  </div>
));
VirtualScrollList.displayName = 'VirtualScrollList';

// Mock Import Components
export const CSVImportModal = React.forwardRef<HTMLDivElement, any>(({ isOpen, onClose, ...props }, ref) => {
  if (!isOpen) return null;
  
  return (
    <div ref={ref} className="modal-overlay">
      <div className="modal-content modal-content--large">
        <div className="modal-header">
          <h2 className="modal-title">Import CSV Data</h2>
          <button className="modal-close" title="Close">
            <svg className="lucide lucide-x w-5 h-5" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M18 6 6 18"/>
              <path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Import Type</h3>
              <p className="text-sm text-gray-600">Choose what type of data you want to import from your CSV file.</p>
            </div>
            <div className="grid gap-4">
              <div className="border rounded-xl transition-all duration-200 cursor-pointer border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm">
                <div className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-lg flex-shrink-0 bg-gray-100">
                      <svg className="lucide lucide-database w-6 h-6 text-gray-600" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <ellipse cx="12" cy="5" rx="9" ry="3"/>
                        <path d="M3 5V19A9 3 0 0 0 21 19V5"/>
                        <path d="M3 12A9 3 0 0 0 21 12"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">Plant Taxonomy</h4>
                        <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                          <svg className="lucide lucide-info w-4 h-4 text-gray-400" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 16v-4"/>
                            <path d="M12 8h.01"/>
                          </svg>
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Import plant species information with separate cultivar field support</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border rounded-xl transition-all duration-200 cursor-pointer border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm">
                <div className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-lg flex-shrink-0 bg-gray-100">
                      <svg className="lucide lucide-leaf w-6 h-6 text-gray-600" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
                        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">Plant Collection</h4>
                        <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                          <svg className="lucide lucide-info w-4 h-4 text-gray-400" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 16v-4"/>
                            <path d="M12 8h.01"/>
                          </svg>
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Import your plant instances with enhanced taxonomy and care schedules</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border rounded-xl transition-all duration-200 cursor-pointer border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm">
                <div className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-lg flex-shrink-0 bg-gray-100">
                      <svg className="lucide lucide-sprout w-6 h-6 text-gray-600" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3"/>
                        <path d="M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4"/>
                        <path d="M5 21h14"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">Propagations</h4>
                        <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                          <svg className="lucide lucide-info w-4 h-4 text-gray-400" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 16v-4"/>
                            <path d="M12 8h.01"/>
                          </svg>
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Import propagations with external source tracking (gifts, trades, purchases)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <label htmlFor="csv-upload">Choose file to upload</label>
            <input id="csv-upload" type="file" accept=".csv" />
            <div role="progressbar" aria-label="Upload progress">Uploading...</div>
          </div>
        </div>
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-2"></div>
          <div className="flex space-x-2">
            <button className="btn btn--outline" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
});
CSVImportModal.displayName = 'CSVImportModal';

// Mock Search Components
export const AdvancedSearchInterface = React.forwardRef<HTMLDivElement, any>((props, ref) => (
  <div ref={ref} className="advanced-search">
    <input type="text" placeholder="Search..." />
    <button disabled={props.loading}>Search</button>
    <div>Search suggestions</div>
  </div>
));
AdvancedSearchInterface.displayName = 'AdvancedSearchInterface';

// Mock Dashboard Components
export const DashboardClient = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  React.useEffect(() => {
    // Simulate multiple API calls
    const loadDashboardData = async () => {
      if (global.fetch) {
        try {
          await Promise.all([
            global.fetch('/api/plant-instances'),
            global.fetch('/api/propagations'),
            global.fetch('/api/care/recent'),
            global.fetch('/api/dashboard/stats'),
          ]);
        } catch (error) {
          console.error('Dashboard API error:', error);
        }
      }
    };

    loadDashboardData();
  }, []);

  return (
    <div ref={ref} data-testid="dashboard">
      <h1>Dashboard</h1>
      <p>Welcome, User {props.userId}</p>
      <input type="search" placeholder="Search..." />
    </div>
  );
});
DashboardClient.displayName = 'DashboardClient';

// Mock Care History Components
export const CareHistoryTimeline = React.forwardRef<HTMLDivElement, any>((props, ref) => (
  <div ref={ref} data-testid="care-history-timeline">
    <div>Care entry 1</div>
    <div>Care entry 2</div>
  </div>
));
CareHistoryTimeline.displayName = 'CareHistoryTimeline';

// Mock Performance Components
export const PerformanceMonitor = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  React.useEffect(() => {
    if (performance && performance.mark) {
      performance.mark('app-start');
    }
  }, []);

  return (
    <div ref={ref} data-testid="performance-monitor">
      Performance monitoring active
    </div>
  );
});
PerformanceMonitor.displayName = 'PerformanceMonitor';

// Mock Offline Components
export const OfflineManager = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  React.useEffect(() => {
    const handleOnline = async () => {
      // Simulate sync when coming online
      if (global.fetch) {
        try {
          await global.fetch('/api/offline/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pendingEntries: [{ id: 'temp-1' }] }),
          });
        } catch (error) {
          console.error('Sync error:', error);
        }
      }
    };
    
    const handleOffline = () => {};
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const interval = setInterval(() => {
      // Sync check
    }, 30000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <div ref={ref} data-testid="offline-manager">
      Offline manager active
    </div>
  );
});
OfflineManager.displayName = 'OfflineManager';

// Mock Auth Components
export const UserProvider = React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => {
  React.useEffect(() => {
    // Simulate loading user preferences
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      localStorage.getItem('user-preferences');
    }
  }, []);

  return (
    <div ref={ref} data-testid="user-provider">
      {children}
    </div>
  );
});
UserProvider.displayName = 'UserProvider';

// Default exports for components that use default export
export default {
  PlantsGrid,
  PlantCard,
  PlantCardSkeleton,
  PlantInstanceForm,
  PlantTaxonomyForm,
  PlantTaxonomySelector,
  PlantImageGallery,
  BottomNavigation,
  CareDashboard,
  QuickCareForm,
  QuickCareActions,
  Modal,
  VirtualScrollList,
  CSVImportModal,
  AdvancedSearchInterface,
  DashboardClient,
  CareHistoryTimeline,
  PerformanceMonitor,
  OfflineManager,
  UserProvider,
};