'use client';

import { useEffect } from 'react';
import { S3ImageService } from '@/lib/services/s3-image-service';

/**
 * Hook to initialize CloudFront signed cookies once per session
 * Call this in your root layout or dashboard layout after authentication
 *
 * The cookies enable direct CloudFront access to user images with path-based isolation
 * Cookies are valid for 7 days and automatically included in CloudFront requests
 *
 * @param isAuthenticated - Whether the user is currently authenticated
 */
export function useCloudFrontCookies(isAuthenticated: boolean) {
  useEffect(() => {
    if (isAuthenticated && S3ImageService.isEnabled()) {
      // Check if cookies are already initialized
      // CloudFront cookies are: CloudFront-Policy, CloudFront-Signature, CloudFront-Key-Pair-Id
      const cookiesInitialized = document.cookie.includes('CloudFront-Key-Pair-Id');

      if (!cookiesInitialized) {
        console.log('[useCloudFrontCookies] Initializing CloudFront signed cookies...');
        S3ImageService.initializeSignedCookies().catch(error => {
          console.error('[useCloudFrontCookies] Failed to initialize cookies:', error);
          // Non-fatal: images will still work if cookies are set later
        });
      } else {
        console.log('[useCloudFrontCookies] CloudFront cookies already initialized');
      }
    }
  }, [isAuthenticated]);
}
