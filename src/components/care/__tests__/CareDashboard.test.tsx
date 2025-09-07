import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { render, createMockPlantInstance, setupMockFetch, mockApiResponse } from '@/__tests__/utils/test-utils';
import CareDashboard from '../CareDashboard';

describe('CareDashboard', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = setupMockFetch();
  });

  it('renders dashboard sections correctly', async () => {
    const mockData = {
      overduePlants: [
        createMockPlantInstance({
          id: 1,
          nickname: 'Overdue Plant',
          careUrgency: 'critical',
          daysUntilFertilizerDue: -5,
        }),
      ],
      dueTodayPlants: [
        createMockPlantInstance({
          id: 2,
          nickname: 'Due Today Plant',
          careUrgency: 'high',
          daysUntilFertilizerDue: 0,
        }),
      ],
      upcomingPlants: [
        createMockPlantInstance({
          id: 3,
          nickname: 'Upcoming Plant',
          careUrgency: 'low',
          daysUntilFertilizerDue: 3,
        }),
      ],
      recentActivities: [],
      statistics: {
        totalPlants: 10,
        plantsNeedingCare: 3,
        careStreak: 5,
      },
    };

    mockFetch.mockResolvedValueOnce(mockApiResponse(mockData));

    render(<CareDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Care Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Overdue (1)')).toBeInTheDocument();
    expect(screen.getByText('Due Today (1)')).toBeInTheDocument();
    expect(screen.getByText('Upcoming (1)')).toBeInTheDocument();
  });

  it('displays overdue plants with correct styling', async () => {
    const mockData = {
      overduePlants: [
        createMockPlantInstance({
          nickname: 'Critical Plant',
          careUrgency: 'critical',
          daysUntilFertilizerDue: -10,
        }),
      ],
      dueTodayPlants: [],
      upcomingPlants: [],
      recentActivities: [],
      statistics: { totalPlants: 1, plantsNeedingCare: 1, careStreak: 0 },
    };

    mockFetch.mockResolvedValueOnce(mockApiResponse(mockData));

    render(<CareDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Critical Plant')).toBeInTheDocument();
    });

    expect(screen.getByText('10 days overdue')).toBeInTheDocument();
  });

  it('shows empty state when no plants need care', async () => {
    const mockData = {
      overduePlants: [],
      dueTodayPlants: [],
      upcomingPlants: [],
      recentActivities: [],
      statistics: { totalPlants: 5, plantsNeedingCare: 0, careStreak: 10 },
    };

    mockFetch.mockResolvedValueOnce(mockApiResponse(mockData));

    render(<CareDashboard />);

    await waitFor(() => {
      expect(screen.getByText('All caught up!')).toBeInTheDocument();
    });

    expect(screen.getByText('Your plants are happy and healthy')).toBeInTheDocument();
  });

  it('displays care statistics correctly', async () => {
    const mockData = {
      overduePlants: [],
      dueTodayPlants: [],
      upcomingPlants: [],
      recentActivities: [],
      statistics: {
        totalPlants: 15,
        plantsNeedingCare: 3,
        careStreak: 7,
        weeklyGoal: 10,
        completedThisWeek: 8,
      },
    };

    mockFetch.mockResolvedValueOnce(mockApiResponse(mockData));

    render(<CareDashboard />);

    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument(); // Total plants
    });

    expect(screen.getByText('3')).toBeInTheDocument(); // Plants needing care
    expect(screen.getByText('7 day streak')).toBeInTheDocument();
  });

  it('handles quick care actions', async () => {
    const mockData = {
      overduePlants: [
        createMockPlantInstance({
          id: 1,
          nickname: 'Test Plant',
          careUrgency: 'high',
        }),
      ],
      dueTodayPlants: [],
      upcomingPlants: [],
      recentActivities: [],
      statistics: { totalPlants: 1, plantsNeedingCare: 1, careStreak: 0 },
    };

    mockFetch
      .mockResolvedValueOnce(mockApiResponse(mockData))
      .mockResolvedValueOnce(mockApiResponse({ success: true }));

    const { user } = render(<CareDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Test Plant')).toBeInTheDocument();
    });

    const quickCareButton = screen.getByLabelText('Quick fertilize');
    await user.click(quickCareButton);

    expect(mockFetch).toHaveBeenCalledWith('/api/care/quick-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plantInstanceId: 1,
        careType: 'fertilizer',
      }),
    });
  });

  it('shows recent care activities', async () => {
    const mockData = {
      overduePlants: [],
      dueTodayPlants: [],
      upcomingPlants: [],
      recentActivities: [
        {
          id: 1,
          plantInstanceId: 1,
          careType: 'fertilizer',
          careDate: new Date('2024-01-01'),
          plantInstance: {
            nickname: 'Recent Plant',
          },
        },
      ],
      statistics: { totalPlants: 1, plantsNeedingCare: 0, careStreak: 1 },
    };

    mockFetch.mockResolvedValueOnce(mockApiResponse(mockData));

    render(<CareDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Recent Activities')).toBeInTheDocument();
    });

    expect(screen.getByText('Recent Plant')).toBeInTheDocument();
    expect(screen.getByText('Fertilized')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    mockFetch.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<CareDashboard />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading care dashboard...')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Failed to load'));

    render(<CareDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load care dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('refreshes data when retry button is clicked', async () => {
    const mockData = {
      overduePlants: [],
      dueTodayPlants: [],
      upcomingPlants: [],
      recentActivities: [],
      statistics: { totalPlants: 0, plantsNeedingCare: 0, careStreak: 0 },
    };

    mockFetch
      .mockRejectedValueOnce(new Error('Failed to load'))
      .mockResolvedValueOnce(mockApiResponse(mockData));

    const { user } = render(<CareDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Try again');
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Care Dashboard')).toBeInTheDocument();
    });
  });

  it('displays care reminders and notifications', async () => {
    const mockData = {
      overduePlants: [],
      dueTodayPlants: [],
      upcomingPlants: [],
      recentActivities: [],
      statistics: { totalPlants: 5, plantsNeedingCare: 0, careStreak: 3 },
      reminders: [
        {
          id: 1,
          type: 'fertilizer',
          message: 'Remember to fertilize your succulents',
          dueDate: new Date('2024-01-15'),
        },
      ],
    };

    mockFetch.mockResolvedValueOnce(mockApiResponse(mockData));

    render(<CareDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Reminders')).toBeInTheDocument();
    });

    expect(screen.getByText('Remember to fertilize your succulents')).toBeInTheDocument();
  });

  it('handles pull-to-refresh functionality', async () => {
    const mockData = {
      overduePlants: [],
      dueTodayPlants: [],
      upcomingPlants: [],
      recentActivities: [],
      statistics: { totalPlants: 1, plantsNeedingCare: 0, careStreak: 1 },
    };

    mockFetch.mockResolvedValue(mockApiResponse(mockData));

    render(<CareDashboard />);

    // Simulate pull-to-refresh gesture
    const dashboard = screen.getByTestId('care-dashboard');
    fireEvent.touchStart(dashboard, {
      touches: [{ clientY: 0 }],
    });
    fireEvent.touchMove(dashboard, {
      touches: [{ clientY: 100 }],
    });
    fireEvent.touchEnd(dashboard);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });
});