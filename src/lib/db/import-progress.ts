import { db } from './index';
import { eq, and } from 'drizzle-orm';
import type { ImportProgress } from '@/lib/validation/csv-schemas';

// Simple table-like structure using local storage for progress tracking
// This is a temporary solution - in production you'd want a proper database table

class ImportProgressStore {
  private static instance: ImportProgressStore;
  private store = new Map<string, ImportProgress>();

  static getInstance(): ImportProgressStore {
    if (!ImportProgressStore.instance) {
      ImportProgressStore.instance = new ImportProgressStore();
    }
    return ImportProgressStore.instance;
  }

  set(importId: string, progress: ImportProgress): void {
    this.store.set(importId, { ...progress });
    console.log(`Storing progress for import ${importId}:`, progress.status, progress.progress);
  }

  get(importId: string): ImportProgress | null {
    const progress = this.store.get(importId);
    console.log(`Retrieved progress for import ${importId}:`, progress?.status || 'not found');
    return progress || null;
  }

  delete(importId: string): void {
    this.store.delete(importId);
    console.log(`Deleted progress for import ${importId}`);
  }

  getAllForUser(userId: number): ImportProgress[] {
    return Array.from(this.store.values()).filter(p => p.userId === userId);
  }

  cleanup(olderThanMs: number): void {
    const cutoff = new Date(Date.now() - olderThanMs);
    for (const [importId, progress] of this.store.entries()) {
      if (progress.endTime && progress.endTime < cutoff) {
        this.delete(importId);
      }
    }
  }
}

export const importProgressStore = ImportProgressStore.getInstance();

// Auto-cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    importProgressStore.cleanup(2 * 60 * 60 * 1000); // 2 hours
  }, 10 * 60 * 1000); // 10 minutes
}