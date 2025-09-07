'use client';

import { RefreshCw } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  isVisible: boolean;
  isRefreshing: boolean;
  progress: number;
  style?: React.CSSProperties;
}

/**
 * Pull-to-refresh indicator component
 * Shows visual feedback during pull-to-refresh gesture
 */
export function PullToRefreshIndicator({
  isVisible,
  isRefreshing,
  progress,
  style = {},
}: PullToRefreshIndicatorProps) {
  if (!isVisible && !isRefreshing) {
    return null;
  }

  const isReady = progress >= 1;

  return (
    <div 
      className="flex justify-center py-4"
      style={style}
    >
      <div className="flex flex-col items-center gap-2">
        {/* Refresh Icon */}
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center transition-colors
          ${isReady 
            ? 'bg-primary-500 text-white' 
            : 'bg-gray-200 text-gray-500'
          }
        `}>
          <RefreshCw 
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </div>

        {/* Progress Text */}
        <div className="text-center">
          <p className={`text-sm font-medium transition-colors ${
            isReady ? 'text-primary-600' : 'text-gray-500'
          }`}>
            {isRefreshing 
              ? 'Refreshing...' 
              : isReady 
                ? 'Release to refresh' 
                : 'Pull to refresh'
            }
          </p>
          
          {/* Progress Bar */}
          <div className="w-16 h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
            <div 
              className={`h-full transition-all duration-200 ${
                isReady ? 'bg-primary-500' : 'bg-gray-400'
              }`}
              style={{ 
                width: `${Math.min(progress * 100, 100)}%`,
                transition: isRefreshing ? 'none' : 'width 0.2s ease-out'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}