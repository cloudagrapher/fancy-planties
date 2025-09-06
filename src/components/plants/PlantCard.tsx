'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { EnhancedPlantInstance } from '@/lib/types/plant-instance-types';
import { plantInstanceHelpers } from '@/lib/types/plant-instance-types';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface PlantCardProps {
  plant: EnhancedPlantInstance;
  size?: 'small' | 'medium' | 'large';
  showCareStatus?: boolean;
  showLocation?: boolean;
  showLastCare?: boolean;
  onSelect?: (plant: EnhancedPlantInstance) => void;
  onCareAction?: (plant: EnhancedPlantInstance, action: 'fertilize' | 'repot') => void;
  onSwipeLeft?: (plant: EnhancedPlantInstance) => void;
  onSwipeRight?: (plant: EnhancedPlantInstance) => void;
  isSelected?: boolean;
  isSelectionMode?: boolean;
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
  onSwipeLeft,
  onSwipeRight,
  isSelected = false,
  isSelectionMode = false,
  className = '',
}: PlantCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const { triggerHaptic } = useHapticFeedback();

  // Size configurations
  const sizeConfig = {
    small: {
      container: 'w-32 h-40',
      image: 'h-20',
      text: 'text-xs',
      title: 'text-sm',
    },
    medium: {
      container: 'w-40 h-48',
      image: 'h-24',
      text: 'text-xs',
      title: 'text-sm',
    },
    large: {
      container: 'w-48 h-56',
      image: 'h-32',
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

    const { careStatus, daysUntilFertilizerDue } = plant;
    const statusColors = plantInstanceHelpers.getCareStatusColor(careStatus);
    const urgencyColor = plantInstanceHelpers.getCareUrgencyColor(plant.careUrgency);

    return (
      <div className="flex items-center justify-between mb-1">
        <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors}`}>
          <div className={`w-2 h-2 rounded-full mr-1 ${urgencyColor}`} />
          {careStatus === 'overdue' && 'Overdue'}
          {careStatus === 'due_today' && 'Due Today'}
          {careStatus === 'due_soon' && 'Due Soon'}
          {careStatus === 'healthy' && 'Healthy'}
          {careStatus === 'unknown' && 'No Schedule'}
        </div>
        
        {daysUntilFertilizerDue !== null && (
          <span className={`${config.text} text-gray-600`}>
            {formatDays(daysUntilFertilizerDue)}
          </span>
        )}
      </div>
    );
  };

  // Get quick actions
  const getQuickActions = () => {
    if (!onCareAction || plant.careStatus === 'healthy') return null;

    return (
      <div className="flex space-x-1 mt-2">
        {(plant.careStatus === 'overdue' || plant.careStatus === 'due_today' || plant.careStatus === 'due_soon') && (
          <button
            onClick={(e) => handleCareAction('fertilize', e)}
            className="flex-1 px-2 py-1 bg-primary-100 hover:bg-primary-200 text-primary-700 text-xs rounded transition-colors"
            title="Mark as fertilized"
          >
            💧 Feed
          </button>
        )}
        <button
          onClick={(e) => handleCareAction('repot', e)}
          className="flex-1 px-2 py-1 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 text-xs rounded transition-colors"
          title="Log repotting"
        >
          🪴 Repot
        </button>
      </div>
    );
  };

  return (
    <div
      ref={swipeRef}
      className={`
        ${config.container}
        bg-white rounded-xl shadow-soft hover:shadow-dreamy
        border border-gray-100 overflow-hidden
        transition-all duration-200 ease-out
        ${isPressed ? 'scale-95' : 'scale-100'}
        ${isSwipeActive ? 'scale-105 shadow-lg' : ''}
        ${isSelected ? 'ring-2 ring-primary-400 shadow-dreamy' : ''}
        ${onSelect ? 'cursor-pointer' : ''}
        ${className}
        touch-manipulation select-none
      `}
      onClick={handlePress}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
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
      <div className={`${config.image} relative bg-gradient-to-br from-primary-50 to-secondary-50`}>
        {plant.primaryImage && !imageError ? (
          <Image
            src={plant.primaryImage}
            alt={plant.displayName}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            sizes={`(max-width: 768px) ${size === 'small' ? '128px' : size === 'medium' ? '160px' : '192px'}, ${size === 'small' ? '128px' : size === 'medium' ? '160px' : '192px'}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-4xl opacity-30">🌱</div>
          </div>
        )}
        
        {/* Care urgency indicator */}
        {showCareStatus && plant.careUrgency !== 'none' && (
          <div className="absolute top-2 left-2">
            <div className={`w-3 h-3 rounded-full ${plantInstanceHelpers.getCareUrgencyColor(plant.careUrgency)}`} />
          </div>
        )}
      </div>

      {/* Plant Info */}
      <div className="p-3 flex-1 flex flex-col">
        {/* Care Status */}
        {getCareStatusDisplay()}

        {/* Plant Name */}
        <h3 className={`${config.title} font-medium text-gray-900 mb-1 line-clamp-2`}>
          {plant.displayName}
        </h3>

        {/* Plant Species */}
        <p className={`${config.text} text-gray-600 italic mb-1 line-clamp-1`}>
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