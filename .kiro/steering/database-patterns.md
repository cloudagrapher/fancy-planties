---
inclusion: fileMatch
fileMatchPattern: "**/*{service,query,db}*.ts"
---

# Database Operations and Schema Compliance

## Critical Database Rules

### ALWAYS Check Schema First

Before any database operation:
1. **Read the schema file** - `src/lib/db/schema.ts`
2. **Identify required fields** - Fields without `.default()` or `.nullable()`
3. **Match field names exactly** - No typos or variations
4. **Follow field types** - String, number, Date, etc.

### Required Schema Reference

```typescript
#[[file:src/lib/db/schema.ts]]
```

## Care History Table Operations

### Schema Requirements (Example)

```typescript
// Typical care history schema structure
export const careHistory = pgTable('care_history', {
  id: serial('id').primaryKey(),
  plantInstanceId: integer('plant_instance_id').notNull(),
  careType: varchar('care_type').notNull(),
  careDate: timestamp('care_date').notNull(),
  notes: text('notes'),
  images: json('images').$type<string[]>(),
  // Note: userId may or may not exist - check schema!
});
```

### Correct Insert Pattern

```typescript
// ✅ ALWAYS follow this pattern
import 'server-only';
import { db } from '@/lib/db';
import { careHistory } from '@/lib/db/schema';

export async function createCareEntry(data: {
  plantInstanceId: number;
  careType: string;
  notes?: string;
  images?: string[];
}) {
  return await db.insert(careHistory).values({
    plantInstanceId: data.plantInstanceId,
    careType: data.careType,
    careDate: new Date(),           // Required field
    notes: data.notes || null,      // Optional field
    images: data.images || null     // Optional field
    // Do NOT add userId unless it exists in schema
  });
}
```

## Common Database Mistakes

### Field Name Mismatches

```typescript
// ❌ WRONG - Common field name mistakes
await db.insert(careHistory).values({
  createdAt: new Date(),        // Schema has 'careDate'
  plantId: 123,                 // Schema has 'plantInstanceId'
  type: 'water',                // Schema has 'careType'
});

// ✅ CORRECT - Exact schema field names
await db.insert(careHistory).values({
  careDate: new Date(),         // Matches schema
  plantInstanceId: 123,         // Matches schema
  careType: 'water',            // Matches schema
});
```

### Missing Required Fields

```typescript
// ❌ WRONG - Missing required fields
await db.insert(careHistory).values({
  plantInstanceId: 123,
  careType: 'water'
  // Missing careDate (required)
});

// ✅ CORRECT - All required fields included
await db.insert(careHistory).values({
  plantInstanceId: 123,
  careType: 'water',
  careDate: new Date()  // Required field included
});
```

### Extra Fields Not in Schema

```typescript
// ❌ WRONG - Fields not in schema
await db.insert(careHistory).values({
  plantInstanceId: 123,
  careType: 'water',
  careDate: new Date(),
  userId: 456,          // Not in schema (common mistake)
  timestamp: new Date() // Not in schema
});

// ✅ CORRECT - Only schema fields
await db.insert(careHistory).values({
  plantInstanceId: 123,
  careType: 'water',
  careDate: new Date()
  // Only fields that exist in schema
});
```

## Drizzle ORM Best Practices

### Type-Safe Queries

```typescript
// ✅ Always use proper Drizzle patterns
import { eq, and, desc } from 'drizzle-orm';

// Query with proper filtering
export async function getUserCareHistory(userId: number, plantInstanceId?: number) {
  const conditions = [eq(plants.userId, userId)]; // Assuming plants table has userId
  
  if (plantInstanceId) {
    conditions.push(eq(careHistory.plantInstanceId, plantInstanceId));
  }
  
  return await db
    .select()
    .from(careHistory)
    .leftJoin(plants, eq(careHistory.plantInstanceId, plants.id))
    .where(and(...conditions))
    .orderBy(desc(careHistory.careDate));
}
```

### Batch Operations

```typescript
// ✅ Proper batch insert pattern
export async function processPendingCareEntries(entries: PendingCareEntry[]) {
  const results = [];
  
  for (const entry of entries) {
    try {
      const result = await db.insert(careHistory).values({
        plantInstanceId: entry.plantInstanceId,
        careType: entry.careType,
        careDate: new Date(),  // Always required
        notes: entry.notes || null
        // Only include fields that exist in schema
      });
      
      results.push({ success: true, entry, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      results.push({ success: false, entry, error: message });
    }
  }
  
  return results;
}
```

## Database File Structure

### Required Imports

```typescript
import 'server-only';  // MANDATORY for all database files
import { db } from '@/lib/db';
import { tableNames } from '@/lib/db/schema';
import { eq, and, or, desc, asc } from 'drizzle-orm';
```

### Service Layer Pattern

```typescript
// src/lib/services/care-service.ts
import 'server-only';
import { db } from '@/lib/db';
import { careHistory, plants } from '@/lib/db/schema';

export class CareService {
  static async logCare(data: CareLogData) {
    // Validate against schema first
    return await db.insert(careHistory).values({
      // Only schema fields here
    });
  }
  
  static async getCareHistory(userId: number) {
    return await db
      .select()
      .from(careHistory)
      .leftJoin(plants, eq(careHistory.plantInstanceId, plants.id))
      .where(eq(plants.userId, userId));  // User filtering
  }
}
```

## Pre-Operation Checklist

Before any database operation:

1. ✅ **Read schema definition** for the target table
2. ✅ **Identify all required fields** (no default, no nullable)
3. ✅ **Match field names exactly** (careDate vs createdAt)
4. ✅ **Include user filtering** for data isolation
5. ✅ **Add error handling** with proper TypeScript types
6. ✅ **Test with TypeScript compilation** (`npm run build`)

## Schema Validation Commands

```bash
# Verify schema changes
npm run db:generate  # Generate migration from schema
npm run db:push      # Push schema directly (dev only)
npm run build        # Verify TypeScript compilation
```

This ensures all database operations are type-safe and schema-compliant.