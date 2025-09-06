# File Organization and Architecture

## Project Structure

```
src/
├── app/                    # Next.js App Router (Server Components)
│   ├── api/               # API routes (always server-side)
│   ├── auth/              # Auth pages (server components)
│   └── dashboard/         # Main app pages (server components)
├── components/            # React components (mark client with 'use client')
├── lib/                   # Server-side utilities and business logic
│   ├── auth/             # Authentication system (server-only)
│   ├── db/               # Database layer (server-only)
│   ├── services/         # Business logic (server-only)
│   └── types/            # TypeScript definitions
└── hooks/                # Client-side React hooks ('use client')
```

## Critical Architecture Patterns

### Authentication Layer Separation

**Server-Only Files** (must have `import 'server-only';`):
- `/lib/auth/lucia.ts` - Lucia instance
- `/lib/auth/server.ts` - Server functions (cookies, redirect)
- `/lib/auth/index.ts` - Core auth logic
- `/lib/db/index.ts` - Database connection
- `/lib/db/migrations.ts` - Migration utilities

**Client-Safe Files** (no server imports):
- `/lib/auth/client.ts` - Browser-safe auth utilities
- `/lib/auth/session.ts` - Re-exports client utilities
- `/components/**/*.tsx` - UI components
- `/hooks/**/*.ts` - React hooks

### Component Organization

**Server Component Pattern** (default in `/app/`):
```typescript
// No 'use client' directive
export default async function ServerPage() {
  const data = await serverFunction(); // ✅ Can call server functions
  return <ClientComponent data={data} />;
}
```

**Client Component Pattern** (explicit `'use client'`):
```typescript
'use client';
import { useState } from 'react'; // ✅ Can use React hooks

export default function ClientComponent({ data }) {
  const [state, setState] = useState(data);
  // Cannot call server functions directly ❌
}
```

**Mixed Pattern** (separate files):
```typescript
// page.tsx (Server)
import { getServerData } from '@/lib/server-only-module';
import PageClient from './PageClient';

export default async function Page() {
  const data = await getServerData();
  return <PageClient data={data} />;
}

// PageClient.tsx (Client) 
'use client';
export default function PageClient({ data }) {
  // Client logic
}
```

## Database Layer

### Required Structure
```
src/lib/db/
├── index.ts           # Connection (server-only)
├── schema.ts          # Drizzle schema  
├── migrations.ts      # Migration utils (server-only)
└── queries/           # Query functions (server-only)
    ├── care-history.ts
    ├── plant-instances.ts
    └── users.ts
```

### Every Database File Must Start With:
```typescript
import 'server-only';
```

## API Routes

**All API routes are server-side by default**
- Location: `/src/app/api/`
- Can import database and auth modules
- Pattern: Export named HTTP methods (GET, POST, etc.)

## Component Guidelines

### When to Use Server Components
- Data fetching from database
- Authentication checks
- Server-side logic
- SEO-critical pages

### When to Use Client Components  
- Interactive UI (forms, modals)
- React hooks (useState, useEffect)
- Browser APIs
- Event handlers

### File Naming Conventions
- **Server pages**: `page.tsx` (in app directory)
- **Client components**: `ComponentName.tsx` with `'use client'`
- **Mixed pattern**: `page.tsx` + `PageClient.tsx`
- **API routes**: `route.ts`

## Import Patterns

### Authentication Imports
```typescript
// API routes and server components
import { validateRequest } from '@/lib/auth/server';

// Client components  
import { signInClient } from '@/lib/auth/client';

// Database functions
import { getUserById } from '@/lib/auth'; // Core functions
```

### Database Imports
```typescript  
// Only in server components and API routes
import { db } from '@/lib/db';
import { getUserPlants } from '@/lib/db/queries/plant-instances';
```

### Client-Safe Imports
```typescript
// Client components
import { User, Session } from '@/lib/auth/client';
import { PlantInstance } from '@/lib/types/plant-types';
```

## Build Considerations

### Files That Must Be Server-Only
1. Anything importing Node.js modules (`fs`, `net`, `tls`)
2. Database connection and query files  
3. Authentication server logic
4. Migration and setup scripts

### Files That Can Be Client-Safe
1. Type definitions
2. Client-side utilities  
3. React components (with 'use client')
4. Browser-specific helpers

## Testing Structure

```
src/
├── __tests__/         # Global tests
├── components/
│   └── __tests__/     # Component tests  
└── lib/
    └── __tests__/     # Utility tests
```

## Common Pitfalls to Avoid

1. **Circular Dependencies**: Never have auth/server.ts import from auth/index.ts if index.ts exports from server.ts
2. **Mixed Components**: Don't put server logic in files marked with 'use client'  
3. **Wrong Imports**: Don't import server modules in client components
4. **Missing Directives**: Always add 'server-only' to database/auth files

This structure ensures clean separation of concerns and prevents the build issues that occur when client and server boundaries are violated.