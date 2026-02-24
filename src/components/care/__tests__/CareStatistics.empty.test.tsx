import React from 'react';
import { render, screen } from '@testing-library/react';
import CareStatistics from '../CareStatistics';

describe('CareStatistics empty state', () => {
  it('shows N/A when there are 0 events and 0 streak', () => {
    render(
      <CareStatistics
        statistics={{
          totalActivePlants: 0,
          overdueCount: 0,
          dueTodayCount: 0,
          dueSoonCount: 0,
          careStreakDays: 0,
          totalCareEventsThisWeek: 0,
          averageCareConsistency: 100,
        }}
      />
    );
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByText('No data yet')).toBeInTheDocument();
    // Should NOT show "100%" or "Excellent"
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
    expect(screen.queryByText('Excellent')).not.toBeInTheDocument();
  });

  it('shows percentage when there is real data', () => {
    render(
      <CareStatistics
        statistics={{
          totalActivePlants: 5,
          overdueCount: 0,
          dueTodayCount: 1,
          dueSoonCount: 2,
          careStreakDays: 3,
          totalCareEventsThisWeek: 5,
          averageCareConsistency: 85,
        }}
      />
    );
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();
    expect(screen.queryByText('N/A')).not.toBeInTheDocument();
  });
});
