import { jest } from '@jest/globals';

// Mock database connection for tests
export const mockDb = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  execute: jest.fn(),
  transaction: jest.fn(),
};

// Mock test data factories
export const createMockUser = (overrides = {}) => ({
  id: 1,
  email: 'test@example.com',
  hashedPassword: 'hashedpassword',
  name: 'Test User',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockPlant = (overrides = {}) => ({
  id: 1,
  family: 'Araceae',
  genus: 'Monstera',
  species: 'deliciosa',
  commonName: 'Swiss Cheese Plant',
  isVerified: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockPlantInstance = (overrides = {}) => ({
  id: 1,
  userId: 1,
  plantId: 1,
  nickname: 'My Monstera',
  location: 'Living Room',
  fertilizerSchedule: '2 weeks',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockPropagation = (overrides = {}) => ({
  id: 1,
  userId: 1,
  plantId: 1,
  parentInstanceId: 1,
  nickname: 'Test Propagation',
  location: 'Propagation Station',
  dateStarted: new Date('2024-01-01'),
  status: 'started' as const,
  notes: 'Test notes',
  images: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

// Database mock setup function
export function setupDatabaseMocks() {
  // Reset all mocks
  Object.values(mockDb).forEach(mock => {
    if (typeof mock === 'function' && 'mockClear' in mock) {
      mock.mockClear();
    }
  });

  // Setup default return values
  mockDb.returning.mockResolvedValue([createMockUser()]);
  mockDb.execute.mockResolvedValue({ rows: [] });
  
  return mockDb;
}

// Mock the database module
export function mockDatabaseModule() {
  jest.mock('@/lib/db', () => ({
    db: mockDb,
    eq: jest.fn(),
    and: jest.fn(),
    desc: jest.fn(),
    asc: jest.fn(),
    sql: jest.fn(),
  }));
}