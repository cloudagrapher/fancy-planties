import { NextRequest } from 'next/server';
import { POST as approveHandler } from '@/app/api/admin/plants/[id]/approve/route';
import { POST as rejectHandler } from '@/app/api/admin/plants/[id]/reject/route';
import { validateCuratorRequest } from '@/lib/auth/server';
import { AdminPlantQueries } from '@/lib/db/queries/admin-plants';

// Mock the dependencies
jest.mock('@/lib/auth/server');
jest.mock('@/lib/db/queries/admin-plants');

const mockValidateCuratorRequest = validateCuratorRequest as jest.MockedFunction<typeof validateCuratorRequest>;
const mockAdminPlantQueries = AdminPlantQueries as jest.Mocked<typeof AdminPlantQueries>;

describe('/api/admin/plants/[id]/approve', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should approve a plant successfully', async () => {
    // Mock curator validation
    mockValidateCuratorRequest.mockResolvedValue({
      user: { id: 1, name: 'Test Curator', isCurator: true } as any,
      session: { id: 'session1' } as any,
    });

    // Mock plant update
    const mockUpdatedPlant = {
      id: 1,
      family: 'Araceae',
      genus: 'Monstera',
      species: 'deliciosa',
      commonName: 'Swiss Cheese Plant',
      isVerified: true,
    };
    mockAdminPlantQueries.updatePlant.mockResolvedValue(mockUpdatedPlant as any);

    const request = new NextRequest('http://localhost/api/admin/plants/1/approve', {
      method: 'POST',
    });

    const context = { params: Promise.resolve({ id: '1' }) };
    const response = await approveHandler(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.plant).toEqual(mockUpdatedPlant);
    expect(mockAdminPlantQueries.updatePlant).toHaveBeenCalledWith(1, { isVerified: true });
  });

  it('should return 401 for non-curator users', async () => {
    mockValidateCuratorRequest.mockResolvedValue({
      user: null,
      session: null,
      error: 'Unauthorized',
    });

    const request = new NextRequest('http://localhost/api/admin/plants/1/approve', {
      method: 'POST',
    });

    const context = { params: Promise.resolve({ id: '1' }) };
    const response = await approveHandler(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 for invalid plant ID', async () => {
    mockValidateCuratorRequest.mockResolvedValue({
      user: { id: 1, name: 'Test Curator', isCurator: true } as any,
      session: { id: 'session1' } as any,
    });

    const request = new NextRequest('http://localhost/api/admin/plants/invalid/approve', {
      method: 'POST',
    });

    const context = { params: Promise.resolve({ id: 'invalid' }) };
    const response = await approveHandler(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid plant ID');
  });

  it('should handle database errors', async () => {
    mockValidateCuratorRequest.mockResolvedValue({
      user: { id: 1, name: 'Test Curator', isCurator: true } as any,
      session: { id: 'session1' } as any,
    });

    mockAdminPlantQueries.updatePlant.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/admin/plants/1/approve', {
      method: 'POST',
    });

    const context = { params: Promise.resolve({ id: '1' }) };
    const response = await approveHandler(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Database error');
  });
});

describe('/api/admin/plants/[id]/reject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject a plant successfully', async () => {
    mockValidateCuratorRequest.mockResolvedValue({
      user: { id: 1, name: 'Test Curator', isCurator: true } as any,
      session: { id: 'session1' } as any,
    });

    mockAdminPlantQueries.deletePlant.mockResolvedValue(true);

    const request = new NextRequest('http://localhost/api/admin/plants/1/reject', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Duplicate entry' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const context = { params: Promise.resolve({ id: '1' }) };
    const response = await rejectHandler(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.reason).toBe('Duplicate entry');
    expect(mockAdminPlantQueries.deletePlant).toHaveBeenCalledWith(1);
  });

  it('should return 400 for missing rejection reason', async () => {
    mockValidateCuratorRequest.mockResolvedValue({
      user: { id: 1, name: 'Test Curator', isCurator: true } as any,
      session: { id: 'session1' } as any,
    });

    const request = new NextRequest('http://localhost/api/admin/plants/1/reject', {
      method: 'POST',
      body: JSON.stringify({ reason: '' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const context = { params: Promise.resolve({ id: '1' }) };
    const response = await rejectHandler(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('should return 404 when plant cannot be deleted', async () => {
    mockValidateCuratorRequest.mockResolvedValue({
      user: { id: 1, name: 'Test Curator', isCurator: true } as any,
      session: { id: 'session1' } as any,
    });

    mockAdminPlantQueries.deletePlant.mockResolvedValue(false);

    const request = new NextRequest('http://localhost/api/admin/plants/1/reject', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Invalid plant' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const context = { params: Promise.resolve({ id: '1' }) };
    const response = await rejectHandler(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Plant not found or could not be deleted');
  });
});