// Test data factories - centralized exports

// Re-export all factory utilities
export * from './user-factory';
export * from './plant-factory';
export * from './care-factory';

// Import reset functions for convenience
import { resetUserCounter } from './user-factory';
import { resetPlantCounters } from './plant-factory';
import { resetCareCounter } from './care-factory';

/**
 * Convenience function to reset all counters for test isolation
 * Call this in beforeEach or beforeAll to ensure clean test state
 */
export const resetAllFactoryCounters = () => {
  resetUserCounter();
  resetPlantCounters();
  resetCareCounter();
};

// Re-export types for convenience
export type { User, Session } from '@/lib/auth/client';
export type { 
  NewUser, 
  NewSession, 
  NewEmailVerificationCode,
  NewPlant, 
  NewPlantInstance, 
  NewCareHistory,
  Plant,
  PlantInstance,
  CareHistory
} from '@/lib/db/schema';