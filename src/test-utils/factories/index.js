// Test data factories - centralized exports

// Re-export all factory utilities
export * from './user-factory';
export * from './plant-factory';
export * from './care-factory';

// Convenience function to reset all counters for test isolation
export const resetAllFactoryCounters = () => {
  const { resetUserCounter } = require('./user-factory');
  const { resetPlantCounters } = require('./plant-factory');
  const { resetCareCounter } = require('./care-factory');
  
  resetUserCounter();
  resetPlantCounters();
  resetCareCounter();
};