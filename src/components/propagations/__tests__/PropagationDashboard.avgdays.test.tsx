import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test-utils/helpers/render-helpers';
import PropagationDashboard from '../PropagationDashboard';

// Mock apiFetch
const mockApiFetch = jest.fn();
jest.mock('@/lib/api-client', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

beforeEach(() => {
  mockApiFetch.mockImplementation((url: string) => {
    if (url.includes('/stats')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          totalPropagations: 2,
          byStatus: { started: 1, rooting: 1 },
          successRate: 0,
          averageDaysToReady: 0,
        }),
      });
    }
    if (url.includes('/propagations')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    }
    // curator-status and other calls
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });
});

describe('PropagationDashboard avg days empty state', () => {
  it('shows "--" when averageDaysToReady is 0/null', async () => {
    renderWithProviders(<PropagationDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('--')).toBeInTheDocument();
    });
    expect(screen.getByText('Avg Days to Ready')).toBeInTheDocument();
  });
});
