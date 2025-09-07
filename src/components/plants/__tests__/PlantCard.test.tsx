import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { render, createMockPlantInstance, createUserEvent } from '@/__tests__/utils/test-helpers';
import PlantCard from '../PlantCard';

describe('PlantCard', () => {
  const mockOnSelect = jest.fn();
  const mockOnEdit = jest.fn();
  const mockOnCareLog = jest.fn();

  const defaultProps = {
    plant: createMockPlantInstance(),
    onSelect: mockOnSelect,
    onEdit: mockOnEdit,
    onCareLog: mockOnCareLog,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders plant information correctly', () => {
    render(<PlantCard {...defaultProps} />);

    expect(screen.getByText('My Monstera')).toBeInTheDocument();
    expect(screen.getByText('Living Room')).toBeInTheDocument();
    expect(screen.getByText('Monstera deliciosa')).toBeInTheDocument();
  });

  it('displays care status indicator', () => {
    const plantWithOverdueCare = createMockPlantInstance({
      careUrgency: 'critical',
      daysUntilFertilizerDue: -5,
    });

    render(<PlantCard {...defaultProps} plant={plantWithOverdueCare} />);

    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('shows primary image when available', () => {
    const plantWithImage = createMockPlantInstance({
      images: ['data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='],
      primaryImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    });

    render(<PlantCard {...defaultProps} plant={plantWithImage} />);

    const image = screen.getByRole('img');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('alt', 'My Monstera');
  });

  it('shows placeholder when no image available', () => {
    render(<PlantCard {...defaultProps} />);

    expect(screen.getByText('🌱')).toBeInTheDocument();
  });

  it('calls onSelect when card is clicked', async () => {
    const user = createUserEvent();
    render(<PlantCard {...defaultProps} />);

    const card = screen.getByRole('button');
    await user.click(card);

    expect(mockOnSelect).toHaveBeenCalledWith(defaultProps.plant);
  });

  it('shows care actions on hover/focus', async () => {
    const user = createUserEvent();
    render(<PlantCard {...defaultProps} />);

    const card = screen.getByRole('button');
    await user.hover(card);

    expect(screen.getByLabelText('Quick care')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit plant')).toBeInTheDocument();
  });

  it('calls onCareLog when care button is clicked', async () => {
    const user = createUserEvent();
    render(<PlantCard {...defaultProps} />);

    const card = screen.getByRole('button');
    await user.hover(card);

    const careButton = screen.getByLabelText('Quick care');
    await user.click(careButton);

    expect(mockOnCareLog).toHaveBeenCalledWith(defaultProps.plant.id, 'fertilizer');
  });

  it('calls onEdit when edit button is clicked', async () => {
    const user = createUserEvent();
    render(<PlantCard {...defaultProps} />);

    const card = screen.getByRole('button');
    await user.hover(card);

    const editButton = screen.getByLabelText('Edit plant');
    await user.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(defaultProps.plant);
  });

  it('displays fertilizer due date when available', () => {
    const plantWithDueDate = createMockPlantInstance({
      fertilizerDue: new Date('2024-01-15'),
      daysUntilFertilizerDue: 3,
    });

    render(<PlantCard {...defaultProps} plant={plantWithDueDate} />);

    expect(screen.getByText('Due in 3 days')).toBeInTheDocument();
  });

  it('handles compact mode correctly', () => {
    render(<PlantCard {...defaultProps} compact />);

    // In compact mode, some information might be hidden
    expect(screen.getByText('My Monstera')).toBeInTheDocument();
  });

  it('applies correct styling for different care urgencies', () => {
    const { rerender } = render(<PlantCard {...defaultProps} />);

    // Test healthy plant
    let card = screen.getByRole('button');
    expect(card).not.toHaveClass('border-red-500');

    // Test overdue plant
    const overduePlant = createMockPlantInstance({
      careUrgency: 'critical',
    });

    rerender(<PlantCard {...defaultProps} plant={overduePlant} />);

    card = screen.getByRole('button');
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('handles keyboard navigation', async () => {
    const user = createUserEvent();
    render(<PlantCard {...defaultProps} />);

    const card = screen.getByRole('button');
    
    // Focus the card
    await user.tab();
    expect(card).toHaveFocus();

    // Press Enter to select
    await user.keyboard('{Enter}');
    expect(mockOnSelect).toHaveBeenCalledWith(defaultProps.plant);
  });

  it('shows loading state when specified', () => {
    render(<PlantCard {...defaultProps} isLoading />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('handles inactive plants correctly', () => {
    const inactivePlant = createMockPlantInstance({
      isActive: false,
    });

    render(<PlantCard {...defaultProps} plant={inactivePlant} />);

    const card = screen.getByRole('button');
    expect(card).toHaveClass('opacity-60');
  });

  it('displays care streak when available', () => {
    const plantWithStreak = createMockPlantInstance({
      careStatus: 'excellent',
    });

    render(<PlantCard {...defaultProps} plant={plantWithStreak} />);

    // Check for care status indicator
    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });
});