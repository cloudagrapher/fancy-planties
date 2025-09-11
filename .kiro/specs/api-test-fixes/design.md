# Design Document

## Overview

The plant management API tests are failing due to several implementation inconsistencies between the API endpoints and test expectations. The primary issues are: validation error response format mismatches, date serialization inconsistencies, authentication flow edge cases, FormData processing problems, and response structure variations. This design addresses each issue systematically to ensure API behavior matches test expectations while maintaining proper error handling and data consistency.

The solution involves standardizing error response formats, implementing consistent date serialization, fixing authentication flow order, improving FormData processing, and updating test data factories to match actual API responses.

## Architecture

### Error Response Standardization

```
API Error Flow:
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Request         │───▶│ Validation       │───▶│ Standardized    │
│ Processing      │    │ Error Handling   │    │ Error Response  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ ZodError.issues  │
                       │ → details field  │
                       └──────────────────┘
```

### Date Serialization Pipeline

```
Date Processing Flow:
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Database        │───▶│ API Response     │───▶│ JSON            │
│ Date Objects    │    │ Serialization    │    │ ISO Strings     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Test Assertions  │
                       │ Expect Strings   │
                       └──────────────────┘
```

### Authentication Flow Order

```
Request Processing Order:
1. Authentication Check ──┐
                         │
2. Authorization Check ───┼──▶ If fails: Return 401/403
                         │
3. Request Body Parse ────┼──▶ If auth passes: Continue
                         │
4. Validation ────────────┼──▶ If fails: Return 400
                         │
5. Business Logic ────────┘──▶ If all pass: Process
```

## Components and Interfaces

### Error Response Standardizer

#### Validation Error Handler
```typescript
interface ValidationErrorResponse {
  success: false;
  error: string;
  details: ZodIssue[];
}

function handleValidationError(error: ZodError): ValidationErrorResponse {
  return {
    success: false,
    error: 'Validation failed',
    details: error.issues  // Use .issues not .errors
  };
}
```

#### Generic Error Handler
```typescript
interface GenericErrorResponse {
  success?: false;
  error: string;
  details?: any;
}

function handleGenericError(error: Error, context: string): GenericErrorResponse {
  console.error(`${context}:`, error);
  
  if (error instanceof ZodError) {
    return handleValidationError(error);
  }
  
  return {
    success: false,
    error: 'Internal server error'
  };
}
```

### Date Serialization Manager

#### Response Serializer
```typescript
interface DateSerializationConfig {
  dateFields: string[];
  nestedObjects: Record<string, string[]>;
}

function serializeDatesInResponse(data: any, config: DateSerializationConfig): any {
  if (!data) return data;
  
  const serialized = { ...data };
  
  // Serialize top-level date fields
  config.dateFields.forEach(field => {
    if (serialized[field] instanceof Date) {
      serialized[field] = serialized[field].toISOString();
    }
  });
  
  // Serialize nested object date fields
  Object.entries(config.nestedObjects).forEach(([objectKey, dateFields]) => {
    if (serialized[objectKey]) {
      dateFields.forEach(field => {
        if (serialized[objectKey][field] instanceof Date) {
          serialized[objectKey][field] = serialized[objectKey][field].toISOString();
        }
      });
    }
  });
  
  return serialized;
}
```

#### Plant Instance Date Config
```typescript
const PLANT_INSTANCE_DATE_CONFIG: DateSerializationConfig = {
  dateFields: ['createdAt', 'updatedAt', 'lastFertilized', 'lastRepot', 'fertilizerDue'],
  nestedObjects: {
    plant: ['createdAt', 'updatedAt']
  }
};
```

### Authentication Flow Controller

#### Request Authentication Middleware
```typescript
interface AuthResult {
  user: User | null;
  session: Session | null;
  error?: string;
}

async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  try {
    const result = await validateRequest();
    
    if (!result.user) {
      return {
        user: null,
        session: null,
        error: 'Unauthorized'
      };
    }
    
    return result;
  } catch (error) {
    return {
      user: null,
      session: null,
      error: 'Authentication failed'
    };
  }
}
```

#### Early Authentication Check Pattern
```typescript
export async function POST(request: NextRequest) {
  // 1. Check authentication FIRST
  const authResult = await authenticateRequest(request);
  if (!authResult.user) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: 401 }
    );
  }
  
  // 2. Parse request body AFTER auth check
  let body;
  try {
    body = await parseRequestBody(request);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
  
  // 3. Validate data AFTER parsing
  try {
    const validatedData = schema.parse(body);
    // Continue processing...
  } catch (error) {
    return handleValidationError(error);
  }
}
```

### FormData Processing Engine

#### FormData Parser
```typescript
interface FormDataParseResult {
  fields: Record<string, any>;
  files: File[];
  existingImages: string[];
}

async function parseFormData(formData: FormData): Promise<FormDataParseResult> {
  const fields: Record<string, any> = {};
  const files: File[] = [];
  const existingImages: string[] = [];
  
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('imageFiles[')) {
      if (value instanceof File) {
        files.push(value);
      }
    } else if (key.startsWith('existingImages[')) {
      existingImages.push(value as string);
    } else {
      // Convert form values to appropriate types
      fields[key] = convertFormValue(key, value);
    }
  }
  
  return { fields, files, existingImages };
}
```

#### File to Base64 Converter
```typescript
async function fileToBase64(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = buffer.toString('base64');
  return `data:${file.type};base64,${base64}`;
}

async function processImageFiles(files: File[], existingImages: string[]): Promise<string[]> {
  const newImageBase64s = await Promise.all(
    files.map(file => fileToBase64(file))
  );
  
  return [...existingImages, ...newImageBase64s];
}
```

#### Form Value Type Converter
```typescript
function convertFormValue(key: string, value: FormDataEntryValue): any {
  if (typeof value !== 'string') return value;
  
  // Convert based on field name patterns
  if (key === 'plantId' || key.endsWith('Id')) {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? value : parsed;
  }
  
  if (key === 'isActive' || key.startsWith('is')) {
    return value === 'true';
  }
  
  if (key.includes('Date') || key.includes('fertilized') || key.includes('repot')) {
    return value && value !== '' ? new Date(value) : null;
  }
  
  return value;
}
```

### Response Structure Standardizer

#### Success Response Builder
```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  metadata?: {
    operation: string;
    timestamp: string;
    userId?: number;
  };
}

function buildSuccessResponse<T>(
  data: T, 
  operation: string, 
  userId?: number
): SuccessResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      operation,
      timestamp: new Date().toISOString(),
      ...(userId && { userId })
    }
  };
}
```

#### Enhanced Plant Instance Builder
```typescript
interface EnhancedPlantInstance {
  id: number;
  plantId: number;
  userId: number;
  nickname: string;
  location: string;
  notes?: string;
  images: string[];
  isActive: boolean;
  fertilizerSchedule?: string;
  lastFertilized?: string | null;
  lastRepot?: string | null;
  fertilizerDue?: string | null;
  createdAt: string;
  updatedAt: string;
  plant: {
    id: number;
    family: string;
    genus: string;
    species: string;
    cultivar?: string | null;
    commonName: string;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

function buildEnhancedPlantInstanceResponse(
  instance: any, 
  plant: any
): EnhancedPlantInstance {
  return serializeDatesInResponse({
    ...instance,
    plant: plant
  }, PLANT_INSTANCE_DATE_CONFIG);
}
```

## Data Models

### Error Response Models

#### Validation Error Model
```typescript
interface ValidationError {
  success: false;
  error: 'Validation failed';
  details: ZodIssue[];
}

interface ZodIssue {
  path: (string | number)[];
  message: string;
  code?: string;
}
```

#### Authentication Error Model
```typescript
interface AuthenticationError {
  success: false;
  error: 'Unauthorized' | 'Forbidden';
}

interface GenericError {
  success: false;
  error: string;
  details?: any;
}
```

### Request/Response Models

#### Plant Instance Creation Request
```typescript
interface CreatePlantInstanceRequest {
  plantId: number;
  nickname: string;
  location: string;
  notes?: string;
  images?: string[];
  isActive?: boolean;
  fertilizerSchedule?: string;
  lastFertilized?: Date | null;
  lastRepot?: Date | null;
}

interface CreatePlantInstanceFormData {
  plantId: string;
  nickname: string;
  location: string;
  notes?: string;
  isActive?: string;
  fertilizerSchedule?: string;
  lastFertilized?: string;
  lastRepot?: string;
  'imageFiles[0]'?: File;
  'existingImages[0]'?: string;
}
```

#### Plant Instance Update Request
```typescript
interface UpdatePlantInstanceRequest {
  nickname?: string;
  location?: string;
  notes?: string;
  images?: string[];
  isActive?: boolean;
  fertilizerSchedule?: string;
  lastFertilized?: Date | null;
  lastRepot?: Date | null;
}
```

### Test Data Models

#### Test Plant Instance Factory Update
```typescript
interface TestPlantInstanceData {
  id?: number;
  plantId: number;
  userId: number;
  nickname: string;
  location: string;
  notes?: string;
  images: string[];
  isActive: boolean;
  fertilizerSchedule?: string;
  lastFertilized?: string | null;  // Changed from Date to string
  lastRepot?: string | null;       // Changed from Date to string
  fertilizerDue?: string | null;   // Changed from Date to string
  createdAt: string;               // Changed from Date to string
  updatedAt: string;               // Changed from Date to string
}

interface TestPlantData {
  id?: number;
  family: string;
  genus: string;
  species: string;
  cultivar?: string | null;
  commonName: string;
  isVerified: boolean;
  createdAt: string;               // Changed from Date to string
  updatedAt: string;               // Changed from Date to string
}
```

## Error Handling

### Validation Error Processing

#### ZodError Handler
```typescript
function processZodError(error: ZodError): ValidationErrorResponse {
  return {
    success: false,
    error: 'Validation failed',
    details: error.issues  // Critical: use .issues not .errors
  };
}
```

#### Validation Error Response Pattern
```typescript
// In API routes
try {
  const validatedData = schema.parse(requestData);
  // Continue processing...
} catch (error) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      processZodError(error),
      { status: 400 }
    );
  }
  throw error; // Re-throw non-validation errors
}
```

### Authentication Error Handling

#### Authentication Check Pattern
```typescript
async function checkAuthentication(request: NextRequest): Promise<NextResponse | null> {
  const { user } = await validateRequest();
  
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  return null; // No error, continue processing
}

// Usage in API routes
export async function POST(request: NextRequest) {
  const authError = await checkAuthentication(request);
  if (authError) return authError;
  
  // Continue with authenticated processing...
}
```

### FormData Error Handling

#### FormData Processing Error Handler
```typescript
async function safeParseFormData(request: NextRequest): Promise<any> {
  try {
    const formData = await request.formData();
    return await parseFormData(formData);
  } catch (error) {
    throw new Error('Invalid FormData format');
  }
}

async function safeParseJSON(request: NextRequest): Promise<any> {
  try {
    const body = await request.json();
    if (!body || Object.keys(body).length === 0) {
      throw new Error('Request body is required');
    }
    return body;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON in request body');
    }
    throw error;
  }
}
```

## Testing Strategy

### Test Data Factory Updates

#### Updated Plant Factory
```typescript
export const createTestPlant = (overrides = {}) => {
  plantCounter++;
  const timestamp = Date.now();
  
  const basePlant = {
    family: `Testaceae${plantCounter}_${timestamp}`,
    genus: `Testus${plantCounter}_${timestamp}`,
    species: `testicus${plantCounter}_${timestamp}`,
    cultivar: plantCounter % 2 === 0 ? `'Variegata${plantCounter}_${Math.floor(Math.random() * 10000)}'` : null,
    commonName: `Test Plant ${plantCounter}_${timestamp}`,
    isVerified: true,
    createdAt: new Date().toISOString(),  // Return ISO string
    updatedAt: new Date().toISOString(),  // Return ISO string
  };
  
  return { ...basePlant, ...overrides };
};
```

#### Updated Plant Instance Factory
```typescript
export const createTestPlantInstance = (overrides = {}) => {
  plantInstanceCounter++;
  
  const basePlantInstance = {
    nickname: `My Test Plant ${plantInstanceCounter}`,
    location: `Test Location ${plantInstanceCounter}`,
    fertilizerSchedule: 'every_4_weeks',
    lastFertilized: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    lastRepot: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    notes: `Test notes for plant instance ${plantInstanceCounter}`,
    images: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return { ...basePlantInstance, ...overrides };
};
```

### Test Assertion Updates

#### Date Comparison Strategy
```typescript
// Instead of expecting Date objects
expect(responseData.createdAt).toBeInstanceOf(Date);

// Expect ISO strings
expect(responseData.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
expect(typeof responseData.createdAt).toBe('string');
```

#### Enhanced Instance Comparison
```typescript
// Test should expect the full enhanced structure
expect(responseData).toEqual({
  success: true,
  data: expect.objectContaining({
    id: expect.any(Number),
    plantId: expect.any(Number),
    nickname: expect.any(String),
    location: expect.any(String),
    createdAt: expect.any(String),  // String, not Date
    updatedAt: expect.any(String),  // String, not Date
    plant: expect.objectContaining({
      id: expect.any(Number),
      family: expect.any(String),
      genus: expect.any(String),
      species: expect.any(String),
      commonName: expect.any(String),
      createdAt: expect.any(String),  // String, not Date
      updatedAt: expect.any(String),  // String, not Date
    })
  })
});
```

### Mock Response Updates

#### Validation Error Mock
```typescript
const validationError = new Error('Validation failed');
validationError.name = 'ZodError';
validationError.issues = [  // Use .issues not .errors
  { path: ['plantId'], message: 'Plant ID must be a number' },
  { path: ['nickname'], message: 'Nickname is required' },
];

createPlantInstanceSchema.parse.mockImplementation(() => {
  throw validationError;
});
```

#### Authentication Mock Updates
```typescript
// For unauthenticated requests
validateVerifiedRequest.mockResolvedValue({
  user: null,
  error: 'Unauthorized'  // Consistent error message
});

// For authenticated requests
validateVerifiedRequest.mockResolvedValue({
  user: testUser,
  session: testSession
});
```

This design ensures that all API endpoints return consistent error formats, handle dates uniformly, process authentication in the correct order, handle FormData properly, and provide predictable response structures that match test expectations.