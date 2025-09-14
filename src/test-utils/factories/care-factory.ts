// Care record test data factory
import type { NewCareHistory } from "@/lib/db/schema";

// Counter for unique test data
let careRecordCounter = 0;

// Care types and related data for realistic test records
const CARE_TYPES = [
  "fertilizer",
  "water",
  "repot",
  "prune",
  "inspect",
  "other",
] as const;
type CareType = (typeof CARE_TYPES)[number];

const FERTILIZER_TYPES = [
  "Balanced liquid fertilizer (10-10-10)",
  "High nitrogen fertilizer (20-10-10)",
  "Bloom booster (10-30-20)",
  "Organic compost tea",
  "Fish emulsion",
  "Worm casting tea",
  "Slow-release granules",
];

const POT_SIZES = [
  "4 inch",
  "6 inch",
  "8 inch",
  "10 inch",
  "12 inch",
  "14 inch",
  "Small",
  "Medium",
  "Large",
  "Extra Large",
];

const SOIL_TYPES = [
  "Standard potting mix",
  "Cactus and succulent mix",
  "African violet mix",
  "Orchid bark mix",
  "Custom aroid mix",
  "Seed starting mix",
  "Organic potting soil",
];

const CARE_NOTES = [
  "Plant looking healthy and growing well",
  "Noticed some new growth this week",
  "Soil was quite dry, gave thorough watering",
  "Removed a few yellow leaves",
  "Plant seems to be thriving in this location",
  "Added humidity tray to help with dry air",
  "Rotated plant for even light exposure",
  "Checked for pests - all clear",
  "Roots were getting pot-bound, time for repot",
  "Pruned back leggy growth to encourage bushiness",
];

/**
 * Creates a test care record with realistic data
 * @param overrides - Properties to override in the generated care record
 * @returns Test care record object
 */
export const createTestCareRecord = (
  overrides: Partial<NewCareHistory> = {}
): NewCareHistory => {
  careRecordCounter++;

  const careType = CARE_TYPES[careRecordCounter % CARE_TYPES.length];
  const careDate = new Date(
    Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30
  ); // Random date within last 30 days

  const baseCareRecord: NewCareHistory = {
    // Don't include id - let database auto-generate
    userId: 1, // Default user ID, should be overridden
    plantInstanceId: 1, // Default plant instance ID, should be overridden
    careType: overrides.careType || careType,
    careDate: overrides.careDate || careDate,
    notes: CARE_NOTES[careRecordCounter % CARE_NOTES.length],
    fertilizerType:
      (overrides.careType || careType) === "fertilizer"
        ? FERTILIZER_TYPES[careRecordCounter % FERTILIZER_TYPES.length]
        : null,
    potSize:
      (overrides.careType || careType) === "repot"
        ? POT_SIZES[careRecordCounter % POT_SIZES.length]
        : null,
    soilType:
      (overrides.careType || careType) === "repot"
        ? SOIL_TYPES[careRecordCounter % SOIL_TYPES.length]
        : null,
    images: [],
  };

  return {
    ...baseCareRecord,
    ...overrides,
  };
};

/**
 * Creates a fertilizer care record
 * @param plantInstanceId - Plant instance ID
 * @param userId - User ID
 * @param overrides - Properties to override
 * @returns Test fertilizer care record
 */
export const createTestFertilizerRecord = (
  plantInstanceId: number,
  userId: number,
  overrides: Partial<NewCareHistory> = {}
): NewCareHistory => {
  return createTestCareRecord({
    plantInstanceId,
    userId,
    careType: "fertilizer",
    fertilizerType: FERTILIZER_TYPES[0],
    notes: "Applied balanced liquid fertilizer at half strength",
    ...overrides,
  });
};

/**
 * Creates a watering care record
 * @param plantInstanceId - Plant instance ID
 * @param userId - User ID
 * @param overrides - Properties to override
 * @returns Test watering care record
 */
export const createTestWateringRecord = (
  plantInstanceId: number,
  userId: number,
  overrides: Partial<NewCareHistory> = {}
): NewCareHistory => {
  return createTestCareRecord({
    plantInstanceId,
    userId,
    careType: "water",
    notes: "Watered thoroughly until water drained from bottom",
    ...overrides,
  });
};

/**
 * Creates a repotting care record
 * @param plantInstanceId - Plant instance ID
 * @param userId - User ID
 * @param overrides - Properties to override
 * @returns Test repotting care record
 */
export const createTestRepottingRecord = (
  plantInstanceId: number,
  userId: number,
  overrides: Partial<NewCareHistory> = {}
): NewCareHistory => {
  return createTestCareRecord({
    plantInstanceId,
    userId,
    careType: "repot",
    potSize: POT_SIZES[0],
    soilType: SOIL_TYPES[0],
    notes: "Repotted into larger container with fresh soil mix",
    ...overrides,
  });
};

/**
 * Creates a pruning care record
 * @param plantInstanceId - Plant instance ID
 * @param userId - User ID
 * @param overrides - Properties to override
 * @returns Test pruning care record
 */
export const createTestPruningRecord = (
  plantInstanceId: number,
  userId: number,
  overrides: Partial<NewCareHistory> = {}
): NewCareHistory => {
  return createTestCareRecord({
    plantInstanceId,
    userId,
    careType: "prune",
    notes: "Removed dead and yellowing leaves, trimmed leggy growth",
    ...overrides,
  });
};

/**
 * Creates an inspection care record
 * @param plantInstanceId - Plant instance ID
 * @param userId - User ID
 * @param overrides - Properties to override
 * @returns Test inspection care record
 */
export const createTestInspectionRecord = (
  plantInstanceId: number,
  userId: number,
  overrides: Partial<NewCareHistory> = {}
): NewCareHistory => {
  return createTestCareRecord({
    plantInstanceId,
    userId,
    careType: "inspect",
    notes: "Weekly health check - plant looking good, no pests detected",
    ...overrides,
  });
};

/**
 * Creates a care history for a plant instance
 * @param plantInstanceId - Plant instance ID
 * @param userId - User ID
 * @param count - Number of care records to create
 * @param baseOverrides - Base properties to apply to all records
 * @returns Array of test care record objects
 */
export const createTestCareHistory = (
  plantInstanceId: number,
  userId: number,
  count = 10,
  baseOverrides: Partial<NewCareHistory> = {}
): NewCareHistory[] => {
  const records: NewCareHistory[] = [];

  for (let i = 0; i < count; i++) {
    // Create records with dates spread over the last few months
    const daysAgo = Math.floor(Math.random() * 90); // Random day within last 3 months
    const careDate = new Date(Date.now() - daysAgo * 1000 * 60 * 60 * 24);

    const record = createTestCareRecord({
      plantInstanceId,
      userId,
      careDate,
      ...baseOverrides,
    });

    records.push(record);
  }

  // Sort by date (most recent first)
  return records.sort(
    (a, b) => new Date(b.careDate).getTime() - new Date(a.careDate).getTime()
  );
};

/**
 * Creates a realistic care schedule for a plant
 * @param plantInstanceId - Plant instance ID
 * @param userId - User ID
 * @param months - Number of months of history to create
 * @returns Array of care records following a realistic schedule
 */
export const createRealisticCareSchedule = (
  plantInstanceId: number,
  userId: number,
  months = 6
): NewCareHistory[] => {
  const records: NewCareHistory[] = [];
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  let currentDate = new Date(startDate);
  const endDate = new Date();

  while (currentDate <= endDate) {
    // Weekly watering
    if (Math.random() > 0.1) {
      // 90% chance of watering each week
      records.push(
        createTestWateringRecord(plantInstanceId, userId, {
          careDate: new Date(currentDate),
        })
      );
    }

    // Monthly fertilizing (during growing season)
    const month = currentDate.getMonth();
    if (month >= 2 && month <= 8 && currentDate.getDate() <= 7) {
      // March-September, first week
      records.push(
        createTestFertilizerRecord(plantInstanceId, userId, {
          careDate: new Date(currentDate),
        })
      );
    }

    // Quarterly inspection
    if (currentDate.getDate() === 1 && month % 3 === 0) {
      records.push(
        createTestInspectionRecord(plantInstanceId, userId, {
          careDate: new Date(currentDate),
        })
      );
    }

    // Occasional pruning
    if (Math.random() > 0.95) {
      // 5% chance each week
      records.push(
        createTestPruningRecord(plantInstanceId, userId, {
          careDate: new Date(currentDate),
        })
      );
    }

    // Annual repotting
    if (month === 3 && currentDate.getDate() <= 7 && Math.random() > 0.7) {
      // April, 30% chance
      records.push(
        createTestRepottingRecord(plantInstanceId, userId, {
          careDate: new Date(currentDate),
        })
      );
    }

    // Move to next week
    currentDate.setDate(currentDate.getDate() + 7);
  }

  // Sort by date (most recent first)
  return records.sort(
    (a, b) => new Date(b.careDate).getTime() - new Date(a.careDate).getTime()
  );
};

/**
 * Creates care statistics data for testing
 * @param careRecords - Array of care record objects
 * @returns Care statistics object
 */
export const createTestCareStatistics = (careRecords: NewCareHistory[]) => {
  const stats = {
    totalCareEvents: careRecords.length,
    careTypeBreakdown: {} as Record<string, number>,
    recentActivity: 0,
    averageCaresPerWeek: 0,
    lastCareDate: null as Date | null,
    upcomingCare: [] as any[],
  };

  // Calculate care type breakdown
  careRecords.forEach((record) => {
    stats.careTypeBreakdown[record.careType] =
      (stats.careTypeBreakdown[record.careType] || 0) + 1;
  });

  // Calculate recent activity (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  stats.recentActivity = careRecords.filter(
    (record) => new Date(record.careDate) >= thirtyDaysAgo
  ).length;

  // Calculate average cares per week
  if (careRecords.length > 0) {
    const oldestRecord = careRecords[careRecords.length - 1];
    const newestRecord = careRecords[0];
    const daysDiff =
      (new Date(newestRecord.careDate).getTime() -
        new Date(oldestRecord.careDate).getTime()) /
      (1000 * 60 * 60 * 24);
    const weeksDiff = daysDiff / 7;
    stats.averageCaresPerWeek =
      weeksDiff > 0
        ? parseFloat((careRecords.length / weeksDiff).toFixed(1))
        : 0;
    stats.lastCareDate = newestRecord.careDate;
  }

  return stats;
};

/**
 * Creates test data for care tracking workflows
 * @param plantInstanceId - Plant instance ID
 * @param userId - User ID
 * @returns Complete test data set for care tracking testing
 */
export const createCareTrackingTestData = (plantInstanceId = 1, userId = 1) => {
  const recentCareHistory = createTestCareHistory(plantInstanceId, userId, 5);
  const fullCareHistory = createRealisticCareSchedule(
    plantInstanceId,
    userId,
    6
  );
  const careStatistics = createTestCareStatistics(fullCareHistory);

  return {
    recentCareHistory,
    fullCareHistory,
    careStatistics,
    upcomingCare: [
      {
        plantInstanceId,
        careType: "fertilizer",
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days from now
        overdue: false,
      },
      {
        plantInstanceId,
        careType: "water",
        dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), // 1 day ago (overdue)
        overdue: true,
      },
    ],
  };
};

/**
 * Creates test data for different care scenarios
 * @param plantInstanceId - Plant instance ID
 * @param userId - User ID
 * @returns Test data for various care scenarios
 */
export const createCareScenarioTestData = (plantInstanceId = 1, userId = 1) => {
  return {
    // Plant that needs immediate care
    overdueWatering: createTestWateringRecord(plantInstanceId, userId, {
      careDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10), // 10 days ago
      notes: "Last watering was too long ago",
    }),

    // Plant that was just cared for
    recentFertilizing: createTestFertilizerRecord(plantInstanceId, userId, {
      careDate: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      notes: "Just fertilized this morning",
    }),

    // Plant with comprehensive care
    comprehensiveCare: [
      createTestWateringRecord(plantInstanceId, userId, {
        careDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), // 1 day ago
      }),
      createTestFertilizerRecord(plantInstanceId, userId, {
        careDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14), // 2 weeks ago
      }),
      createTestInspectionRecord(plantInstanceId, userId, {
        careDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 1 week ago
      }),
      createTestRepottingRecord(plantInstanceId, userId, {
        careDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90), // 3 months ago
      }),
    ],

    // Plant with irregular care pattern
    irregularCare: [
      createTestWateringRecord(plantInstanceId, userId, {
        careDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      }),
      createTestWateringRecord(plantInstanceId, userId, {
        careDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15), // 15 days ago (gap)
      }),
      createTestWateringRecord(plantInstanceId, userId, {
        careDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 17), // 17 days ago
      }),
    ],
  };
};

/**
 * Creates test data for care validation scenarios
 * @returns Test data for care validation testing
 */
export const createCareValidationTestData = () => {
  return {
    validCareRecord: createTestCareRecord({
      careType: "water",
      careDate: new Date(),
      notes: "Valid care record with all required fields",
    }),

    invalidCareType: {
      careType: "invalid_type" as any,
      careDate: new Date(),
      notes: "Invalid care type",
    } as NewCareHistory,

    futureCareDate: createTestCareRecord({
      careType: "fertilizer",
      careDate: new Date(Date.now() + 1000 * 60 * 60 * 24), // Tomorrow
      notes: "Care date in the future",
    }),

    missingRequiredFields: {
      // Missing careType and careDate
      notes: "Missing required fields",
    } as Partial<NewCareHistory>,

    fertilizerWithoutType: createTestCareRecord({
      careType: "fertilizer",
      careDate: new Date(),
      notes: "Fertilizer care without fertilizer type",
      fertilizerType: null,
    }),

    repotWithoutDetails: createTestCareRecord({
      careType: "repot",
      careDate: new Date(),
      notes: "Repot care without pot size or soil type",
      potSize: null,
      soilType: null,
    }),
  };
};

/**
 * Reset the care record counter (useful for test isolation)
 */
export const resetCareCounter = () => {
  careRecordCounter = 0;
};
