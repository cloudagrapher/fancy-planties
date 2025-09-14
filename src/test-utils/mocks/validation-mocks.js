// Validation schema mocks for testing

/**
 * Create a mock Zod schema with proper parse and safeParse methods
 * @param {Object} mockData - Default data to return on successful parse
 * @param {boolean} shouldThrow - Whether parse should throw by default
 * @returns {Object} Mock Zod schema
 */
export const createMockZodSchema = (mockData = {}, shouldThrow = false) => {
  const mockParse = jest.fn();
  const mockSafeParse = jest.fn();

  if (shouldThrow) {
    const validationError = new Error('Validation failed');
    validationError.name = 'ZodError';
    validationError.issues = [{ path: ['field'], message: 'Validation error' }];
    mockParse.mockImplementation(() => { throw validationError; });
    mockSafeParse.mockReturnValue({ success: false, error: validationError });
  } else {
    mockParse.mockReturnValue(mockData);
    mockSafeParse.mockReturnValue({ success: true, data: mockData });
  }

  return {
    parse: mockParse,
    safeParse: mockSafeParse,
  };
};

/**
 * Mock plant taxonomy validation schemas
 */
export const mockPlantValidationSchemas = () => ({
  createPlantSchema: createMockZodSchema({
    family: 'Araceae',
    genus: 'Monstera',
    species: 'deliciosa',
    commonName: 'Swiss Cheese Plant',
  }),
  plantFilterSchema: createMockZodSchema({
    limit: 20,
    offset: 0,
    family: undefined,
    genus: undefined,
    search: undefined,
  }),
});

/**
 * Mock plant instance validation schemas
 */
export const mockPlantInstanceValidationSchemas = () => ({
  createPlantInstanceSchema: createMockZodSchema({
    plantId: 1,
    nickname: 'Test Plant',
    location: 'Living Room',
    fertilizerSchedule: 'monthly',
  }),
  updatePlantInstanceSchema: createMockZodSchema({
    nickname: 'Updated Plant',
    location: 'Kitchen',
    fertilizerSchedule: 'bi-weekly',
  }),
  plantInstanceFilterSchema: createMockZodSchema({
    limit: 20,
    offset: 0,
    location: undefined,
    fertilizerSchedule: undefined,
    isActive: true,
  }),
});

/**
 * Mock care tracking validation schemas
 */
export const mockCareValidationSchemas = () => ({
  createCareRecordSchema: createMockZodSchema({
    plantInstanceId: 1,
    careType: 'water',
    careDate: new Date().toISOString(),
    notes: 'Test care notes',
  }),
  careFilterSchema: createMockZodSchema({
    limit: 20,
    offset: 0,
    plantInstanceId: undefined,
    careType: undefined,
    startDate: undefined,
    endDate: undefined,
  }),
});

/**
 * Mock authentication validation schemas
 */
export const mockAuthValidationSchemas = () => ({
  signInSchema: createMockZodSchema({
    email: 'test@example.com',
    password: 'password123',
  }),
  signUpSchema: createMockZodSchema({
    email: 'test@example.com',
    password: 'Password123',
    name: 'Test User',
  }),
});

/**
 * Mock user profile validation schemas
 */
export const mockUserValidationSchemas = () => ({
  updateProfileSchema: createMockZodSchema({
    name: 'Updated User',
    email: 'updated@example.com',
  }),
  changePasswordSchema: createMockZodSchema({
    currentPassword: 'currentpass',
    newPassword: 'newpass123',
  }),
});

/**
 * Mock propagation validation schemas
 */
export const mockPropagationValidationSchemas = () => ({
  createPropagationSchema: createMockZodSchema({
    plantId: 1,
    parentInstanceId: 1,
    nickname: 'Test Cutting',
    location: 'Propagation Station',
    sourceType: 'internal',
  }),
  updatePropagationSchema: createMockZodSchema({
    nickname: 'Updated Cutting',
    location: 'Windowsill',
    status: 'rooting',
  }),
});

/**
 * Get all validation schema mocks
 */
export const getAllValidationMocks = () => ({
  ...mockPlantValidationSchemas(),
  ...mockPlantInstanceValidationSchemas(),
  ...mockCareValidationSchemas(),
  ...mockAuthValidationSchemas(),
  ...mockUserValidationSchemas(),
  ...mockPropagationValidationSchemas(),
});

/**
 * Create validation error mock
 * @param {string} field - Field that has the error
 * @param {string} message - Error message
 * @returns {Error} Mock ZodError
 */
export const createValidationError = (field, message) => {
  const error = new Error('Validation failed');
  error.name = 'ZodError';
  error.issues = [{ path: [field], message }];
  return error;
};

/**
 * Mock schema that always fails validation
 * @param {string} field - Field to fail on
 * @param {string} message - Error message
 * @returns {Object} Mock schema that throws
 */
export const createFailingSchema = (field = 'field', message = 'Validation failed') => {
  const error = createValidationError(field, message);
  return createMockZodSchema({}, true);
};