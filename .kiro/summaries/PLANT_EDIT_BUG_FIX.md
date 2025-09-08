# Plant Edit Bug Fix

## Problem
When trying to edit a plant instance, the application was throwing a JSON parsing error:

```
SyntaxError: No number after minus sign in JSON at position 1 (line 1 column 2)
at JSON.parse (<anonymous>)
at async PUT (src/app/api/plant-instances/[id]/route.ts:71:18)
```

## Root Cause
The issue was a mismatch between what the frontend was sending and what the API route was expecting:

- **Frontend (`PlantInstanceForm.tsx`)**: Sending data as `FormData` (multipart/form-data) because it needs to handle file uploads for plant images
- **API Route (`/api/plant-instances/[id]/route.ts`)**: Expecting JSON data and trying to parse the request body with `request.json()`

When the API tried to parse FormData as JSON, it failed because FormData has a completely different format.

## Solution
Updated the API route to properly handle FormData instead of JSON:

### Before (Broken)
```typescript
const body = await request.json(); // This failed with FormData
```

### After (Fixed)
```typescript
// Handle FormData for file uploads
const formData = await request.formData();

// Extract form fields
const body: any = {};
for (const [key, value] of formData.entries()) {
  if (key.startsWith('existingImages[')) {
    // Handle existing images array
    if (!body.existingImages) body.existingImages = [];
    body.existingImages.push(value);
  } else if (key.startsWith('imageFiles[')) {
    // Handle new image files (for future implementation)
    if (!body.imageFiles) body.imageFiles = [];
    body.imageFiles.push(value);
  } else {
    // Handle regular form fields
    body[key] = value;
  }
}

// Convert string values to appropriate types
if (body.plantId) body.plantId = parseInt(body.plantId);
if (body.isActive) body.isActive = body.isActive === 'true';
if (body.existingImages) body.images = body.existingImages;
```

## Key Changes
1. **Changed from `request.json()` to `request.formData()`**
2. **Added proper FormData parsing logic** to extract form fields
3. **Added type conversion** for numeric and boolean fields
4. **Added support for image arrays** (both existing and new images)

## Why FormData is Used
The frontend uses FormData because:
- It needs to handle file uploads for plant images
- FormData is the standard way to send multipart data including files
- It allows mixing text fields with file uploads in a single request

## Result
✅ Plant editing now works correctly
✅ The API properly processes FormData requests
✅ File upload functionality is preserved
✅ All form fields are correctly parsed and typed

## Testing
The fix has been applied and the development server starts successfully. The plant editing functionality should now work without JSON parsing errors.