'use client';

import { useState } from 'react';
import Image from 'next/image';
import S3Image from '@/components/shared/S3Image';
import type { EnhancedPlantInstance } from '@/lib/types/plant-instance-types';
import { plantInstanceHelpers } from '@/lib/types/plant-instance-types';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { shouldUnoptimizeImage } from '@/lib/image-loader';

interface PlantCardProps {
  plant: EnhancedPlantInstance;
  size?: 'small' | 'medium' | 'large';
  showCareStatus?: boolean;
  showLocation?: boolean;
  showLastCare?: boolean;
  onSelect?: (plant: EnhancedPlantInstance) => void;
  onCareAction?: (plant: EnhancedPlantInstance, action: 'fertilize' | 'repot') => void;
  onEdit?: (plant: EnhancedPlantInstance) => void;
  onSwipeLeft?: (plant: EnhancedPlantInstance) => void;
  onSwipeRight?: (plant: EnhancedPlantInstance) => void;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  isLoading?: boolean;
  className?: string;
}

export default function PlantCard({
  plant,
  size = 'medium',
  showCareStatus = true,
  showLocation = true,
  showLastCare = false,
  onSelect,
  onCareAction,
  onEdit,
  onSwipeLeft,
  onSwipeRight,
  isSelected = false,
  isSelectionMode = false,
  isLoading = false,
  className = '',
}: PlantCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const { triggerHaptic } = useHapticFeedback();

  // Size configurations with aspect-ratio-based image sizing
  const sizeConfig = {
    small: {
      container: 'w-full max-w-[140px]',
      image: 'aspect-[4/3]',
      text: 'text-xs',
      title: 'text-sm',
    },
    medium: {
      container: 'w-full max-w-[160px]',
      image: 'aspect-[4/3]',
      text: 'text-xs',
      title: 'text-sm',
    },
    large: {
      container: 'w-full max-w-[200px]',
      image: 'aspect-[4/3]',
      text: 'text-sm',
      title: 'text-base',
    },
  };

  const config = sizeConfig[size];

  // Handle swipe gestures
  const swipeRef = useSwipeGestures({
    onSwipeLeft: () => {
      if (onSwipeLeft) {
        triggerHaptic('light');
        setIsSwipeActive(true);
        setTimeout(() => setIsSwipeActive(false), 200);
        onSwipeLeft(plant);
      }
    },
    onSwipeRight: () => {
      if (onSwipeRight) {
        triggerHaptic('light');
        setIsSwipeActive(true);
        setTimeout(() => setIsSwipeActive(false), 200);
        onSwipeRight(plant);
      }
    },
    threshold: 60,
  });

  // Handle card press
  const handlePress = () => {
    triggerHaptic('selection');
    
    if (isSelectionMode) {
      // In selection mode, toggle selection
      if (onSelect) {
        onSelect(plant);
      }
    } else {
      // Normal mode, open plant detail
      if (onSelect) {
        onSelect(plant);
      }
    }
  };

  // Handle care action
  const handleCareAction = (action: 'fertilize' | 'repot', event: React.MouseEvent) => {
    event.stopPropagation();
    triggerHaptic('medium');
    if (onCareAction) {
      onCareAction(plant, action);
    }
  };

  // Handle edit action
  const handleEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    triggerHaptic('medium');
    if (onEdit) {
      onEdit(plant);
    }
  };

  // Format days for display
  const formatDays = (days: number | null): string => {
    if (days === null) return '';
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    if (days === -1) return '1 day ago';
    if (days > 0) return `${days} days`;
    return `${Math.abs(days)} days ago`;
  };

  // Get care status display
  const getCareStatusDisplay = () => {
    if (!showCareStatus) return null;

    const { careStatus, daysUntilFertilizerDue, careUrgency } = plant;
    const urgencyColor = plantInstanceHelpers.getCareUrgencyColor(careUrgency);

    // Determine status text based on care urgency and days until due
    let statusText = 'Healthy';
    if (careUrgency === 'critical' || (daysUntilFertilizerDue !== null && daysUntilFertilizerDue < 0)) {
      statusText = 'Overdue';
    } else if (careStatus === 'due_today') {
      statusText = 'Due Today';
    } else if (careStatus === 'due_soon') {
      statusText = 'Due Soon';
    } else if (careStatus === 'unknown') {
      statusText = 'No Schedule';
    }

    return (
      <div className="flex-between mb-2">
        <div className={`plant-card-status ${
          statusText === 'Overdue' ? 'plant-card-status--overdue' :
          statusText === 'Due Today' || statusText === 'Due Soon' ? 'plant-card-status--needs-care' :
          'plant-card-status--healthy'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-1 ${urgencyColor}`} />
          {statusText}
        </div>
        
        {daysUntilFertilizerDue !== null && (
          <span className={`${config.text} text-neutral-600`}>
            {formatDays(daysUntilFertilizerDue)}
          </span>
        )}
      </div>
    );
  };

  // Get quick actions
  const getQuickActions = () => {
    if (!onCareAction && !onEdit) return null;

    return (
      <div className="flex space-x-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {onCareAction && (
          <button
            onClick={(e) => handleCareAction('fertilize', e)}
            className="btn btn--sm btn--outline"
            title="Quick care"
            aria-label={`Quick care for ${plant.displayName}`}
          >
            <span aria-hidden="true">💧</span> Care
          </button>
        )}
        {onEdit && (
          <button
            onClick={handleEdit}
            className="btn btn--sm btn--secondary"
            title="Edit plant"
            aria-label={`Edit ${plant.displayName}`}
          >
            <span aria-hidden="true">✏️</span> Edit
          </button>
        )}
      </div>
    );
  };

  // Show loading state if specified
  if (isLoading) {
    return (
      <div
        className={`plant-card ${config.container} animate-pulse`}
        role="status"
        aria-label="Loading plant card"
      >
        <div className={`${config.image} bg-gray-200 rounded-t-lg`} />
        <div className="plant-card-content">
          <div className="h-4 bg-gray-200 rounded mb-2" />
          <div className="h-3 bg-gray-200 rounded mb-1" />
          <div className="h-3 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={swipeRef}
      role="button"
      tabIndex={0}
      className={`
        plant-card ${config.container} group
        ${isPressed ? 'scale-95' : 'scale-100'}
        ${isSwipeActive ? 'scale-105 shadow-lg' : ''}
        ${isSelected ? 'ring-2 ring-primary-400 shadow-dreamy' : ''}
        ${onSelect ? 'cursor-pointer' : ''}
        ${plant.isActive === false ? 'opacity-60' : ''}
        ${className}
        bg-mint-50 hover:bg-mint-100
      `}
      onClick={handlePress}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handlePress();
        }
      }}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      aria-label={`Plant card for ${plant.displayName}`}
    >
      {/* Selection indicator */}
      {isSelectionMode && (
        <div className="absolute top-2 right-2 z-10">
          <div className={`
            w-5 h-5 rounded-full border-2 flex items-center justify-center
            ${isSelected 
              ? 'bg-primary-500 border-primary-500' 
              : 'bg-white border-gray-300'
            }
          `}>
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Plant Image */}
      <div className={`plant-card-image ${config.image} relative bg-gradient-to-br from-primary-50 to-secondary-50`}>
        {plant.primaryImage && !imageError ? (
          plant.primaryImage.startsWith('data:') ? (
            <Image
              src={plant.primaryImage}
              alt={plant.displayName}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
              unoptimized
              loading="lazy"
            />
          ) : plant.s3ImageKeys && plant.s3ImageKeys.length > 0 ? (
            <S3Image
              s3Key={plant.s3ImageKeys[0]}
              alt={plant.displayName}
              width={size === 'small' ? 128 : size === 'medium' ? 160 : 192}
              height={size === 'small' ? 128 : size === 'medium' ? 160 : 192}
              className="object-cover"
              thumbnailSize="small"
            />
          ) : (
            <Image
              src={plant.primaryImage}
              alt={plant.displayName}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
              unoptimized={shouldUnoptimizeImage(plant.primaryImage)}
              loading="lazy"
              sizes={`(max-width: 768px) ${size === 'small' ? '128px' : size === 'medium' ? '160px' : '192px'}, ${size === 'small' ? '128px' : size === 'medium' ? '160px' : '192px'}`}
            />
          )
        ) : (
          <div className="w-full h-full flex-center">
            <div className="text-4xl opacity-30">🌱</div>
          </div>
        )}
        
        {/* Care urgency indicator */}
        {showCareStatus && plant.careUrgency !== 'none' && (
          <div className="absolute top-2 left-2">
            <div 
              className={`w-3 h-3 rounded-full ${plantInstanceHelpers.getCareUrgencyColor(plant.careUrgency)}`}
              role="status"
              aria-label={`Care urgency: ${plant.careUrgency}`}
              title={`Care urgency: ${plant.careUrgency}`}
            />
          </div>
        )}
      </div>

      {/* Plant Info */}
      <div className="plant-card-content">
        {/* Care Status */}
        {getCareStatusDisplay()}

        {/* Plant Name */}
        <h3 className={`plant-card-title ${config.title}`}>
          {plant.displayName}
        </h3>

        {/* Plant Species */}
        <p className={`plant-card-subtitle ${config.text} italic`}>
          {plant.plant.genus} {plant.plant.species}
        </p>

        {/* Location */}
        {showLocation && plant.location && (
          <p className={`${config.text} text-gray-500 mb-1 line-clamp-1`}>
            📍 {plant.location}
          </p>
        )}

        {/* Last Care */}
        {showLastCare && plant.daysSinceLastFertilized !== null && (
          <p className={`${config.text} text-gray-500 mb-1`}>
            Last fed: {formatDays(-plant.daysSinceLastFertilized)}
          </p>
        )}

        {/* Quick Actions */}
        {getQuickActions()}
      </div>
    </div>
  );
}