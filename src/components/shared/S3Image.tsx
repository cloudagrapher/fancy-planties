'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { S3ImageService } from '@/lib/services/s3-image-service';

interface S3ImageProps {
  s3Key: string;
  userId: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  fallbackSrc?: string;
}

/**
 * Component to display images from S3 using pre-signed URLs
 * Automatically fetches pre-signed URLs and handles loading states
 */
export default function S3Image({
  s3Key,
  userId,
  alt,
  className = '',
  width,
  height,
  priority = false,
  fallbackSrc = '/placeholder-plant.png',
}: S3ImageProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchImageUrl() {
      try {
        setLoading(true);
        setError(false);

        const response = await S3ImageService.getPresignedDownloadUrl({
          userId,
          s3Key,
        });

        if (mounted) {
          setImageUrl(response.url);
        }
      } catch (err) {
        console.error('Failed to fetch image URL:', err);
        if (mounted) {
          setError(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (s3Key && userId) {
      fetchImageUrl();
    }

    return () => {
      mounted = false;
    };
  }, [s3Key, userId]);

  if (loading) {
    return (
      <div
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{ width, height }}
        aria-label="Loading image"
      />
    );
  }

  if (error || !imageUrl) {
    return (
      <Image
        src={fallbackSrc}
        alt={alt}
        width={width || 200}
        height={height || 200}
        className={className}
      />
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={width || 200}
      height={height || 200}
      className={className}
      priority={priority}
    />
  );
}
