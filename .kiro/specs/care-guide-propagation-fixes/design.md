# Design Document

## Overview

This design addresses user-reported issues with the Care Guide and Propagation features. The solution involves UI improvements, database schema updates, API modifications, and component refactoring to enhance usability and fix broken functionality.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                            │
├─────────────────────────────────────────────────────────────┤
│  HandbookDashboard  │  CareGuideForm  │  CareGuideDetail   │
│  PropagationDashboard │ PropagationForm │ PropagationCard  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                              │
├─────────────────────────────────────────────────────────────┤
│  /api/care-guides     │  /api/care-guides/[id]             │
│  /api/propagations    │  /api/propagations/[id]            │
│  /api/images/upload   │  /api/images/download              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                             │
├─────────────────────────────────────────────────────────────┤
│  S3ImageService       │  PropagationQueries                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL (careGuides, propagations tables)               │
│  AWS S3 (image storage)                                     │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Care Guide Form Modifications

#### Remove Method Field from Watering Section

**File:** `src/components/handbook/CareGuideForm.tsx`

**Changes:**
- Remove `method` field from watering form section
- Update `CareGuideFormData` interface to remove `method` from watering object
- Remove method input component from watering card

**Interface Update:**
```typescript
watering: {
  frequency: string;
  // method: string; // REMOVED
  tips: string;
};
```

#### Add General Description Box

**File:** `src/components/handbook/CareGuideForm.tsx`

**Changes:**
- Add prominent general description textarea in the "Basic Info" tab
- Position it after the Guide Information section
- Use TextArea component with 4-5 rows for better visibility
- Map to existing `description` field in formData

**UI Placement:**
```
Basic Info Tab:
  - Plant Taxonomy Section
  - Guide Information Section
    - Title
    - Description (existing field, make more prominent)
  - Photos Section
```

#### Integrate S3 Image Upload

**File:** `src/components/handbook/CareGuideForm.tsx`

**Changes:**
- Replace `ImageUpload` component with `S3ImageUpload` component
- Pass required props: userId, entityType='care_guide', entityId
- Handle S3 keys in form submission instead of File objects
- Update form submission to use s3ImageKeys array

**Implementation:**
```typescript
<S3ImageUpload
  userId={userId.toString()}
  entityType="care_guide"
  entityId={tempEntityId} // Generate temp ID for new guides
  onUploadComplete={(s3Keys) => updateFormData('s3ImageKeys', s3Keys)}
  maxImages={6}
/>
```

### 2. Care Guide Detail View

**New Component:** `src/components/handbook/CareGuideDetail.tsx`

**Purpose:** Display full care guide content with edit capability

**Features:**
- Modal or full-page view showing all care guide details
- Display all care categories with their content
- Show images using S3Image component
- Edit button to open CareGuideForm in edit mode
- Close/back button to return to list

**Interface:**
```typescript
interface CareGuideDetailProps {
  guide: CareGuide;
  userId: number;
  onClose: () => void;
  onEdit: () => void;
}
```

**Layout:**
```
┌─────────────────────────────────────────┐
│  Header (Title, Edit Button, Close)    │
├─────────────────────────────────────────┤
│  Taxonomy Info & Common Name            │
├─────────────────────────────────────────┤
│  General Description                    │
├─────────────────────────────────────────┤
│  Image Gallery (S3Image components)     │
├─────────────────────────────────────────┤
│  Care Categories (Tabs or Sections)     │
│    - Watering                           │
│    - Fertilizing                        │
│    - Lighting                           │
│    - Temperature                        │
│    - Humidity                           │
│    - Soil                               │
│    - Repotting                          │
│    - Propagation                        │
├─────────────────────────────────────────┤
│  General Tips                           │
└─────────────────────────────────────────┘
```

### 3. Care Guide Card Click Handler

**File:** `src/components/handbook/HandbookDashboard.tsx`

**Changes:**
- Add state for selected guide and detail view visibility
- Add onClick handler to CareGuideCard component
- Render CareGuideDetail modal when guide is selected
- Pass guide data and handlers to detail component

**Implementation:**
```typescript
const [selectedGuide, setSelectedGuide] = useState<CareGuide | null>(null);

<CareGuideCard 
  guide={guide} 
  onClick={() => setSelectedGuide(guide)}
/>

{selectedGuide && (
  <CareGuideDetail
    guide={selectedGuide}
    userId={userId}
    onClose={() => setSelectedGuide(null)}
    onEdit={() => {/* Open edit form */}}
  />
)}
```

### 4. Display Care Guide Images

**File:** `src/components/handbook/CareGuideCard.tsx` and `CareGuideDetail.tsx`

**Changes:**
- Use S3Image component to display images from s3ImageKeys
- Show thumbnail on card (first image)
- Show full gallery in detail view
- Handle empty image arrays gracefully

**Card Implementation:**
```typescript
{guide.s3ImageKeys && guide.s3ImageKeys.length > 0 && (
  <div className="aspect-video relative overflow-hidden rounded-lg">
    <S3Image
      s3Key={guide.s3ImageKeys[0]}
      userId={userId.toString()}
      alt={guide.title}
      width={400}
      height={225}
      className="object-cover"
    />
  </div>
)}
```

**Detail Gallery Implementation:**
```typescript
<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
  {guide.s3ImageKeys.map((s3Key, index) => (
    <S3Image
      key={s3Key}
      s3Key={s3Key}
      userId={userId.toString()}
      alt={`${guide.title} - Image ${index + 1}`}
      width={300}
      height={300}
      className="rounded-lg object-cover"
    />
  ))}
</div>
```

### 5. Propagation Status Update

#### Database Schema Migration

**File:** `drizzle/0005_update_propagation_status.sql` (new migration)

**Changes:**
- Update propagation status enum to remove 'established' and add 'ready'
- Migrate existing 'established' records to 'ready'
- Update status constraint

**Migration SQL:**
```sql
-- Update existing 'established' status to 'ready'
UPDATE propagations SET status = 'ready' WHERE status = 'established';

-- Drop and recreate the status check constraint
ALTER TABLE propagations DROP CONSTRAINT IF EXISTS propagations_status_check;
ALTER TABLE propagations ADD CONSTRAINT propagations_status_check 
  CHECK (status IN ('started', 'rooting', 'ready', 'planted'));
```

#### Schema Type Update

**File:** `src/lib/db/schema.ts`

**Changes:**
- Update propagations table status enum
- Update TypeScript types

**Code:**
```typescript
status: text('status', { 
  enum: ['started', 'rooting', 'ready', 'planted'] 
}).default('started').notNull(),
```

#### API Validation Update

**File:** `src/app/api/propagations/route.ts`

**Changes:**
- Update Zod schema to accept new status values
- Remove 'established' from enum

**Code:**
```typescript
status: z.enum(['started', 'rooting', 'ready', 'planted']).default('started'),
```

#### Component Updates

**Files:** 
- `src/components/propagations/PropagationDashboard.tsx`
- `src/components/propagations/PropagationCard.tsx`
- `src/components/propagations/PropagationForm.tsx`

**Changes:**
- Update statusConfig to use 'ready' instead of 'established'
- Update status filter buttons
- Update form dropdown options
- Update statistics calculations

**Status Config:**
```typescript
const statusConfig = {
  started: {
    label: 'Started',
    icon: Sprout,
    color: 'bg-blue-100 text-blue-800',
  },
  rooting: {
    label: 'Rooting',
    icon: TrendingUp,
    color: 'bg-yellow-100 text-yellow-800',
  },
  ready: {  // Changed from 'established'
    label: 'Ready',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800',
  },
  planted: {
    label: 'Planted',
    icon: Clock,
    color: 'bg-purple-100 text-purple-800',
  }
};
```

### 6. Fix Propagation Creation

**File:** `src/app/api/propagations/route.ts`

**Investigation Areas:**
1. Validate request body parsing
2. Check Zod schema validation
3. Verify database insert operation
4. Check error handling and response

**Potential Issues:**
- Missing required fields in validation
- Type mismatches (dates, numbers)
- Database constraint violations
- Missing user authentication

**Enhanced Error Handling:**
```typescript
export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Received propagation data:', body); // Debug logging
    
    const validatedData = createPropagationSchema.parse(body);
    console.log('Validated data:', validatedData); // Debug logging

    const propagation = await PropagationQueries.create({
      userId: user.id,
      ...validatedData,
    });

    return NextResponse.json(propagation, { status: 201 });
  } catch (error) {
    console.error('Error creating propagation:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: error.issues,
          received: body // Include received data for debugging
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to create propagation',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
```

### 7. Propagation Button Visibility

**File:** `src/components/propagations/PropagationDashboard.tsx`

**Current Issue:** Button may be hidden or not prominent enough

**Changes:**
- Ensure button is always visible in header
- Increase button size and contrast
- Add icon for better visibility
- Position consistently regardless of content state

**Implementation:**
```typescript
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-3xl font-bold text-gray-900 mb-2">Propagations</h1>
    <p className="text-gray-600">Track your plant propagation progress</p>
  </div>
  <button
    onClick={() => setShowAddForm(true)}
    className="flex items-center px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-md font-semibold"
  >
    <Plus className="w-5 h-5 mr-2" />
    Add Propagation
  </button>
</div>
```

## Data Models

### Care Guide Schema (Updated)

```typescript
{
  id: number;
  userId: number;
  taxonomyLevel: 'family' | 'genus' | 'species' | 'cultivar';
  family: string;
  genus?: string;
  species?: string;
  cultivar?: string;
  commonName?: string;
  title: string;
  description?: string;
  images: string[];  // Legacy Base64 (kept for rollback)
  s3ImageKeys: string[];  // New S3 storage
  watering?: {
    frequency?: string;
    // method removed
    tips?: string;
  };
  // ... other care categories
  generalTips?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Propagation Schema (Updated)

```typescript
{
  id: number;
  userId: number;
  plantId: number;
  parentInstanceId?: number;
  nickname: string;
  location: string;
  dateStarted: Date;
  status: 'started' | 'rooting' | 'ready' | 'planted';  // Updated enum
  notes?: string;
  images: string[];  // Legacy
  s3ImageKeys: string[];  // S3 storage
  createdAt: Date;
  updatedAt: Date;
}
```

## Error Handling

### Care Guide Errors

1. **Image Upload Failure**
   - Catch S3 upload errors
   - Display user-friendly message
   - Allow retry or continue without images

2. **Form Validation Errors**
   - Highlight invalid fields
   - Show specific error messages
   - Prevent submission until resolved

3. **API Errors**
   - Network failures: Show retry option
   - Server errors: Log and display generic message
   - Validation errors: Show field-specific feedback

### Propagation Errors

1. **Creation Failures**
   - Log detailed error information
   - Display specific validation errors
   - Provide guidance for resolution

2. **Status Update Errors**
   - Handle migration failures gracefully
   - Provide rollback mechanism
   - Alert users of any issues

## Testing Strategy

### Unit Tests

1. **Care Guide Form**
   - Test form validation
   - Test S3 upload integration
   - Test form submission with valid/invalid data

2. **Propagation Components**
   - Test status filtering
   - Test form validation
   - Test API integration

### Integration Tests

1. **Care Guide Flow**
   - Create guide with images
   - View guide detail
   - Edit existing guide
   - Delete guide

2. **Propagation Flow**
   - Create propagation
   - Update status
   - Filter by status
   - View statistics

### E2E Tests

1. **Care Guide Journey**
   - User creates care guide
   - Uploads images to S3
   - Views guide in list
   - Clicks to view details
   - Edits guide information

2. **Propagation Journey**
   - User adds propagation
   - Updates status through lifecycle
   - Views filtered lists
   - Checks statistics

## Migration Plan

### Phase 1: Database Migration
1. Create and run migration script for propagation status
2. Verify all 'established' records migrated to 'ready'
3. Test database constraints

### Phase 2: Backend Updates
1. Update API validation schemas
2. Update query functions
3. Test API endpoints

### Phase 3: Frontend Updates
1. Update care guide form (remove method, add S3 upload)
2. Create care guide detail component
3. Update propagation components (status changes)
4. Update button visibility

### Phase 4: Testing
1. Run unit tests
2. Run integration tests
3. Manual testing of all flows
4. User acceptance testing

### Phase 5: Deployment
1. Deploy database migration
2. Deploy backend changes
3. Deploy frontend changes
4. Monitor for errors
5. Gather user feedback

## Performance Considerations

### Image Loading
- Use lazy loading for care guide images
- Implement image caching strategy
- Show loading states during S3 fetch
- Optimize image sizes

### List Rendering
- Implement pagination for large care guide lists
- Use virtual scrolling if needed
- Optimize re-renders with React.memo

### API Calls
- Implement request debouncing
- Use React Query for caching
- Batch image URL requests where possible

## Security Considerations

### S3 Image Access
- Validate user ownership before generating pre-signed URLs
- Use short expiration times (15 minutes)
- Implement rate limiting on image endpoints

### API Authorization
- Verify user authentication on all endpoints
- Validate user owns resources before modifications
- Sanitize user inputs

### Data Validation
- Validate all form inputs client and server-side
- Prevent SQL injection through parameterized queries
- Validate file types and sizes for uploads
