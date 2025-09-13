import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PlantApprovalQueue from '@/components/admin/PlantApprovalQueue';
import type { PlantWithDetails } from '@/lib/db/queries/admin-plants';

// Mock fetch
global.fetch = jest.fn();

const mockPlants: PlantWithDetails[] = [
  {
    id: 1,
    family: 'Araceae',
    genus: 'Monstera',
    species: 'deliciosa',
    cultivar: null,
    commonName: 'Swiss Cheese Plant',
    careInstructions: 'Water when soil is dry',
    defaultImage: null,
    createdBy: 1,
    isVerified: false,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    createdByName: 'Test User',
    instanceCount: 2,
    propagationCount: 1,
  },
  {
    id: 2,
    family: 'Pothos',
    genus: 'Epipremnum',
    species: 'aureum',
    cultivar: 'Golden',
    commonName: 'Golden Pothos',
    careInstructions: null,
    defaultImage: null,
    createdBy: 2,
    isVerified: false,
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
    createdByName: 'Another User',
    instanceCount: 0,
    propagationCount: 0,
  },
];

describe('PlantApprovalQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  it('renders pending plants correctly', () => {
    render(
      <PlantApprovalQueue 
        pendingPlants={mockPlants} 
        totalCount={2} 
      />
    );

    expect(screen.getByText('2 plants pending')).toBeInTheDocument();
    expect(screen.getByText('Swiss Cheese Plant')).toBeInTheDocument();
    expect(screen.getByText('Golden Pothos')).toBeInTheDocument();
    expect(screen.getByText('Araceae')).toBeInTheDocument();
    expect(screen.getByText('Monstera')).toBeInTheDocument();
    expect(screen.getByText('deliciosa')).toBeInTheDocument();
  });

  it('shows empty state when no plants are pending', () => {
    render(
      <PlantApprovalQueue 
        pendingPlants={[]} 
        totalCount={0} 
      />
    );

    expect(screen.getByText('All caught up!')).toBeInTheDocument();
    expect(screen.getByText('No plants are currently pending approval.')).toBeInTheDocument();
  });

  it('handles plant approval successfully', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    render(
      <PlantApprovalQueue 
        pendingPlants={mockPlants} 
        totalCount={2} 
      />
    );

    const approveButtons = screen.getAllByText('✓ Approve');
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/plants/1/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    // Plant should be removed from the list
    await waitFor(() => {
      expect(screen.getByText('1 plant pending')).toBeInTheDocument();
      expect(screen.queryByText('Swiss Cheese Plant')).not.toBeInTheDocument();
    });
  });

  it('handles plant rejection with reason', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    render(
      <PlantApprovalQueue 
        pendingPlants={mockPlants} 
        totalCount={2} 
      />
    );

    const rejectButtons = screen.getAllByText('✗ Reject');
    fireEvent.click(rejectButtons[0]);

    // Should show reject dialog
    expect(screen.getByText('Reject Plant Submission')).toBeInTheDocument();

    const reasonInput = screen.getByPlaceholderText(/Reason for rejection/);
    fireEvent.change(reasonInput, { target: { value: 'Duplicate entry' } });

    const confirmButton = screen.getByText('Confirm Rejection');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/plants/1/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Duplicate entry' }),
      });
    });
  });

  it('shows processing state during actions', async () => {
    // Mock a delayed response
    (fetch as jest.MockedFunction<typeof fetch>).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true }),
      } as Response), 100))
    );

    render(
      <PlantApprovalQueue 
        pendingPlants={mockPlants} 
        totalCount={2} 
      />
    );

    const approveButtons = screen.getAllByText('✓ Approve');
    fireEvent.click(approveButtons[0]);

    // Should show processing state
    await waitFor(() => {
      expect(screen.getByText('1 processing...')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Database error' }),
    } as Response);

    render(
      <PlantApprovalQueue 
        pendingPlants={mockPlants} 
        totalCount={2} 
      />
    );

    const approveButtons = screen.getAllByText('✓ Approve');
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Database error');
    });

    alertSpy.mockRestore();
  });

  it('displays plant metadata correctly', () => {
    render(
      <PlantApprovalQueue 
        pendingPlants={mockPlants} 
        totalCount={2} 
      />
    );

    // Check submission info
    expect(screen.getByText('Submitted by: Test User')).toBeInTheDocument();
    expect(screen.getByText('Submitted by: Another User')).toBeInTheDocument();

    // Check usage stats
    expect(screen.getByText('2 instances')).toBeInTheDocument();
    expect(screen.getByText('1 propagation')).toBeInTheDocument();
    expect(screen.getByText('0 instances')).toBeInTheDocument();
    expect(screen.getByText('0 propagations')).toBeInTheDocument();

    // Check care instructions
    expect(screen.getByText('Water when soil is dry')).toBeInTheDocument();
  });

  it('shows cultivar information when present', () => {
    render(
      <PlantApprovalQueue 
        pendingPlants={mockPlants} 
        totalCount={2} 
      />
    );

    // Should show cultivar for Golden Pothos
    expect(screen.getByText("'Golden'")).toBeInTheDocument();
  });
});