'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';

interface NoteEntry {
  id: string;
  content: string;
  timestamp: string;
  isEditing?: boolean;
}

interface PlantNotesProps {
  plantId: number;
  initialNotes: string;
  onNotesUpdate: () => void;
}

export default function PlantNotes({ plantId, initialNotes, onNotesUpdate }: PlantNotesProps) {
  const [noteEntries, setNoteEntries] = useState<NoteEntry[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');

  // Parse existing notes into structured entries
  const parseNotes = (notesText: string): NoteEntry[] => {
    if (!notesText.trim()) return [];
    
    // Try to parse as structured notes first
    try {
      const parsed = JSON.parse(notesText);
      if (Array.isArray(parsed) && parsed.every(entry => entry.id && entry.content && entry.timestamp)) {
        return parsed;
      }
    } catch {
      // If not JSON or invalid structure, treat as legacy single note
    }
    
    // Convert legacy single note to structured format
    return [{
      id: 'legacy-' + Date.now(),
      content: notesText,
      timestamp: new Date().toISOString()
    }];
  };

  // Serialize note entries back to string for storage
  const serializeNotes = (entries: NoteEntry[]): string => {
    if (entries.length === 0) return '';
    return JSON.stringify(entries.map(({ isEditing, ...entry }) => entry));
  };

  // Update notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async (serializedNotes: string) => {
      const response = await fetch(`/api/plant-instances/${plantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: serializedNotes }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update notes');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setIsAddingNote(false);
      setNewNoteContent('');
      onNotesUpdate();
    },
  });

  // Initialize notes from props
  useEffect(() => {
    setNoteEntries(parseNotes(initialNotes));
  }, [initialNotes]);

  // Add a new note
  const addNote = (content: string) => {
    const newEntry: NoteEntry = {
      id: 'note-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedEntries = [newEntry, ...noteEntries];
    setNoteEntries(updatedEntries);
    updateNotesMutation.mutate(serializeNotes(updatedEntries));
  };

  // Handle quick template selection
  const handleTemplateSelect = (template: string) => {
    addNote(template);
  };

  // Handle manual note addition
  const handleAddNote = () => {
    if (newNoteContent.trim()) {
      addNote(newNoteContent);
      setNewNoteContent('');
      setIsAddingNote(false);
    }
  };

  // Edit an existing note
  const startEditingNote = (noteId: string) => {
    setNoteEntries(entries => 
      entries.map(entry => 
        entry.id === noteId ? { ...entry, isEditing: true } : entry
      )
    );
  };

  // Save edited note
  const saveEditedNote = (noteId: string, newContent: string) => {
    if (!newContent.trim()) {
      // If content is empty, remove the note
      deleteNote(noteId);
      return;
    }

    const updatedEntries = noteEntries.map(entry => 
      entry.id === noteId 
        ? { ...entry, content: newContent.trim(), isEditing: false }
        : entry
    );
    
    setNoteEntries(updatedEntries);
    updateNotesMutation.mutate(serializeNotes(updatedEntries));
  };

  // Cancel editing
  const cancelEditingNote = (noteId: string) => {
    setNoteEntries(entries => 
      entries.map(entry => 
        entry.id === noteId ? { ...entry, isEditing: false } : entry
      )
    );
  };

  // Delete a note
  const deleteNote = (noteId: string) => {
    const updatedEntries = noteEntries.filter(entry => entry.id !== noteId);
    setNoteEntries(updatedEntries);
    updateNotesMutation.mutate(serializeNotes(updatedEntries));
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const quickTemplates = [
    'New growth spotted today',
    'Leaves looking droopy - may need water',
    'Repotted with fresh soil',
    'Moved to brighter location',
    'Noticed pest activity - treated with neem oil',
    'Flowering has started',
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Plant Notes & Observations</h3>
        <button
          onClick={() => setIsAddingNote(true)}
          className="px-3 py-1 text-sm text-primary-600 hover:text-primary-700 border border-primary-300 hover:border-primary-400 rounded-md transition-colors"
        >
          Add Notes
        </button>
      </div>

      {/* Quick Templates */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Quick Templates:</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {quickTemplates.map((template) => (
            <button
              key={template}
              onClick={() => handleTemplateSelect(template)}
              disabled={updateNotesMutation.isPending}
              className="text-left p-2 text-sm text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-md transition-colors disabled:opacity-50"
            >
              {template}
            </button>
          ))}
        </div>
      </div>

      {/* Add Note Form */}
      {isAddingNote && (
        <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Add your observations, care notes, or any other information about this plant..."
            className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            autoFocus
          />
          <div className="flex items-center justify-end space-x-2">
            <button
              onClick={() => {
                setIsAddingNote(false);
                setNewNoteContent('');
              }}
              disabled={updateNotesMutation.isPending}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-700 border border-gray-300 hover:border-gray-400 rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNote}
              disabled={updateNotesMutation.isPending || !newNoteContent.trim()}
              className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Note
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="space-y-3">
        {noteEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <p className="text-sm">No notes yet</p>
            <p className="text-xs mt-1">Use the quick templates or "Add Notes" to record observations</p>
          </div>
        ) : (
          noteEntries.map((entry) => (
            <NoteEntryItem
              key={entry.id}
              entry={entry}
              onStartEdit={() => startEditingNote(entry.id)}
              onSave={(content) => saveEditedNote(entry.id, content)}
              onCancel={() => cancelEditingNote(entry.id)}
              onDelete={() => deleteNote(entry.id)}
              formatTimestamp={formatTimestamp}
              isUpdating={updateNotesMutation.isPending}
            />
          ))
        )}
      </div>

      {/* Loading/Error States */}
      {updateNotesMutation.isPending && (
        <div className="text-center text-sm text-gray-500">
          <div className="inline-flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Saving...
          </div>
        </div>
      )}

      {updateNotesMutation.isError && (
        <div className="text-center text-sm text-red-600">
          Failed to save notes. Please try again.
        </div>
      )}
    </div>
  );
}

// Individual Note Entry Component
interface NoteEntryItemProps {
  entry: NoteEntry;
  onStartEdit: () => void;
  onSave: (content: string) => void;
  onCancel: () => void;
  onDelete: () => void;
  formatTimestamp: (timestamp: string) => string;
  isUpdating: boolean;
}

function NoteEntryItem({ 
  entry, 
  onStartEdit, 
  onSave, 
  onCancel, 
  onDelete, 
  formatTimestamp, 
  isUpdating 
}: NoteEntryItemProps) {
  const [editContent, setEditContent] = useState(entry.content);

  useEffect(() => {
    if (entry.isEditing) {
      setEditContent(entry.content);
    }
  }, [entry.isEditing, entry.content]);

  const handleSave = () => {
    onSave(editContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (entry.isEditing) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full h-20 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none text-sm"
          autoFocus
        />
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Press Cmd+Enter to save, Esc to cancel
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onCancel}
              disabled={isUpdating}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-700 border border-gray-300 hover:border-gray-400 rounded transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isUpdating || !editContent.trim()}
              className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors group">
      <div className="flex items-start justify-between mb-2">
        <div className="text-xs text-gray-500 font-medium">
          {formatTimestamp(entry.timestamp)}
        </div>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onStartEdit}
            disabled={isUpdating}
            className="p-1 text-xs text-gray-400 hover:text-primary-600 transition-colors disabled:opacity-50"
            title="Edit note"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            disabled={isUpdating}
            className="p-1 text-xs text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
            title="Delete note"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{entry.content}</p>
    </div>
  );
}