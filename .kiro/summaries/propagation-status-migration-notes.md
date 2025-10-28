# Propagation Status Migration - Task 1.1 Completion Notes

## Migration File Created

**File:** `drizzle/0005_update_propagation_status.sql`

### Migration Contents:
1. Updates all existing 'established' status records to 'ready'
2. Drops the existing check constraint (if it exists)
3. Adds new check constraint with updated enum values: `['started', 'rooting', 'ready', 'planted']`

## Testing Required (When Database is Available)

### 1. Run Migration
```bash
npm run db:setup -- migrate
```

### 2. Verify Migration Success
- Check that all 'established' records are now 'ready'
- Verify the check constraint is updated
- Test inserting new propagations with 'ready' status
- Ensure 'established' status is rejected

### 3. SQL Verification Queries
```sql
-- Check if any 'established' records remain
SELECT COUNT(*) FROM propagations WHERE status = 'established';
-- Should return 0

-- Check constraint exists
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'propagations'::regclass 
AND conname = 'propagations_status_check';

-- Test valid status values
SELECT DISTINCT status FROM propagations;
-- Should only show: started, rooting, ready, planted
```

## Files That Still Reference 'established' (Need Updates in Subsequent Tasks)

These files will be updated in later tasks as part of the implementation plan:

### Backend Files:
- `src/lib/db/schema.ts` - Line 127 (Task 1.2)
- `src/lib/db/queries/propagations.ts` - Multiple locations (Task 2.2)
- `src/lib/validation/propagation-schemas.ts` - Multiple schemas (Task 2.1)
- `src/lib/db/query-optimization.ts` - Type definitions

### Frontend Files:
- `src/components/propagations/PropagationDashboard.tsx` - statusConfig (Task 3.1)
- `src/components/propagations/PropagationCard.tsx` - Status display (Task 3.4)
- `src/components/plants/PlantLineage.tsx` - Status colors and timeline
- `src/components/shared/DashboardStatistics.tsx` - Statistics display

## Migration Safety Notes

- The migration uses `IF EXISTS` for the constraint drop to prevent errors
- Data migration happens before constraint changes to ensure no data loss
- The migration is idempotent - can be run multiple times safely
- All existing 'established' records will be preserved as 'ready'

## Next Steps

After this migration is successfully applied:
1. Update schema.ts enum (Task 1.2)
2. Update API validation schemas (Task 2.1)
3. Update query functions (Task 2.2)
4. Update frontend components (Tasks 3.1-3.4)
