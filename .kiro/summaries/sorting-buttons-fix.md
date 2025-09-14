# Sorting Buttons Fix

## Issue
The sorting buttons in the PlantSearchFilter component were not working after upgrading to use `EnhancedPlantInstanceFilter`.

## Root Cause
The `PlantSearchFilter` component was still expecting the old `PlantInstanceFilter` type in its props interface, but the `PlantsGrid` component was now passing `EnhancedPlantInstanceFilter`. This type mismatch prevented the sorting functionality from working correctly.

## Solution
Updated the `PlantSearchFilter` component to use `EnhancedPlantInstanceFilter`:

### Changes Made

1. **Updated Props Interface**:
   ```typescript
   // Before
   filters: PlantInstanceFilter;
   onFilterChange: (filters: Partial<PlantInstanceFilter>) => void;
   
   // After  
   filters: EnhancedPlantInstanceFilter;
   onFilterChange: (filters: Partial<EnhancedPlantInstanceFilter>) => void;
   ```

2. **Updated Filter Change Handler**:
   ```typescript
   // Before
   const handleFilterChange = useCallback((key: keyof PlantInstanceFilter, value: ...) => {
   
   // After
   const handleFilterChange = useCallback((key: keyof EnhancedPlantInstanceFilter, value: ...) => {
   ```

3. **Simplified Enhanced Filter Changes**:
   ```typescript
   // Before - complex backward compatibility logic
   onFilterChange({
     location: newFilters.location,
     overdueOnly: newFilters.overdueOnly,
     // ... individual fields
   });
   
   // After - direct pass-through
   onFilterChange(newFilters);
   ```

4. **Updated Clear Filters Function**:
   ```typescript
   // Now creates a proper EnhancedPlantInstanceFilter object
   const clearedFilters: EnhancedPlantInstanceFilter = {
     userId: filters.userId,
     overdueOnly: false,
     isActive: true,
     limit: 20,
     offset: 0,
     sortBy: 'created_at',
     sortOrder: 'desc',
     includeStats: false,
     includeFacets: false,
   };
   ```

## Result
✅ **Sorting buttons now work correctly**
✅ **Type safety maintained throughout the component chain**
✅ **Visual indicators (↑↓) show current sort direction**
✅ **All filter functionality preserved**

## How Sorting Works Now
1. User clicks sort button (e.g., "Name", "Location")
2. `handleSortChange` is called in `PlantSearchFilter`
3. Updates `enhancedFilters` state in `PlantsGrid` with new `sortBy`/`sortOrder`
4. Triggers new API call with updated sorting parameters
5. Plant grid re-renders with sorted results
6. Visual indicator shows active sort field and direction

## Available Sort Options
- **Name** - Sort by plant nickname
- **Location** - Sort by plant location
- **Date Added** - Sort by creation date
- **Last Fertilized** - Sort by last fertilizer date
- **Care Due** - Sort by fertilizer due date
- **Care Priority** - Sort by care urgency
- **Plant Type** - Sort by plant taxonomy name

Each sort option toggles between ascending (↑) and descending (↓) order when clicked repeatedly.