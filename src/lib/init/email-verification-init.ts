import 'server-only';
import { emailVerificationCleanupService } from '@/lib/services/email-verification-cleanup';

let isInitialized = false;

/**
 * Initialize email verification system
 * This should be called once when the application starts
 */
export async function initializeEmailVerification(): Promise<void> {
  if (isInitialized) {
    return;
  }
  
  console.log('[INIT] Initializing email verification system...');
  
  try {
    // Run startup cleanup
    await emailVerificationCleanupService.runStartupCleanup();
    
    // Schedule regular cleanup (if not already scheduled)
    if (process.env.NODE_ENV === 'production') {
      emailVerificationCleanupService.scheduleCleanup();
    } else {
      // In development, run less frequently
      emailVerificationCleanupService.scheduleCleanup(2 * 60 * 60 * 1000); // 2 hours
    }
    
    isInitialized = true;
    console.log('[INIT] Email verification system initialized successfully');
    
  } catch (error) {
    console.error('[INIT] Failed to initialize email verification system:', error);
    // Don't throw - let the app continue running even if cleanup fails
  }
}

/**
 * Check if email verification system is initialized
 */
export function isEmailVerificationInitialized(): boolean {
  return isInitialized;
}