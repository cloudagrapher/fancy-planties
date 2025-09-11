// Care record test data factory

// Counter for unique test data
let careRecordCounter = 0;

// Care types and related data for realistic test records
const CARE_TYPES = ['fertilizer', 'water', 'repot', 'prune', 'inspect', 'other'];

const FERTILIZER_TYPES = [
  'Balanced liquid fertilizer (10-10-10)',
  'High nitrogen fertilizer (20-10-10)',
  'Bloom booster (10-30-20)',
  'Organic compost tea',
  'Fish emulsion',
  'Worm casting tea',
  'Slow-release granules'
];

const POT_SIZES = [
  '4 inch', '6 inch', '8 inch', '10 inch', '12 inch', '14 inch',
  'Small', 'Medium', 'Large', 'Extra Large'
];

const SOIL_TYPES = [
  'Standard potting mix',
  'Cactus and succulent mix',
  'African violet mix',
  'Orchid bark mix',
  'Custom aroid mix',
  'Seed starting mix',
  'Organic potting soil'
];

const CARE_NOTES = [
  'Plant looking healthy and growing well',
  'Noticed some new growth this week',
  'Soil was quite dry, gave thorough watering',
  'Removed a few yellow leaves',
  'Plant seems to be thriving in this location',
  'Added humidity tray to help with dry air',
  'Rotated plant for even light exposure',
  'Checked for pests - all clear',
  'Roots were getting pot-bound, time for repot',
  'Pruned back leggy growth to encourage bushiness'
];

/**
 * Creates a test care record with realistic data
 * @param {Object} overrides - Properties to override in the generated care record
 * @returns {Object} Test care record object
 */
export const createTestCareRecord = (overrides = {}) => {
  careRecordCounter++;
  
  const careType = CARE_TYPES[careRecordCounter % CARE_TYPES.length];
  const careDate = new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30); // Random date within last 30 days
  
  const baseCareRecord = {
    // Remove id - let database auto-generate it
    // userId and plantInstanceId should be provided via overrides
    careType: overrides.careType || careType,
    careDate: overrides.careDate || careDate,
    notes: CARE_NOTES[careRecordCounter % CARE_NOTES.length],
    fertilizerType: (overrides.careType || careType) === 'fertilizer' ? FERTILIZER_TYPES[careRecordCounter % FERTILIZER_TYPES.length] : null,
    potSize: (overrides.careType || careType) === 'repot' ? POT_SIZES[careRecordCounter % POT_SIZES.length] : null,
    soilType: (overrides.careType || careType) === 'repot' ? SOIL_TYPES[careRecordCounter % SOIL_TYPES.length] : null,
    images: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    // Add computed fields for display
    formattedDate: (overrides.careDate || careDate).toLocaleDateString(),
    daysSinceCare: Math.floor((Date.now() - (overrides.careDate || careDate).getTime()) / (1000 * 60 * 60 * 24)),
  };
  
  return {
    ...baseCareRecord,
    ...overrides,
  };
};

/**
 * Creates a fertilizer care record
 * @param {Object} plantInstance - Plant instance object
 * @param {Object} user - User object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Test fertilizer care record
 */
export const createTestFertilizerRecord = (plantInstance, user, overrides = {}) => {
  return createTestCareRecord(plantInstance, user, {
    careType: 'fertilizer',
    fertilizerType: FERTILIZER_TYPES[0],
    notes: 'Applied balanced liquid fertilizer at half strength',
    ...overrides,
  });
};

/**
 * Creates a watering care record
 * @param {Object} plantInstance - Plant instance object
 * @param {Object} user - User object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Test watering care record
 */
export const createTestWateringRecord = (plantInstance, user, overrides = {}) => {
  return createTestCareRecord(plantInstance, user, {
    careType: 'water',
    notes: 'Watered thoroughly until water drained from bottom',
    ...overrides,
  });
};

/**
 * Creates a repotting care record
 * @param {Object} plantInstance - Plant instance object
 * @param {Object} user - User object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Test repotting care record
 */
export const createTestRepottingRecord = (plantInstance, user, overrides = {}) => {
  return createTestCareRecord(plantInstance, user, {
    careType: 'repot',
    potSize: POT_SIZES[0],
    soilType: SOIL_TYPES[0],
    notes: 'Repotted into larger container with fresh soil mix',
    ...overrides,
  });
};

/**
 * Creates a pruning care record
 * @param {Object} plantInstance - Plant instance object
 * @param {Object} user - User object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Test pruning care record
 */
export const createTestPruningRecord = (plantInstance, user, overrides = {}) => {
  return createTestCareRecord(plantInstance, user, {
    careType: 'prune',
    notes: 'Removed dead and yellowing leaves, trimmed leggy growth',
    ...overrides,
  });
};

/**
 * Creates an inspection care record
 * @param {Object} plantInstance - Plant instance object
 * @param {Object} user - User object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Test inspection care record
 */
export const createTestInspectionRecord = (plantInstance, user, overrides = {}) => {
  return createTestCareRecord(plantInstance, user, {
    careType: 'inspect',
    notes: 'Weekly health check - plant looking good, no pests detected',
    ...overrides,
  });
};

/**
 * Creates a care history for a plant instance
 * @param {Object} plantInstance - Plant instance object
 * @param {Object} user - User object
 * @param {number} count - Number of care records to create
 * @param {Object} baseOverrides - Base properties to apply to all records
 * @returns {Array} Array of test care record objects
 */
export const createTestCareHistory = (plantInstance, user, count = 10, baseOverrides = {}) => {
  const records = [];
  
  for (let i = 0; i < count; i++) {
    // Create records with dates spread over the last few months
    const daysAgo = Math.floor(Math.random() * 90); // Random day within last 3 months
    const careDate = new Date(Date.now() - daysAgo * 1000 * 60 * 60 * 24);
    
    const record = createTestCareRecord(plantInstance, user, {
      careDate,
      ...baseOverrides,
    });
    
    records.push(record);
  }
  
  // Sort by date (most recent first)
  return records.sort((a, b) => new Date(b.careDate) - new Date(a.careDate));
};

/**
 * Creates a realistic care schedule for a plant
 * @param {Object} plantInstance - Plant instance object
 * @param {Object} user - User object
 * @param {number} months - Number of months of history to create
 * @returns {Array} Array of care records following a realistic schedule
 */
export const createRealisticCareSchedule = (plantInstance, user, months = 6) => {
  const records = [];
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  let currentDate = new Date(startDate);
  const endDate = new Date();
  
  while (currentDate <= endDate) {
    // Weekly watering
    if (Math.random() > 0.1) { // 90% chance of watering each week
      records.push(createTestWateringRecord(plantInstance, user, {
        careDate: new Date(currentDate),
      }));
    }
    
    // Monthly fertilizing (during growing season)
    const month = currentDate.getMonth();
    if ((month >= 2 && month <= 8) && currentDate.getDate() <= 7) { // March-September, first week
      records.push(createTestFertilizerRecord(plantInstance, user, {
        careDate: new Date(currentDate),
      }));
    }
    
    // Quarterly inspection
    if (currentDate.getDate() === 1 && month % 3 === 0) {
      records.push(createTestInspectionRecord(plantInstance, user, {
        careDate: new Date(currentDate),
      }));
    }
    
    // Occasional pruning
    if (Math.random() > 0.95) { // 5% chance each week
      records.push(createTestPruningRecord(plantInstance, user, {
        careDate: new Date(currentDate),
      }));
    }
    
    // Annual repotting
    if (month === 3 && currentDate.getDate() <= 7 && Math.random() > 0.7) { // April, 30% chance
      records.push(createTestRepottingRecord(plantInstance, user, {
        careDate: new Date(currentDate),
      }));
    }
    
    // Move to next week
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  // Sort by date (most recent first)
  return records.sort((a, b) => new Date(b.careDate) - new Date(a.careDate));
};

/**
 * Creates care statistics data for testing
 * @param {Array} careRecords - Array of care record objects
 * @returns {Object} Care statistics object
 */
export const createTestCareStatistics = (careRecords) => {
  const stats = {
    totalCareEvents: careRecords.length,
    careTypeBreakdown: {},
    recentActivity: 0,
    averageCaresPerWeek: 0,
    lastCareDate: null,
    upcomingCare: [],
  };
  
  // Calculate care type breakdown
  careRecords.forEach(record => {
    stats.careTypeBreakdown[record.careType] = (stats.careTypeBreakdown[record.careType] || 0) + 1;
  });
  
  // Calculate recent activity (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  stats.recentActivity = careRecords.filter(record => 
    new Date(record.careDate) >= thirtyDaysAgo
  ).length;
  
  // Calculate average cares per week
  if (careRecords.length > 0) {
    const oldestRecord = careRecords[careRecords.length - 1];
    const newestRecord = careRecords[0];
    const daysDiff = (new Date(newestRecord.careDate) - new Date(oldestRecord.careDate)) / (1000 * 60 * 60 * 24);
    const weeksDiff = daysDiff / 7;
    stats.averageCaresPerWeek = weeksDiff > 0 ? (careRecords.length / weeksDiff).toFixed(1) : 0;
    stats.lastCareDate = newestRecord.careDate;
  }
  
  return stats;
};

/**
 * Reset the care record counter (useful for test isolation)
 */
export const resetCareCounter = () => {
  careRecordCounter = 0;
};