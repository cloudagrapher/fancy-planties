/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST } from '../advanced/route';

// Mock the auth validation
jest.mock('@/lib/auth/server', () => ({
  validateRequest: jest.fn(),
}));

// Mock the advanced search service
jest.mock('@/lib/services/advanced-search', () => ({
  advancedSearchService: {
    multiFieldSearch: jest.fn(),
  },
}));

import { validateRequest } from '@/lib/auth/server';
import { advancedSearchService } from '@/lib/services/advanced-search';

const mockValidateRequest = validateRequest as jest.MockedFunction<typeof validateRequest>;
const mockMultiFieldSearch = advancedSearchService.multiFieldSearch as jest.MockedFunction<
  typeof advancedSearchService.multiFieldSearch
>;

describe('/api/search/advanced', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockValidateRequest.mockResolvedValueOnce({ user: null, session: null });

    const request = new NextRequest('http://localhost/api/search/advanced', {
      method: 'POST',
      body: JSON.stringify({
        criteria: {
          nickname: 'test',
          operator: 'OR',
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('performs advanced search successfully', async () => {
    mockValidateRequest.mockResolvedValueOnce({
      user: { id: 1, email: 'test@example.com', name: 'Test User' },
      session: { id: 'session-id', userId: 1, expiresAt: new Date() },
    });

    const mockSearchResult = {
      searchId: 'test-search-id',
      searchType: 'advanced' as const,
      instances: [],
      totalCount: 0,
      hasMore: false,
      searchTime: 25,
      suggestions: [],
      relatedSearches: [],
      databaseTime: 15,
      processingTime: 10,
      filters: { userId: 1, limit: 20, offset: 0 },
    };

    mockMultiFieldSearch.mockResolvedValueOnce(mockSearchResult);

    const request = new NextRequest('http://localhost/api/search/advanced', {
      method: 'POST',
      body: JSON.stringify({
        criteria: {
          nickname: 'monstera',
          location: 'living room',
          operator: 'OR',
        },
        options: {
          limit: 10,
          offset: 0,
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockSearchResult);
    expect(mockMultiFieldSearch).toHaveBeenCalledWith(
      {
        nickname: 'monstera',
        location: 'living room',
        operator: 'OR',
      },
      1,
      {
        limit: 10,
        offset: 0,
      }
    );
  });

  it('validates request body schema', async () => {
    mockValidateRequest.mockResolvedValueOnce({
      user: { id: 1, email: 'test@example.com', name: 'Test User' },
      session: { id: 'session-id', userId: 1, expiresAt: new Date() },
    });

    const request = new NextRequest('http://localhost/api/search/advanced', {
      method: 'POST',
      body: JSON.stringify({
        criteria: {
          operator: 'INVALID' // Invalid operator should cause validation error
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid search parameters');
    expect(data.details).toBeDefined();
  });

  it('handles search service errors', async () => {
    mockValidateRequest.mockResolvedValueOnce({
      user: { id: 1, email: 'test@example.com', name: 'Test User' },
      session: { id: 'session-id', userId: 1, expiresAt: new Date() },
    });

    mockMultiFieldSearch.mockRejectedValueOnce(new Error('Search service error'));

    const request = new NextRequest('http://localhost/api/search/advanced', {
      method: 'POST',
      body: JSON.stringify({
        criteria: {
          nickname: 'test',
          operator: 'OR',
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Search failed');
  });

  it('uses default options when not provided', async () => {
    mockValidateRequest.mockResolvedValueOnce({
      user: { id: 1, email: 'test@example.com', name: 'Test User' },
      session: { id: 'session-id', userId: 1, expiresAt: new Date() },
    });

    const mockSearchResult = {
      searchId: 'test-search-id',
      searchType: 'advanced' as const,
      instances: [],
      totalCount: 0,
      hasMore: false,
      searchTime: 25,
      suggestions: [],
      relatedSearches: [],
      databaseTime: 15,
      processingTime: 10,
      filters: { userId: 1, limit: 20, offset: 0 },
    };

    mockMultiFieldSearch.mockResolvedValueOnce(mockSearchResult);

    const request = new NextRequest('http://localhost/api/search/advanced', {
      method: 'POST',
      body: JSON.stringify({
        criteria: {
          nickname: 'test',
          operator: 'OR',
        },
        // No options provided
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockMultiFieldSearch).toHaveBeenCalledWith(
      expect.any(Object),
      1,
      {} // Default empty options
    );
  });

  it('handles malformed JSON', async () => {
    mockValidateRequest.mockResolvedValueOnce({
      user: { id: 1, email: 'test@example.com', name: 'Test User' },
      session: { id: 'session-id', userId: 1, expiresAt: new Date() },
    });

    const request = new NextRequest('http://localhost/api/search/advanced', {
      method: 'POST',
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Search failed');
  });
});