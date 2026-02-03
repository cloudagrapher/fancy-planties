'use client';

import Image from 'next/image';
import { S3ImageService } from '@/lib/services/s3-image-service';
import { shouldUnoptimizeImage } from '@/lib/image-loader';

interface S3ImageProps {
  s3Key: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  fallbackSrc?: string;
}

/**
 * Component to display images from CloudFront using signed cookies
 * Uses Next.js Image with direct CloudFront access via custom domain (cdn.fancy-planties.cloudagrapher.com)
 * Parent domain cookies (.fancy-planties.cloudagrapher.com) enable access in both dev and prod
 *
 * Migration note: Removed userId prop as it's no longer needed with signed cookies
 * CloudFront cookies are path-based and automatically restrict access to user's images
 */
export default function S3Image({
  s3Key,
  alt,
  className = '',
  width,
  height,
  priority = false,
  fallbackSrc = '/placeholder-plant.png',
}: S3ImageProps) {
  // Convert S3 key to CloudFront URL
  const imageUrl = s3Key && S3ImageService.isEnabled()
    ? S3ImageService.s3KeyToCloudFrontUrl(s3Key)
    : '';

  if (!imageUrl) {
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

  // Use Next.js Image with CloudFront (custom domain enables direct access)
  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={width || 200}
      height={height || 200}
      className={className}
      priority={priority}
      unoptimized={shouldUnoptimizeImage(imageUrl)}
      onError={(e) => {
        e.currentTarget.src = fallbackSrc;
      }}
    />
  );
}
