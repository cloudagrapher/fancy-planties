import React from 'react';
import { render, screen } from '@testing-library/react';
import FertilizerCalendar from '../FertilizerCalendar';

describe('FertilizerCalendar', () => {
  it('displays month and year header', () => {
    render(<FertilizerCalendar events={[]} />);
    // The SectionHeader contains "MonthName Year - Fertilizer Schedule"
    const now = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const expectedMonth = monthNames[now.getMonth()];
    const expectedYear = now.getFullYear().toString();
    
    expect(screen.getByText(new RegExp(`${expectedMonth}\\s+${expectedYear}`))).toBeInTheDocument();
  });

  it('displays day-of-week headers', () => {
    render(<FertilizerCalendar events={[]} />);
    // Full names shown on sm+ screens
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it('has previous and next month navigation buttons', () => {
    render(<FertilizerCalendar events={[]} />);
    expect(screen.getByLabelText('Previous month')).toBeInTheDocument();
    expect(screen.getByLabelText('Next month')).toBeInTheDocument();
  });
});
