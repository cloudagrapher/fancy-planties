import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test-utils/helpers/render-helpers';
import DashboardClient from '../DashboardClient';

// Mock apiFetch to return stats
jest.mock('@/lib/api-client', () => ({
  apiFetch: jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      totalPlants: 5,
      activePlants: 3,
      careDueToday: 2,
      overdueCount: 1,
      totalPropagations: 4,
      activePropagations: 2,
      successfulPropagations: 1,
      propagationSuccessRate: 50,
      fertilizerEvents: [],
    }),
  }),
}));

const mockUser = {
  id: 1,
  name: 'Test',
  email: 'test@test.com',
  createdAt: '2026-01-01',
};

describe('Dashboard stat cards are clickable links', () => {
  it('wraps Plants stat card in a link to /dashboard/plants', () => {
    renderWithProviders(<DashboardClient user={mockUser} />);
    const plantsLink = screen.getByRole('link', { name: /plants/i });
    expect(plantsLink).toHaveAttribute('href', '/dashboard/plants');
  });

  it('wraps Care Tasks stat card in a link to /dashboard/care', () => {
    renderWithProviders(<DashboardClient user={mockUser} />);
    const careLink = screen.getByRole('link', { name: /care tasks/i });
    expect(careLink).toHaveAttribute('href', '/dashboard/care');
  });

  it('wraps Propagations stat card in a link to /dashboard/propagations', () => {
    renderWithProviders(<DashboardClient user={mockUser} />);
    const propLink = screen.getByRole('link', { name: /propagations/i });
    expect(propLink).toHaveAttribute('href', '/dashboard/propagations');
  });

  it('wraps Success Rate stat card in a link to /dashboard/propagations', () => {
    renderWithProviders(<DashboardClient user={mockUser} />);
    const successLink = screen.getByRole('link', { name: /success rate/i });
    expect(successLink).toHaveAttribute('href', '/dashboard/propagations');
  });
});
