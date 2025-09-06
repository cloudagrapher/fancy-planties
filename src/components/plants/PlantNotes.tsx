'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';

interface PlantNotesProps {
  plantId: number;
  initialNotes: string;
  onNotesUpdate: () => void;
}

export default function PlantNotes({ plantId, initialNotes, onNotesUpdate }: PlantNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Update notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      const response = await fetch(`/api/plant-instances/${plantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: newNotes }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update notes');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setIsEditing(false);
      setHasChanges(false);
      onNotesUpdate();
    },
  });

  // Handle notes change
  const handleNotesChange = (value: string) => {
    setNotes(value);
    setHasChanges(value !== initialNotes);
  };

  // Save notes
  const handleSave = () => {
    if (hasChanges) {
      updateNotesMutation.mutate(notes);
    } else {
      setIsEditing(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setNotes(initialNotes);
    setIsEditing(false);
    setHasChanges(false);
  };

  // Auto-save on blur if there are changes
  const handleBlur = () => {
    if (hasChanges && !updateNotesMutation.isPending) {
      updateNotesMutation.mutate(notes);
    }
  };

  // Update local state when initial notes change
  useEffect(() => {
    if (!isEditing) {
      setNotes(initialNotes);
      setHasChanges(false);
    }
  }, [initialNotes, isEditing]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Plant Notes & Observations</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 text-sm text-primary-600 hover:text-primary-700 border border-primary-300 hover:border-primary-400 rounded-md transition-colors"
          >
            {notes ? 'Edit' : 'Add Notes'}
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            onBlur={handleBlur}
            placeholder="Add your observations, care notes, or any other information about this plant..."
            className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            autoFocus
          />
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {updateNotesMutation.isPending && (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              )}
              {updateNotesMutation.isError && (
                <span className="text-red-600">Failed to save notes</span>
              )}
              {!updateNotesMutation.isPending && !updateNotesMutation.isError && hasChanges && (
                <span>Unsaved changes</span>
              )}
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleCancel}
                disabled={updateNotesMutation.isPending}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-700 border border-gray-300 hover:border-gray-400 rounded-md transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateNotesMutation.isPending || !hasChanges}
                className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {notes ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{notes}</p>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-sm">No notes yet</p>
              <p className="text-xs mt-1">Click "Add Notes" to record observations about this plant</p>
            </div>
          )}
          
          {/* Quick note templates */}
          {!notes && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Quick Templates:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  'New growth spotted today',
                  'Leaves looking droopy - may need water',
                  'Repotted with fresh soil',
                  'Moved to brighter location',
                  'Noticed pest activity - treated with neem oil',
                  'Flowering has started',
                ].map((template) => (
                  <button
                    key={template}
                    onClick={() => {
                      setNotes(template);
                      setIsEditing(true);
                      setHasChanges(true);
                    }}
                    className="text-left p-2 text-sm text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-md transition-colors"
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes history (future enhancement) */}
      {notes && !isEditing && (
        <div className="border-t border-gray-200 pt-4">
          <div className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
}