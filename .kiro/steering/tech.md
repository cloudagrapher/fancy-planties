---
inclusion: always
---

# Technology Stack and Architecture Rules

## Framework: Next.js 15 App Router

### Critical Client/Server Separation

**MANDATORY: Strict boundary enforcement between client and server components**

#### Server Components (Default)

- All files in `src/app/` are server components by default
- **Can use**: Node.js modules (`fs`, `net`, `tls`), `next/headers`, database connections
- **Cannot use**: React hooks, browser APIs, event handlers
- **Pattern**: Use `async` functions for data fetching

#### Client Components (with 'use client')

- **Must have**: `'use client'` directive at the top
- **Can use**: React hooks, browser APIs, event handlers
- **Cannot use**: Node.js modules, `next/headers`, server-only utilities
- **Pattern**: Call server functions via API routes

## Authentication Architecture

### Required File Structure

```text
src/lib/auth/
├── lucia.ts       # Lucia instance only (import 'server-only')
├── server.ts      # Server functions (import 'server-only')
├── client.ts      # Client-safe utilities (NO server imports)
├── index.ts       # Core auth (import 'server-only')
└── session.ts     # Re-exports client utilities only
```

### Import Rules by Context

- **API routes**: `import { validateRequest } from '@/lib/auth/server'`
- **Server pages**: `import { requireAuthSession } from '@/lib/auth/server'`
- **Client components**: `import { signInClient } from '@/lib/auth/client'`

## Database Access Rules

### Mandatory Server-Only Directive

All database files must start with:

```typescript
import 'server-only';
```

### Files Requiring server-only

- `/lib/db/index.ts`
- `/lib/db/migrations.ts`
- `/lib/db/queries/*.ts`
- `/lib/auth/index.ts`
- `/lib/auth/server.ts`
- `/lib/auth/lucia.ts`

## Build Configuration

### Required next.config.ts

```typescript
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // Prevent lint errors from blocking builds
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        perf_hooks: false,
      };
    }
    return config;
  },
};
```

### Required Dependencies

```bash
npm install server-only
```

## Component Patterns

### Mixed Server/Client Pattern

```typescript
// page.tsx (Server Component)
import { requireAuthSession } from '@/lib/auth/server';
import PageClient from './PageClient';

export default async function Page() {
  const { user } = await requireAuthSession();
  return <PageClient userId={user.id} />;
}

// PageClient.tsx (Client Component)
'use client';
import { useState } from 'react';

export default function PageClient({ userId }) {
  // Client logic here
}
```

## Technology Stack

- **Next.js**: 15.5.2 with App Router
- **React**: 19.x
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Lucia Auth with PostgreSQL adapter
- **Styling**: Tailwind CSS v4
- **Testing**: Jest with Next.js integration

## Build Commands

- `npm run build` - Production build (webpack, not Turbopack)
- `npm run dev` - Development with Turbopack
- `npm run lint` - ESLint check
- `npm test` - Jest tests

## Critical Rules

### NEVER DO

1. Import Node.js modules in client components
2. Import `next/headers` in client components
3. Create circular dependencies in auth modules
4. Mix client and server code in single files with `'use client'`
5. Forget `import 'server-only';` in database/auth files
6. Import `validateRequest` from `@/lib/auth` (use `@/lib/auth/server`)

### ALWAYS DO

1. Mark database files with `import 'server-only';`
2. Separate client/server components into different files
3. Import auth functions from correct modules (`/server` vs `/client`)
4. Use webpack fallbacks for Node.js modules
5. Test both development and production builds
6. Keep Lucia instance isolated to prevent circular dependencies