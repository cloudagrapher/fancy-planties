// API mocking utilities

/**
 * Mock API endpoints for the plant tracker application
 */

/**
 * Mock authentication API endpoints
 */
export const mockAuthAPI = () => {
  const authResponses = {
    'POST /api/auth/signin': {
      success: true,
      user: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isCurator: false,
      },
      session: {
        id: 'mock-session-id',
        userId: 1,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    },
    'POST /api/auth/signup': {
      success: true,
      user: {
        id: 2,
        email: 'newuser@example.com',
        name: 'New User',
        isCurator: false,
      },
      session: {
        id: 'mock-session-id-2',
        userId: 2,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    },
    'POST /api/auth/logout': {
      success: true,
      message: 'Logged out successfully',
    },
    'GET /api/auth/me': {
      success: true,
      user: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isCurator: false,
      },
    },
  };

  return authResponses;
};

/**
 * Mock plant management API endpoints
 */
export const mockPlantAPI = () => {
  const plantResponses = {
    'GET /api/plants': {
      success: true,
      data: [
        {
          id: 1,
          family: 'Araceae',
          genus: 'Monstera',
          species: 'deliciosa',
          commonName: 'Swiss Cheese Plant',
          isVerified: true,
        },
        {
          id: 2,
          family: 'Ficus',
          genus: 'Ficus',
          species: 'elastica',
          commonName: 'Rubber Plant',
          isVerified: true,
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      },
    },
    'GET /api/plant-instances': {
      success: true,
      data: [
        {
          id: 1,
          userId: 1,
          plantId: 1,
          nickname: 'My Monstera',
          location: 'Living Room',
          fertilizerSchedule: 'monthly',
          isActive: true,
          plant: {
            id: 1,
            commonName: 'Swiss Cheese Plant',
            family: 'Araceae',
          },
        },
      ],
    },
    'POST /api/plant-instances': {
      success: true,
      data: {
        id: 3,
        userId: 1,
        plantId: 1,
        nickname: 'New Plant',
        location: 'Bedroom',
        fertilizerSchedule: 'weekly',
        isActive: true,
      },
    },
    'PUT /api/plant-instances/1': {
      success: true,
      data: {
        id: 1,
        userId: 1,
        plantId: 1,
        nickname: 'Updated Monstera',
        location: 'Kitchen',
        fertilizerSchedule: 'bi-weekly',
        isActive: true,
      },
    },
    'DELETE /api/plant-instances/1': {
      success: true,
      message: 'Plant instance deleted successfully',
    },
  };

  return plantResponses;
};

/**
 * Mock care tracking API endpoints
 */
export const mockCareAPI = () => {
  const careResponses = {
    'GET /api/care': {
      success: true,
      data: [
        {
          id: 1,
          userId: 1,
          plantInstanceId: 1,
          careType: 'water',
          careDate: new Date().toISOString(),
          notes: 'Watered thoroughly',
        },
        {
          id: 2,
          userId: 1,
          plantInstanceId: 1,
          careType: 'fertilizer',
          careDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Applied liquid fertilizer',
          fertilizerType: 'Balanced liquid fertilizer',
        },
      ],
    },
    'POST /api/care': {
      success: true,
      data: {
        id: 3,
        userId: 1,
        plantInstanceId: 1,
        careType: 'water',
        careDate: new Date().toISOString(),
        notes: 'New care record',
      },
    },
    'GET /api/dashboard': {
      success: true,
      data: {
        totalPlants: 5,
        activePlants: 4,
        careTasksDue: 2,
        recentCareEvents: 8,
        careStatistics: {
          thisWeek: 3,
          thisMonth: 12,
          totalCareEvents: 45,
        },
        upcomingTasks: [
          {
            id: 1,
            plantInstanceId: 1,
            plantNickname: 'My Monstera',
            taskType: 'fertilizer',
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            isOverdue: false,
          },
        ],
      },
    },
  };

  return careResponses;
};

/**
 * Mock propagation API endpoints
 */
export const mockPropagationAPI = () => {
  const propagationResponses = {
    'GET /api/propagations': {
      success: true,
      data: [
        {
          id: 1,
          userId: 1,
          plantId: 1,
          parentInstanceId: 1,
          nickname: 'Monstera Cutting',
          location: 'Propagation Station',
          status: 'rooting',
          sourceType: 'internal',
          dateStarted: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    },
    'POST /api/propagations': {
      success: true,
      data: {
        id: 2,
        userId: 1,
        plantId: 1,
        nickname: 'New Cutting',
        location: 'Windowsill',
        status: 'started',
        sourceType: 'internal',
        dateStarted: new Date().toISOString(),
      },
    },
    'PUT /api/propagations/1': {
      success: true,
      data: {
        id: 1,
        userId: 1,
        plantId: 1,
        nickname: 'Updated Cutting',
        status: 'planted',
      },
    },
  };

  return propagationResponses;
};

/**
 * Mock search API endpoints
 */
export const mockSearchAPI = () => {
  const searchResponses = {
    'GET /api/search': {
      success: true,
      data: {
        plants: [
          {
            id: 1,
            commonName: 'Swiss Cheese Plant',
            family: 'Araceae',
            genus: 'Monstera',
            species: 'deliciosa',
          },
        ],
        plantInstances: [
          {
            id: 1,
            nickname: 'My Monstera',
            location: 'Living Room',
            plant: {
              commonName: 'Swiss Cheese Plant',
            },
          },
        ],
        careRecords: [
          {
            id: 1,
            careType: 'water',
            careDate: new Date().toISOString(),
            plantInstance: {
              nickname: 'My Monstera',
            },
          },
        ],
      },
    },
  };

  return searchResponses;
};

/**
 * Mock data import API endpoints
 */
export const mockImportAPI = () => {
  const importResponses = {
    'POST /api/import/csv': {
      success: true,
      data: {
        importId: 'import-123',
        status: 'processing',
        totalRows: 10,
        processedRows: 0,
        errors: [],
      },
    },
    'GET /api/import/status/import-123': {
      success: true,
      data: {
        importId: 'import-123',
        status: 'completed',
        totalRows: 10,
        processedRows: 10,
        successfulRows: 9,
        errors: [
          {
            row: 5,
            error: 'Invalid plant species',
            data: { commonName: 'Unknown Plant' },
          },
        ],
      },
    },
    'GET /api/import/history': {
      success: true,
      data: [
        {
          id: 'import-123',
          fileName: 'plants.csv',
          status: 'completed',
          totalRows: 10,
          successfulRows: 9,
          createdAt: new Date().toISOString(),
        },
      ],
    },
  };

  return importResponses;
};

/**
 * Mock user profile API endpoints
 */
export const mockUserAPI = () => {
  const userResponses = {
    'GET /api/user/profile': {
      success: true,
      data: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isCurator: false,
        isEmailVerified: true,
        createdAt: new Date().toISOString(),
      },
    },
    'PUT /api/user/profile': {
      success: true,
      data: {
        id: 1,
        email: 'test@example.com',
        name: 'Updated User',
        isCurator: false,
        isEmailVerified: true,
      },
    },
    'POST /api/user/change-password': {
      success: true,
      message: 'Password changed successfully',
    },
  };

  return userResponses;
};

/**
 * Get all API mock responses
 */
export const getAllAPIMocks = () => {
  return {
    ...mockAuthAPI(),
    ...mockPlantAPI(),
    ...mockCareAPI(),
    ...mockPropagationAPI(),
    ...mockSearchAPI(),
    ...mockImportAPI(),
    ...mockUserAPI(),
  };
};

/**
 * Mock API error responses
 */
export const mockAPIErrors = () => {
  return {
    'POST /api/auth/signin': {
      status: 401,
      success: false,
      error: 'Invalid credentials',
    },
    'POST /api/auth/signup': {
      status: 409,
      success: false,
      error: 'User already exists',
    },
    'GET /api/plant-instances': {
      status: 401,
      success: false,
      error: 'Authentication required',
    },
    'POST /api/plant-instances': {
      status: 400,
      success: false,
      error: 'Validation failed',
      details: [
        {
          field: 'nickname',
          message: 'Nickname is required',
        },
      ],
    },
  };
};

/**
 * Apply all API mocks
 * @param {Object} customResponses - Custom response overrides
 */
export const applyAllAPIMocks = (customResponses = {}) => {
  const { mockApiResponse } = require('../helpers/api-helpers');
  
  const allResponses = {
    ...getAllAPIMocks(),
    ...customResponses,
  };
  
  mockApiResponse(allResponses);
  
  return allResponses;
};

/**
 * Apply API error mocks
 * @param {Object} customErrors - Custom error overrides
 */
export const applyAPIErrorMocks = (customErrors = {}) => {
  const { mockApiResponse } = require('../helpers/api-helpers');
  
  const allErrors = {
    ...mockAPIErrors(),
    ...customErrors,
  };
  
  mockApiResponse(allErrors);
  
  return allErrors;
};