/**
 * Dynamic import utilities for code splitting and performance optimization
 */

import { lazy } from 'react';

// Lazy load heavy components for better performance
export const LazyPlantDetailModal = lazy(() => import('@/components/plants/PlantDetailModal'));
export const LazyCSVImportModal = lazy(() => import('@/components/import/CSVImportModal'));
export const LazyAdvancedSearchInterface = lazy(() => import('@/components/search/AdvancedSearchInterface'));
export const LazyPropagationForm = lazy(() => import('@/components/propagations/PropagationForm'));
export const LazyPlantInstanceForm = lazy(() => import('@/components/plants/PlantInstanceForm'));
export const LazyCareGuideForm = lazy(() => import('@/components/handbook/CareGuideForm'));
export const LazyFertilizerCalendar = lazy(() => import('@/components/calendar/FertilizerCalendar'));

// Lazy load dashboard components for tab-based loading
export const LazyCareDashboard = lazy(() => import('@/components/care/CareDashboard'));
export const LazyPropagationDashboard = lazy(() => import('@/components/propagations/PropagationDashboard'));
export const LazyHandbookDashboard = lazy(() => import('@/components/handbook/HandbookDashboard'));

// Lazy load complex forms and modals
export const LazyPlantTaxonomyForm = lazy(() => import('@/components/plants/PlantTaxonomyForm'));
export const LazyDataImport = lazy(() => import('@/components/import/DataImport'));

// Preload functions for better UX
export const preloadPlantDetailModal = () => import('@/components/plants/PlantDetailModal');
export const preloadCSVImportModal = () => import('@/components/import/CSVImportModal');
export const preloadAdvancedSearch = () => import('@/components/search/AdvancedSearchInterface');
export const preloadPropagationForm = () => import('@/components/propagations/PropagationForm');
export const preloadPlantInstanceForm = () => import('@/components/plants/PlantInstanceForm');

// Bundle splitting configuration
export const componentBundles = {
  // Core components (always loaded)
  core: [
    'PlantCard',
    'PlantsGrid', 
    'BottomNavigation',
    'AuthGuard'
  ],
  
  // Modal components (lazy loaded)
  modals: [
    'PlantDetailModal',
    'CSVImportModal',
    'PlantInstanceForm',
    'PropagationForm'
  ],
  
  // Dashboard components (tab-based loading)
  dashboards: [
    'CareDashboard',
    'PropagationDashboard', 
    'HandbookDashboard'
  ],
  
  // Advanced features (lazy loaded)
  advanced: [
    'AdvancedSearchInterface',
    'FertilizerCalendar',
    'CareGuideForm',
    'DataImport'
  ]
};