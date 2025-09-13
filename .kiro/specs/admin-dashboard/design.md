# Design Document

## Overview

The admin dashboard is a comprehensive management interface for curators to oversee users, manage plant taxonomy, and maintain data quality. The design follows the existing application patterns using Next.js 15 App Router with server components for data fetching and client components for interactivity. The dashboard integrates seamlessly with the current authentication system and maintains the application's design language while providing powerful administrative tools.

## Architecture

### Authentication & Authorization

The admin dashboard leverages the existing authentication system with curator-level access control:

- **Server-side Authorization**: Extend `requireVerifiedSession()` to create `requireCuratorSession()`
- **Route Protection**: All admin routes protected at the layout level
- **Navigation Integration**: Conditional admin link in main navigation for curators
- **Session Validation**: Real-time curator status checking to handle privilege revocation

### Route Structure

```
/admin/
├── layout.tsx          # Admin layout with navigation
├── page.tsx           # Dashboard overview (analytics)
├── users/
│   ├── page.tsx       # User management table
│   └── [id]/
│       └── page.tsx   # User detail/edit
├── plants/
│   ├── page.tsx       # Verified plants management
│   ├── pending/
│   │   └── page.tsx   # Plant approval queue
│   └── [id]/
│       └── page.tsx   # Plant detail/edit
├── taxonomy/
│   └── page.tsx       # Taxonomy hierarchy management
└── audit/
    └── page.tsx       # Audit logs and system activity
```

### Component Architecture

Following the existing mixed server/client pattern:

- **Server Pages**: Data fetching, authentication, initial rendering
- **Client Components**: Interactive tables, forms, real-time updates
- **Shared Components**: Reuse existing UI components (cards, buttons, navigation)

## Components and Interfaces

### Core Admin Components

#### AdminLayout
```typescript
interface AdminLayoutProps {
  children: React.ReactNode;
}

// Server component that validates curator access
export default async function AdminLayout({ children }: AdminLayoutProps)
```

#### AdminNavigation
```typescript
interface AdminNavigationProps {
  currentPath: string;
  pendingApprovals: number;
}

// Client component for admin navigation with active states
export default function AdminNavigation(props: AdminNavigationProps)
```

#### UserManagementTable
```typescript
interface UserManagementTableProps {
  users: UserWithStats[];
  currentUserId: number;
  totalCount: number;
  page: number;
  pageSize: number;
}

interface UserWithStats {
  id: number;
  name: string;
  email: string;
  isCurator: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  plantCount: number;
  propagationCount: number;
  lastActive?: string;
}
```

#### PlantManagementTable
```typescript
interface PlantManagementTableProps {
  plants: PlantWithDetails[];
  totalCount: number;
  filters: PlantFilters;
  sorting: SortConfig;
}

interface PlantWithDetails {
  id: number;
  family: string;
  genus: string;
  species: string;
  cultivar?: string;
  commonName: string;
  isVerified: boolean;
  createdBy?: string;
  createdAt: string;
  instanceCount: number;
  propagationCount: number;
}

interface PlantFilters {
  search?: string;
  family?: string;
  genus?: string;
  verified?: boolean;
}
```

#### PlantApprovalQueue
```typescript
interface PlantApprovalQueueProps {
  pendingPlants: PendingPlant[];
  totalCount: number;
}

interface PendingPlant {
  id: number;
  family: string;
  genus: string;
  species: string;
  cultivar?: string;
  commonName: string;
  careInstructions?: string;
  submittedBy: string;
  submittedAt: string;
  similarPlants: Plant[];
}
```

### Data Management Components

#### BulkActionToolbar
```typescript
interface BulkActionToolbarProps {
  selectedItems: number[];
  onApprove?: (ids: number[]) => void;
  onReject?: (ids: number[]) => void;
  onDelete?: (ids: number[]) => void;
  onExport?: (ids: number[]) => void;
}
```

#### AuditLogViewer
```typescript
interface AuditLogViewerProps {
  logs: AuditLog[];
  filters: AuditFilters;
  totalCount: number;
}

interface AuditLog {
  id: number;
  action: string;
  entityType: 'user' | 'plant' | 'system';
  entityId?: number;
  performedBy: string;
  timestamp: string;
  details: Record<string, any>;
  ipAddress?: string;
}
```

## Data Models

### Extended User Types
```typescript
interface AdminUser extends User {
  stats: {
    plantCount: number;
    propagationCount: number;
    careEntriesCount: number;
    lastLoginAt?: Date;
  };
}
```

### Plant Management Types
```typescript
interface PlantWithMetadata extends Plant {
  submittedBy?: User;
  instanceCount: number;
  propagationCount: number;
  lastModifiedBy?: User;
  approvedBy?: User;
  approvedAt?: Date;
}

interface PlantApprovalAction {
  plantId: number;
  action: 'approve' | 'reject' | 'request_changes';
  curatorId: number;
  notes?: string;
  modifications?: Partial<Plant>;
}
```

### Analytics Types
```typescript
interface AdminDashboardStats {
  users: {
    total: number;
    curators: number;
    newThisMonth: number;
    activeThisWeek: number;
  };
  plants: {
    total: number;
    verified: number;
    pendingApproval: number;
    submittedThisMonth: number;
  };
  activity: {
    recentRegistrations: User[];
    recentSubmissions: Plant[];
    recentApprovals: PlantApprovalAction[];
  };
  systemHealth: {
    databaseSize: string;
    activeConnections: number;
    lastBackup?: Date;
    alerts: SystemAlert[];
  };
}
```

## Error Handling

### Authorization Errors
- **403 Forbidden**: Non-curators accessing admin routes
- **Session Expiry**: Graceful redirect to login with return URL
- **Privilege Revocation**: Real-time detection and session invalidation

### Data Validation
- **Plant Taxonomy**: Prevent duplicate taxonomy combinations
- **User Management**: Prevent self-demotion and orphaned curator scenarios
- **Bulk Operations**: Partial failure handling with detailed error reporting

### Error Boundaries
```typescript
interface AdminErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}
```

## Testing Strategy

### Unit Tests
- **Authorization Functions**: `requireCuratorSession()`, privilege checking
- **Data Transformations**: User stats calculation, plant metadata aggregation
- **Validation Logic**: Taxonomy uniqueness, bulk operation validation

### Integration Tests
- **Admin Routes**: End-to-end curator access and functionality
- **Database Operations**: Complex queries for analytics and management
- **API Endpoints**: Admin-specific endpoints with proper authorization

### Component Tests
- **Table Components**: Sorting, filtering, pagination functionality
- **Form Components**: Plant editing, user management forms
- **Bulk Actions**: Selection and batch operation handling

### E2E Tests
- **Curator Workflows**: Complete user management and plant approval flows
- **Access Control**: Non-curator access prevention
- **Data Integrity**: Ensure admin actions maintain database consistency

## Performance Considerations

### Data Loading
- **Pagination**: Server-side pagination for large datasets
- **Caching**: React Query for client-side caching of admin data
- **Streaming**: Server components for initial data loading
- **Optimistic Updates**: Client-side optimistic updates for better UX

### Database Optimization
- **Indexes**: Ensure proper indexing for admin queries
- **Query Optimization**: Efficient joins for user stats and plant metadata
- **Connection Pooling**: Handle concurrent admin operations

### UI Performance
- **Virtual Scrolling**: For large tables (1000+ items)
- **Debounced Search**: Prevent excessive API calls during filtering
- **Lazy Loading**: Load admin components only when needed

## Security Considerations

### Access Control
- **Route-level Protection**: Server-side curator validation on all admin routes
- **API Authorization**: Curator-only endpoints with proper middleware
- **Session Management**: Secure session handling with privilege checking

### Audit Trail
- **Action Logging**: Log all admin actions with user identification
- **Data Changes**: Track modifications to users and plants
- **System Events**: Log privilege changes and security events

### Data Protection
- **Input Validation**: Sanitize all admin form inputs
- **SQL Injection Prevention**: Use parameterized queries
- **XSS Protection**: Proper output encoding in admin interfaces

## Implementation Phases

### Phase 1: Core Infrastructure
1. Admin authentication and route protection
2. Basic admin layout and navigation
3. User management table with basic operations

### Phase 2: Plant Management
1. Verified plants management interface
2. Plant approval queue and workflow
3. Bulk operations for plant management

### Phase 3: Advanced Features
1. Analytics dashboard with system metrics
2. Taxonomy management and hierarchy tools
3. Audit logging and system monitoring

### Phase 4: Optimization
1. Performance optimizations and caching
2. Advanced filtering and search capabilities
3. Export functionality and reporting tools

## Integration Points

### Existing Systems
- **Authentication**: Extends current Lucia auth with curator checks
- **Database**: Uses existing schema with new admin-specific queries
- **UI Components**: Reuses existing design system and components
- **Navigation**: Integrates with current navigation patterns

### External Dependencies
- **React Query**: For admin data caching and synchronization
- **Zod**: For admin form validation and API schemas
- **Drizzle ORM**: For complex admin database queries

This design provides a comprehensive, secure, and performant admin dashboard that integrates seamlessly with the existing plant tracker application while providing powerful tools for curators to manage users, plants, and system data.