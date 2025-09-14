# Test Data Factories

This directory contains TypeScript factories for creating consistent, realistic test data for the plant tracker application. These factories are designed to work with the database schema and provide authentication helpers for testing workflows.

## Overview

The factories are organized into three main categories:

- **User Factory** (`user-factory.ts`) - Creates users, sessions, and authentication-related test data
- **Plant Factory** (`plant-factory.ts`) - Creates plants, plant instances, and plant-related test data  
- **Care Factory** (`care-factory.ts`) - Creates care records, care history, and care-related test data

## Quick Start

```typescript
import {
  createTestUser,
  createTestPlant,
  createTestCareRecord,
  resetAllFactoryCounters,
} from '@/test-utils/factories';

// Reset counters for clean test state
beforeEach(() => {
  resetAllFactoryCounters();
});

// Create test data
const user = createTestUser();
const plant = createTestPlant();
const careRecord = createTestCareRecord({ userId: 1, plantInstanceId: 1 });
```

## User Factory

### Basic User Creation

```typescript
// Basic user
const user = createTestUser();

// Curator user
const curator = createTestCurator();

// Unverified user
const unverifiedUser = createTestUnverifiedUser();

// User with specific password
const userWithPassword = createTestUserWithPassword('mypassword123');
```

### Authentication Helpers

```typescript
// Complete authenticated user with session
const { user, session } = createAuthenticatedTestUser();

// Authentication scenarios for testing workflows
const signupData = createAuthTestScenario('signup');
const signinData = createAuthTestScenario('signin');
const verifyEmailData = createAuthTestScenario('verify-email');

// Authorization test data (regular user vs curator)
const authData = createAuthorizationTestData();
```

### Session Management

```typescript
// Create session for user
const session = createTestSession({ id: 1 });

// Session test data with valid/expired sessions
const sessionData = createSessionTestData();
```

## Plant Factory

### Basic Plant Creation

```typescript
// Basic plant
const plant = createTestPlant();

// Plant instance
const plantInstance = createTestPlantInstance({
  userId: 1,
  plantId: 1,
});

// Plant with specific taxonomy
const monstera = createTestPlantWithTaxonomy({
  family: 'Araceae',
  genus: 'Monstera',
  species: 'deliciosa',
  commonName: 'Monstera Deliciosa',
});
```

### Realistic Plant Data

```typescript
// Pre-configured realistic plants
const monstera = createRealisticPlants.monstera();
const pothos = createRealisticPlants.pothos();
const snakePlant = createRealisticPlants.snakePlant();

// Realistic plant instances for different scenarios
const thrivingPlant = createRealisticPlantInstances.thriving(userId, plantId);
const strugglingPlant = createRealisticPlantInstances.struggling(userId, plantId);
const newPlant = createRealisticPlantInstances.newPlant(userId, plantId);
```

### Plant Management Test Data

```typescript
// Complete plant management test data
const testData = createPlantManagementTestData(userId);
// Returns: { plants, plantInstances, searchableData }

// Taxonomy validation test data
const taxonomyData = createTaxonomyTestData();
// Returns: { validTaxonomy, taxonomyWithCultivar, incompleteTaxonomy, duplicateTaxonomy }
```

## Care Factory

### Basic Care Records

```typescript
// Basic care record
const careRecord = createTestCareRecord({
  userId: 1,
  plantInstanceId: 1,
});

// Specific care types
const fertilizer = createTestFertilizerRecord(plantInstanceId, userId);
const watering = createTestWateringRecord(plantInstanceId, userId);
const repotting = createTestRepottingRecord(plantInstanceId, userId);
```

### Care History and Scheduling

```typescript
// Care history (random records)
const history = createTestCareHistory(plantInstanceId, userId, 10);

// Realistic care schedule (follows natural patterns)
const schedule = createRealisticCareSchedule(plantInstanceId, userId, 6); // 6 months
```

### Care Tracking Test Data

```typescript
// Complete care tracking test data
const careData = createCareTrackingTestData(plantInstanceId, userId);
// Returns: { recentCareHistory, fullCareHistory, careStatistics, upcomingCare }

// Different care scenarios
const scenarios = createCareScenarioTestData(plantInstanceId, userId);
// Returns: { overdueWatering, recentFertilizing, comprehensiveCare, irregularCare }

// Care validation test data
const validationData = createCareValidationTestData();
// Returns: { validCareRecord, invalidCareType, futureCareDate, missingRequiredFields, ... }
```

## Integration Test Examples

### Authentication Workflow

```typescript
describe('Authentication Flow', () => {
  beforeEach(() => {
    resetAllFactoryCounters();
  });

  it('should handle complete signup workflow', () => {
    const signupData = createAuthTestScenario('signup');
    
    // Test form submission
    const formData = {
      email: signupData.email,
      password: signupData.password,
      name: signupData.name,
    };
    
    // Verify expected user after signup
    const expectedUser = signupData.expectedUser;
    expect(expectedUser.isEmailVerified).toBe(false);
  });
});
```

### Plant Management Workflow

```typescript
describe('Plant Management', () => {
  it('should handle plant creation and care', () => {
    const user = createTestUser();
    const userWithId = { ...user, id: 1 };
    
    // Create plant and instance
    const plant = createRealisticPlants.monstera();
    const plantInstance = createRealisticPlantInstances.thriving(userWithId.id, 1);
    
    // Add care history
    const careHistory = createRealisticCareSchedule(1, userWithId.id, 3);
    
    // Verify workflow
    expect(plantInstance.userId).toBe(userWithId.id);
    expect(careHistory.length).toBeGreaterThan(0);
  });
});
```

### Care Tracking Workflow

```typescript
describe('Care Tracking', () => {
  it('should track plant care over time', () => {
    const careData = createCareTrackingTestData(1, 1);
    
    // Verify care statistics
    expect(careData.careStatistics.totalCareEvents).toBeGreaterThan(0);
    expect(careData.careStatistics).toHaveProperty('careTypeBreakdown');
    
    // Verify upcoming care
    expect(careData.upcomingCare).toHaveLength(2);
  });
});
```

## Best Practices

### Test Isolation

Always reset factory counters to ensure clean test state:

```typescript
beforeEach(() => {
  resetAllFactoryCounters();
});
```

### Realistic Data

Use the realistic factory functions for integration tests:

```typescript
// Instead of generic test data
const plant = createTestPlant();

// Use realistic data
const monstera = createRealisticPlants.monstera();
```

### Proper Relationships

Ensure proper relationships between entities:

```typescript
const user = createTestUser();
const userWithId = { ...user, id: 1 };

const plantInstance = createTestPlantInstance({
  userId: userWithId.id,
  plantId: 1,
});

const careRecord = createTestCareRecord({
  userId: userWithId.id,
  plantInstanceId: 1, // Should match plantInstance.id when created
});
```

### Authentication Context

Use authentication helpers for testing protected workflows:

```typescript
const { user, session } = createAuthenticatedTestUser();
const authContext = createAuthenticatedContext(user, session);

// Use authContext in tests that require authentication
```

## Factory Functions Reference

### User Factory Functions

- `createTestUser(overrides?)` - Basic user
- `createTestCurator(overrides?)` - Curator user
- `createTestUnverifiedUser(overrides?)` - Unverified user
- `createTestUsers(count, baseOverrides?)` - Multiple users
- `createTestUserWithPassword(password, overrides?)` - User with specific password
- `createTestSession(user, overrides?)` - Session for user
- `createAuthenticatedTestUser(userOverrides?, sessionOverrides?)` - User with session
- `createTestEmailVerificationCode(user, overrides?)` - Email verification code
- `createAuthTestScenario(scenario)` - Authentication scenario data
- `createAuthorizationTestData()` - Authorization test data
- `createSessionTestData()` - Session management test data
- `resetUserCounter()` - Reset user counter

### Plant Factory Functions

- `createTestPlant(overrides?)` - Basic plant
- `createTestPlantInstance(overrides?)` - Basic plant instance
- `createTestPlants(count, baseOverrides?)` - Multiple plants
- `createTestPlantInstances(count, baseOverrides?)` - Multiple plant instances
- `createTestPlantWithTaxonomy(taxonomy, overrides?)` - Plant with specific taxonomy
- `createTestPlantInstanceForUser(userId, overrides?)` - Plant instance for user
- `createRealisticPlants.monstera()` - Realistic Monstera
- `createRealisticPlants.pothos()` - Realistic Pothos
- `createRealisticPlants.snakePlant()` - Realistic Snake Plant
- `createRealisticPlants.fiddle()` - Realistic Fiddle Leaf Fig
- `createRealisticPlantInstances.thriving(userId, plantId)` - Thriving plant instance
- `createRealisticPlantInstances.struggling(userId, plantId)` - Struggling plant instance
- `createRealisticPlantInstances.newPlant(userId, plantId)` - New plant instance
- `createPlantManagementTestData(userId)` - Complete plant management data
- `createTaxonomyTestData()` - Taxonomy validation data
- `resetPlantCounters()` - Reset plant counters

### Care Factory Functions

- `createTestCareRecord(overrides?)` - Basic care record
- `createTestFertilizerRecord(plantInstanceId, userId, overrides?)` - Fertilizer record
- `createTestWateringRecord(plantInstanceId, userId, overrides?)` - Watering record
- `createTestRepottingRecord(plantInstanceId, userId, overrides?)` - Repotting record
- `createTestPruningRecord(plantInstanceId, userId, overrides?)` - Pruning record
- `createTestInspectionRecord(plantInstanceId, userId, overrides?)` - Inspection record
- `createTestCareHistory(plantInstanceId, userId, count?, baseOverrides?)` - Care history
- `createRealisticCareSchedule(plantInstanceId, userId, months?)` - Realistic care schedule
- `createTestCareStatistics(careRecords)` - Care statistics from records
- `createCareTrackingTestData(plantInstanceId, userId)` - Complete care tracking data
- `createCareScenarioTestData(plantInstanceId, userId)` - Care scenario data
- `createCareValidationTestData()` - Care validation data
- `resetCareCounter()` - Reset care counter

### Utility Functions

- `resetAllFactoryCounters()` - Reset all counters for clean test state
- `hashTestPassword(password)` - Hash password for testing

## Type Exports

The factories also export TypeScript types for convenience:

```typescript
import type {
  User,
  Session,
  NewUser,
  NewSession,
  NewPlant,
  NewPlantInstance,
  NewCareHistory,
  Plant,
  PlantInstance,
  CareHistory,
} from '@/test-utils/factories';
```

These factories provide a comprehensive foundation for testing all aspects of the plant tracker application with consistent, realistic data.