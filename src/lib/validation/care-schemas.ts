import { z } from 'zod';

// Care type schema
export const careTypeSchema = z.enum([
  'fertilizer',
  'water',
  'repot',
  'prune',
  'inspect',
  'other'
]);

// Fertilizer schedule schema
export const fertilizerScheduleSchema = z.enum([
  'weekly',
  'biweekly', 
  'monthly',
  'bimonthly',
  'quarterly',
  'custom'
]).or(z.string().regex(/^\d+$/, 'Custom schedule must be a number of days'));

// Care history entry schema
export const careHistorySchema = z.object({
  id: z.number().optional(),
  userId: z.number(),
  plantInstanceId: z.number(),
  careType: careTypeSchema,
  careDate: z.date(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
  fertilizerType: z.string().max(100, 'Fertilizer type must be less than 100 characters').optional(),
  potSize: z.string().max(50, 'Pot size must be less than 50 characters').optional(),
  soilType: z.string().max(100, 'Soil type must be less than 100 characters').optional(),
  images: z.array(z.string()).default([]),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Care form data schema for creating new care entries
export const careFormSchema = z.object({
  plantInstanceId: z.number().min(1, 'Plant instance ID is required'),
  careType: careTypeSchema,
  careDate: z.date().refine(
    (date) => date <= new Date(),
    'Care date cannot be in the future'
  ).refine(
    (date) => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return date >= oneYearAgo;
    },
    'Care date cannot be more than one year ago'
  ),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
  fertilizerType: z.string().max(100, 'Fertilizer type must be less than 100 characters').optional(),
  potSize: z.string().max(50, 'Pot size must be less than 50 characters').optional(),
  soilType: z.string().max(100, 'Soil type must be less than 100 characters').optional(),
  images: z.array(z.string()).default([]),
  updateSchedule: z.boolean().default(true),
}).refine(
  (data) => {
    // If care type is fertilizer, fertilizer type is recommended
    if (data.careType === 'fertilizer' && !data.fertilizerType) {
      return true; // Allow but will show warning
    }
    return true;
  }
).refine(
  (data) => {
    // If care type is repot, pot size and soil type are recommended
    if (data.careType === 'repot' && (!data.potSize || !data.soilType)) {
      return true; // Allow but will show warning
    }
    return true;
  }
);

// Quick care log schema for simple care logging
export const quickCareLogSchema = z.object({
  plantInstanceId: z.number().min(1, 'Plant instance ID is required'),
  careType: careTypeSchema,
  careDate: z.date().default(() => new Date()),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

// Bulk care operation schema
export const bulkCareSchema = z.object({
  plantInstanceIds: z.array(z.number()).min(1, 'At least one plant must be selected'),
  careType: careTypeSchema,
  careDate: z.date().default(() => new Date()),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  fertilizerType: z.string().max(100, 'Fertilizer type must be less than 100 characters').optional(),
});

// Care filter schema for querying care history
export const careFilterSchema = z.object({
  plantInstanceId: z.number().optional(),
  careType: careTypeSchema.optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['care_date', 'care_type', 'created_at']).default('care_date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Care statistics query schema
export const careStatsQuerySchema = z.object({
  plantInstanceId: z.number().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  careTypes: z.array(careTypeSchema).optional(),
});

// Care reminder schema
export const careReminderSchema = z.object({
  id: z.string().optional(),
  plantInstanceId: z.number(),
  careType: careTypeSchema,
  reminderDate: z.date(),
  isActive: z.boolean().default(true),
  notificationSent: z.boolean().default(false),
  createdAt: z.date().optional(),
});

// Plant instance care update schema
export const plantInstanceCareUpdateSchema = z.object({
  lastFertilized: z.date().optional(),
  fertilizerSchedule: fertilizerScheduleSchema.optional(),
  fertilizerDue: z.date().optional(),
  lastRepot: z.date().optional(),
});

// Care dashboard query schema
export const careDashboardQuerySchema = z.object({
  userId: z.number(),
  includeInactive: z.boolean().default(false),
  daysAhead: z.number().min(1).max(30).default(7), // How many days ahead to look for "due soon"
});

// Care schedule calculation input schema
export const careScheduleInputSchema = z.object({
  lastFertilized: z.date().nullable(),
  fertilizerSchedule: fertilizerScheduleSchema,
  currentDate: z.date().default(() => new Date()),
});

// Export type definitions
export type CareTypeInput = z.infer<typeof careTypeSchema>;
export type FertilizerScheduleInput = z.infer<typeof fertilizerScheduleSchema>;
export type CareHistoryInput = z.infer<typeof careHistorySchema>;
export type CareFormInput = z.infer<typeof careFormSchema>;
export type QuickCareLogInput = z.infer<typeof quickCareLogSchema>;
export type BulkCareInput = z.infer<typeof bulkCareSchema>;
export type CareFilterInput = z.infer<typeof careFilterSchema>;
export type CareStatsQueryInput = z.infer<typeof careStatsQuerySchema>;
export type CareReminderInput = z.infer<typeof careReminderSchema>;
export type PlantInstanceCareUpdateInput = z.infer<typeof plantInstanceCareUpdateSchema>;
export type CareDashboardQueryInput = z.infer<typeof careDashboardQuerySchema>;
export type CareScheduleInput = z.infer<typeof careScheduleInputSchema>;

// Validation helper functions
export const careValidation = {
  // Validate care form data
  validateCareForm: (data: unknown) => {
    return careFormSchema.safeParse(data);
  },

  // Validate quick care log
  validateQuickCareLog: (data: unknown) => {
    return quickCareLogSchema.safeParse(data);
  },

  // Validate bulk care operation
  validateBulkCare: (data: unknown) => {
    return bulkCareSchema.safeParse(data);
  },

  // Validate care filter
  validateCareFilter: (data: unknown) => {
    return careFilterSchema.safeParse(data);
  },

  // Validate care reminder
  validateCareReminder: (data: unknown) => {
    return careReminderSchema.safeParse(data);
  },

  // Validate fertilizer schedule
  validateFertilizerSchedule: (schedule: string): boolean => {
    return fertilizerScheduleSchema.safeParse(schedule).success;
  },

  // Parse fertilizer schedule to days
  parseFertilizerScheduleToDays: (schedule: string): number => {
    const scheduleMap: Record<string, number> = {
      'weekly': 7,
      'biweekly': 14,
      'monthly': 30,
      'bimonthly': 60,
      'quarterly': 90
    };

    // Check if it's a predefined schedule
    if (scheduleMap[schedule]) {
      return scheduleMap[schedule];
    }

    // Try to parse as custom number of days
    const customDays = parseInt(schedule, 10);
    if (!isNaN(customDays) && customDays > 0) {
      return customDays;
    }

    // Default to monthly if unable to parse
    return 30;
  },

  // Validate care date range
  validateDateRange: (startDate?: Date, endDate?: Date): boolean => {
    if (!startDate || !endDate) return true;
    return startDate <= endDate;
  },

  // Get care type validation error messages
  getCareTypeErrorMessage: (careType: string): string | null => {
    const validTypes = ['fertilizer', 'water', 'repot', 'prune', 'inspect', 'other'];
    if (!validTypes.includes(careType)) {
      return `Care type must be one of: ${validTypes.join(', ')}`;
    }
    return null;
  }
};