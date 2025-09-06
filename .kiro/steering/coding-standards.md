---
inclusion: always
---

# Coding Standards and Error Prevention

## TypeScript Strict Type Safety

### Next.js Route Parameters

**CRITICAL**: Next.js 15 route handlers require specific parameter types.

```typescript
// ❌ WRONG - Generic params type
export async function POST(
  request: Request,
  { params }: { params: { id: string } }  // This will fail build
) {}

// ✅ CORRECT - Use NextJS types
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }  // Next.js 15 async params
) {
  const { id } = await context.params;  // Must await params
}
```

### Zod Error Handling

**CRITICAL**: ZodError properties have specific access patterns.

```typescript
// ❌ WRONG - Direct .errors access
import { z } from 'zod';

try {
  schema.parse(data);
} catch (error) {
  if (error instanceof z.ZodError) {
    return { error: error.errors };  // Property 'errors' does not exist
  }
}

// ✅ CORRECT - Use .issues property
try {
  schema.parse(data);
} catch (error) {
  if (error instanceof z.ZodError) {
    return { error: error.issues };  // Use .issues, not .errors
  }
}
```

### String Index Signatures

**CRITICAL**: TypeScript requires explicit index signatures for dynamic object access.

```typescript
// ❌ WRONG - No index signature
const statusConfig = {
  started: { label: 'Started' },
  rooting: { label: 'Rooting' }
};

const status: string = 'started';
const config = statusConfig[status];  // Type error

// ✅ CORRECT - Add index signature or type assertion
const statusConfig: Record<string, { label: string }> = {
  started: { label: 'Started' },
  rooting: { label: 'Rooting' }
};

// OR use type assertion for known keys
const config = statusConfig[status as keyof typeof statusConfig];
```

### Component Prop Interface Matching

**CRITICAL**: Component props must exactly match their interface definitions.

```typescript
// ❌ WRONG - Passing undefined props
interface ComponentProps {
  value: string;
  onChange: (value: string) => void;
}

// Don't pass props that aren't in interface
<Component 
  value={value}
  onChange={onChange}
  extraProp={data}  // Error: not in interface
/>

// ✅ CORRECT - Match interface exactly
<Component 
  value={value}
  onChange={onChange}
/>
```

## Component Architecture Standards

### Prop Interface Definitions

**MANDATORY**: Always define and export prop interfaces.

```typescript
// ✅ Define clear interfaces
export interface PlantTaxonomySelectorProps {
  selectedPlant: Plant | null;
  onSelect: (plant: Plant) => void;  // Use onSelect, not onPlantSelect
  placeholder?: string;
}

export function PlantTaxonomySelector(props: PlantTaxonomySelectorProps) {
  // Implementation
}
```

### Children Prop Pattern

```typescript
// ❌ WRONG - Children not in interface
interface Props {
  onUpload: (data: string) => void;
}

function Component({ children, onUpload }: Props & { children: React.ReactNode }) {
  // TypeScript error - children not in Props
}

// ✅ CORRECT - Include children in interface
interface Props {
  children?: React.ReactNode;
  onUpload: (data: string) => void;
}

function Component({ children, onUpload }: Props) {
  // Works correctly
}
```

## API Route Standards

### Request/Response Types

```typescript
import { NextRequest, NextResponse } from 'next/server';

// ✅ Always use proper Next.js types
export async function GET(request: NextRequest) {
  return NextResponse.json({ data: 'success' });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;  // Always await params in Next.js 15
  const body = await request.json();
  
  return NextResponse.json({ success: true });
}
```

### Error Response Patterns

```typescript
// ✅ Consistent error handling
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const schema = z.object({
      name: z.string(),
    });
    
    const body = await request.json();
    const validated = schema.parse(body);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },  // Use .issues
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Database Query Patterns

### Type-Safe Queries

```typescript
import 'server-only';  // Always required
import { db } from '@/lib/db';
import { propagations, plants } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// ✅ Proper query with user filtering
export async function getUserPropagations(userId: number) {
  return await db
    .select()
    .from(propagations)
    .leftJoin(plants, eq(propagations.plantId, plants.id))
    .where(eq(propagations.userId, userId));  // Always filter by user
}
```

## Build-Time Error Prevention

### Pre-Commit Checklist

Before any code changes:

1. **Type Check**: Ensure TypeScript compilation passes
2. **Interface Matching**: Verify all component props match their interfaces  
3. **Import Validation**: Check all imports resolve correctly
4. **Error Handling**: Use correct Zod error properties (.issues not .errors)
5. **Next.js Types**: Use NextRequest/NextResponse and await params

### Common Error Patterns to Avoid

```typescript
// ❌ These patterns will cause build failures

// 1. Wrong Next.js route params
{ params }: { params: { id: string } }  // Not async

// 2. Wrong Zod error access  
error.errors  // Should be error.issues

// 3. Missing index signatures
object[dynamicKey]  // Without proper typing

// 4. Mismatched component props
<Component extraProp={value} />  // Not in interface

// 5. Missing server-only directive
// Database file without 'import server-only';'
```

### Build Validation Commands

```bash
# Always run these before committing
npm run build  # Must pass without errors
npm run lint   # Check for code issues  
npm run test   # Verify functionality
```

## Critical Rules for AI Coding

### ALWAYS DO

1. **Check interface compatibility** before adding props to components
2. **Use .issues not .errors** for Zod error handling  
3. **Await params** in Next.js 15 route handlers
4. **Add index signatures** for dynamic object access
5. **Validate TypeScript compilation** before suggesting code

### NEVER DO

1. Use `params: { id: string }` directly in Next.js 15 routes
2. Access `.errors` property on ZodError objects
3. Pass props not defined in component interfaces
4. Create components without proper TypeScript interfaces
5. Submit code that fails `npm run build`

### Debugging Build Errors

When encountering TypeScript errors:

1. **Read the full error message** - it contains the exact issue
2. **Check interface definitions** - ensure props match exactly  
3. **Verify import paths** - use correct Next.js types
4. **Test with simple cases** - isolate the problematic code
5. **Use type assertions carefully** - prefer proper interfaces

This document prevents the most common build failures and ensures code quality standards.