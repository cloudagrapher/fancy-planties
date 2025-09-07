'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface SearchHistoryEntry {
  id: string;
  query: string;
  filters: any;
  resultCount: number;
  searchTime: number;
  timestamp: Date;
}

interface SearchHistoryProps {
  onSearchSelect: (query: string) => void;
  limit?: number;
  showClearAll?: boolean;
}

export default function SearchHistory({
  onSearchSelect,
  limit = 10,
  showClearAll = true,
}: SearchHistoryProps) {
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const queryClient = useQueryClient();

  // Fetch search history
  const { data: history, isLoading } = useQuery({
    queryKey: ['search-history', limit],
    queryFn: async () => {
      const response = await fetch(`/api/search/history?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch search history');
      const data = await response.json();
      return data.data.history as SearchHistoryEntry[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Clear history mutation
  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/search/history', {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to clear search history');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-history'] });
      setShowConfirmClear(false);
    },
  });

  // Handle search selection
  const handleSearchSelect = (query: string) => {
    onSearchSelect(query);
  };

  // Handle clear history
  const handleClearHistory = () => {
    clearHistoryMutation.mutate();
  };

  // Format timestamp
  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Recent Searches</h3>
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 h-10 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-6">
        <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-gray-500">No search history yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Your recent searches will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Recent Searches</h3>
        {showClearAll && history.length > 0 && (
          <button
            onClick={() => setShowConfirmClear(true)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-1">
        {history.map((entry) => (
          <button
            key={entry.id}
            onClick={() => handleSearchSelect(entry.query)}
            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {entry.query}
                  </span>
                </div>
                
                <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                  <span>{entry.resultCount} results</span>
                  <span>{entry.searchTime}ms</span>
                  <span>{formatTimestamp(entry.timestamp)}</span>
                </div>
              </div>
              
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* Clear Confirmation Dialog */}
      {showConfirmClear && (
        <div className="modal-overlay">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Clear Search History
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This will permanently delete all your search history. This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClearHistory}
                disabled={clearHistoryMutation.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {clearHistoryMutation.isPending ? 'Clearing...' : 'Clear History'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}