# Task 1.1: Database Migration for Propagation Status - Summary

## Migration File Created
- **File**: `drizzle/0005_update_propagation_status.sql`
- **Purpose**: Update propagation status enum from `['started', 'rooting', 'planted', 'established']` to `['started', 'rooting', 'ready', 'planted']`

## Migration Steps
1. **Data Migration**: Updates all existing records with status 'established' to 'ready'
2. **Constraint Update**: Drops existing check constraint and adds new one with updated enum values
3. **Format**: Follows Drizzle migration format with statement breakpoints

## Schema Updates
Updated `src/lib/db/schema.ts`:
- Changed propagations table status enum to new values

## Validation Schema Updates
Updated `src/lib/validation/propagation-schemas.ts`:
- All Zod schemas now use new status enum values
- Affects: propagationSchema, propagationStatusUpdateSchema, propagationFilterSchema, bulkPropagationOperationSchema, advancedPropagationSearchSchema

## Query Function Updates
Updated `src/lib/db/queries/propagations.ts`:
- `getByStatus()`: Updated type signature
- `updateStatus()`: Updated type signature
- `convertToPlantInstance()`: Now sets status to 'planted' instead of 'established'
- `getStats()`: Updated to track 'ready' and 'planted' separately, renamed `averageDaysToEstablished` to `averageDaysToReady`
- `getActive()`: Now filters for non-'planted' propagations instead of non-'established'

Updated `src/lib/db/query-optimization.ts`:
- `getUserPropagationsByStatus()`: Updated type signature

## Component Updates
Updated `src/components/propagations/PropagationCard.tsx`:
- Status configuration now includes 'ready' and 'planted' with appropriate labels and colors
- 'ready' status shows "Convert to Plant" action
- 'planted' is final status with no next action

Updated `src/components/plants/PlantLineage.tsx`:
- Progress timeline now shows: Started → Rooting → Ready → Planted
- Success rate calculation includes both 'ready' and 'planted' statuses
- Active propagations count excludes 'planted' status
- Status colors and emojis updated

Updated `src/components/shared/DashboardStatistics.tsx`:
- Renamed `averageDaysToEstablished` to `averageDaysToReady`
- Display label updated to "Avg Days to Ready"

## Semantic Changes
- **'established' → 'ready'**: Indicates propagation is ready to be converted to a plant instance
- **'planted'**: New final status after conversion, replaces old 'established' as terminal state
- **Success metrics**: Now based on reaching 'ready' or 'planted' status
- **Active propagations**: Defined as those not yet 'planted'

## Testing Notes
- Migration file follows correct Drizzle format with statement breakpoints
- All TypeScript type signatures updated consistently
- No compilation errors in updated files
- Migration cannot be tested without database connection
- When database is available, run: `npm run db:setup -- migrate`

## Requirements Addressed
- Requirement 6: Status enum updated to new values
- Requirement 7: Data migration handles existing 'established' records
