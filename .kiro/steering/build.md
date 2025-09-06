---
inclusion: always
---

# Build and Development Guidelines

## Critical Build Requirements

### Required Dependencies

Always install before implementing auth/database code:

```bash
npm install server-only
```

### Mandatory File Headers

All database and auth files MUST start with:

```typescript
import 'server-only';
```

**Files requiring this header:**
- `/lib/db/index.ts`
- `/lib/db/migrations.ts`
- `/lib/db/queries/*.ts`
- `/lib/auth/index.ts`
- `/lib/auth/server.ts`
- `/lib/auth/lucia.ts`

## Build Commands

### Development

```bash
npm run dev    # Uses Turbopack for fast development
```

### Production

```bash
npm run build  # Uses webpack (not Turbopack)
npm run start  # Test production server
```

## Build Error Prevention

### Required next.config.ts Configuration

```typescript
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // Prevent ESLint blocking builds
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
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

### Common Build Errors

#### "Can't resolve 'fs'" Error

- **Cause**: Client bundle including Node.js modules
- **Fix**: Add webpack fallbacks above

#### "Component needs 'server-only'" Error

- **Cause**: Client component importing server module
- **Fix**: Use server wrapper + client component pattern

#### "Cannot access before initialization" Error

- **Cause**: Circular dependency
- **Fix**: Break circular imports with dedicated files

#### "Module has no exported member" Error

- **Cause**: Wrong auth import path
- **Fix**: Import from `@/lib/auth/server` not `@/lib/auth`

## Build Success Checklist

Before any deployment:

- [ ] `npm run build` completes without errors
- [ ] All pages appear in build output table
- [ ] No TypeScript compilation errors
- [ ] Service worker generated (PWA)
- [ ] Authentication flows tested
- [ ] Database connections verified

## Performance Guidelines

### Bundle Optimization

- Monitor First Load JS metrics in build output
- Ensure code splitting is working
- Check bundle sizes for large increases

### Development Speed

- Use Turbopack in development (`npm run dev`)
- Skip linting during builds if needed
- Implement proper caching strategies

## Architecture Enforcement

### Never Do

- Mix server and client code in files with `'use client'`
- Import Node.js modules in client components
- Forget `import 'server-only';` in database/auth files
- Create circular dependencies in auth modules

### Always Do

- Test both development and production builds
- Separate server/client components into different files
- Use correct auth import paths (`/server` vs `/client`)
- Verify webpack fallbacks are configured
