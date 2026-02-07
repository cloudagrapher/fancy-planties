'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { S3ImageService, type ThumbnailSize } from '@/lib/services/s3-image-service';
import { shouldUnoptimizeImage } from '@/lib/image-loader';

interface S3ImageProps {
  s3Key: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  fallbackSrc?: string;
  thumbnailSize?: ThumbnailSize | 'original';
}

/**
 * Component to display images from CloudFront using signed cookies
 * Uses Next.js Image with direct CloudFront access via custom domain (cdn.fancy-planties.cloudagrapher.com)
 * Parent domain cookies (.fancy-planties.cloudagrapher.com) enable access in both dev and prod
 *
 * Migration note: Removed userId prop as it's no longer needed with signed cookies
 * CloudFront cookies are path-based and automatically restrict access to user's images
 *
 * Supports thumbnails: Pass thumbnailSize prop to load optimized Lambda-generated thumbnails
 * Falls back to original image if thumbnail fails to load
 */
export default function S3Image({
  s3Key,
  alt,
  className = '',
  width,
  height,
  fill = false,
  priority = false,
  fallbackSrc = '/placeholder-plant.png',
  thumbnailSize = 'original',
}: S3ImageProps) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [originalFailed, setOriginalFailed] = useState(false);
  const [cookiesReady, setCookiesReady] = useState(false);

  // Monitor CloudFront cookies and reset failure states when cookies become available
  useEffect(() => {
    // Check if CloudFront cookies are present
    const checkCookies = () => {
      const hasCookies = document.cookie.includes('CloudFront-Key-Pair-Id');
      if (hasCookies && !cookiesReady) {
        setCookiesReady(true);
        // Reset failure states to allow retry now that cookies are available
        setThumbnailFailed(false);
        setOriginalFailed(false);
      }
    };

    // Check immediately
    checkCookies();

    // Poll for cookies every 100ms for up to 2 seconds (handles async cookie initialization)
    const intervalId = setInterval(checkCookies, 100);
    const timeoutId = setTimeout(() => clearInterval(intervalId), 2000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [cookiesReady]);

  // Determine which URL to use (thumbnail or original)
  const imageUrl = (() => {
    if (!s3Key || !S3ImageService.isEnabled()) {
      return '';
    }

    // If thumbnail failed, fall back to original
    if (thumbnailFailed || thumbnailSize === 'original') {
      return S3ImageService.s3KeyToCloudFrontUrl(s3Key);
    }

    // Use thumbnail
    return S3ImageService.s3KeyToThumbnailUrl(s3Key, thumbnailSize);
  })();

  // If both thumbnail and original failed, show placeholder
  if (!imageUrl || originalFailed) {
    return (
      <Image
        src={fallbackSrc}
        alt={alt}
        {...(fill ? { fill: true } : { width: width || 200, height: height || 200 })}
        className={className}
      />
    );
  }

  const handleError = () => {
    if (!thumbnailFailed && thumbnailSize !== 'original') {
      // Thumbnail failed — retry with original
      setThumbnailFailed(true);
    } else {
      // Original also failed — show placeholder
      setOriginalFailed(true);
    }
  };

  // Use Next.js Image with CloudFront (custom domain enables direct access)
  return (
    <Image
      src={imageUrl}
      alt={alt}
      {...(fill ? { fill: true } : { width: width || 200, height: height || 200 })}
      className={className}
      priority={priority}
      unoptimized={shouldUnoptimizeImage(imageUrl)}
      onError={handleError}
    />
  );
}
