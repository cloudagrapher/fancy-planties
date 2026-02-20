'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { S3ImageService, type ThumbnailSize } from '@/lib/services/s3-image-service';
import { shouldUnoptimizeImage } from '@/lib/image-loader';

/**
 * Shared singleton that tracks CloudFront cookie readiness.
 * All S3Image instances subscribe to a single store instead of each
 * running its own 100ms polling interval.
 */
const cloudfrontCookieStore = (() => {
  let ready = false;
  const listeners = new Set<() => void>();

  function check() {
    if (ready) return;
    if (typeof document !== 'undefined' && document.cookie.includes('CloudFront-Key-Pair-Id')) {
      ready = true;
      listeners.forEach(fn => fn());
    }
  }

  // Start polling only once on the client
  if (typeof window !== 'undefined') {
    check();
    if (!ready) {
      const id = setInterval(() => {
        check();
        if (ready) clearInterval(id);
      }, 200);
      // Give up after 3 seconds — cookies should be set by then
      setTimeout(() => clearInterval(id), 3000);
    }
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getSnapshot() { return ready; },
    getServerSnapshot() { return false; },
  };
})();

interface S3ImageBaseProps {
  s3Key: string;
  alt: string;
  className?: string;
  priority?: boolean;
  fallbackSrc?: string;
  thumbnailSize?: ThumbnailSize | 'original';
  /** Responsive sizes hint for the browser (e.g. "(max-width: 768px) 160px, 200px") */
  sizes?: string;
  /** Use lazy loading (default: true unless priority is set) */
  loading?: 'lazy' | 'eager';
}

interface S3ImageFixedProps extends S3ImageBaseProps {
  /** Use fill mode to fill a relative-positioned parent container */
  fill?: false | undefined;
  width?: number;
  height?: number;
}

interface S3ImageFillProps extends S3ImageBaseProps {
  /** Use fill mode to fill a relative-positioned parent container */
  fill: true;
  width?: never;
  height?: never;
}

type S3ImageProps = S3ImageFixedProps | S3ImageFillProps;

/**
 * Component to display images from CloudFront using signed cookies.
 *
 * Supports two layout modes:
 * - **Fixed** (default): Pass `width` and `height` for explicit sizing.
 * - **Fill**: Pass `fill` to fill a relative-positioned parent (ideal for
 *   aspect-ratio containers like `aspect-[4/3]`). When using fill, also
 *   pass `sizes` for optimal responsive image selection.
 *
 * Thumbnails: Pass `thumbnailSize` to load Lambda-generated WebP thumbnails.
 * Falls back gracefully: thumbnail → original → placeholder.
 */
export default function S3Image(props: S3ImageProps) {
  const {
    s3Key,
    alt,
    className = '',
    priority = false,
    fallbackSrc = '/placeholder-plant.png',
    thumbnailSize = 'original',
    sizes,
    loading,
  } = props;

  const fill = 'fill' in props ? props.fill : false;
  const width = !fill ? (props as S3ImageFixedProps).width : undefined;
  const height = !fill ? (props as S3ImageFixedProps).height : undefined;

  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [originalFailed, setOriginalFailed] = useState(false);

  // Subscribe to the shared cookie readiness store instead of per-component polling
  const cookiesReady = useSyncExternalStore(
    cloudfrontCookieStore.subscribe,
    cloudfrontCookieStore.getSnapshot,
    cloudfrontCookieStore.getServerSnapshot,
  );

  // Reset failure states when cookies become available (allows retry)
  const prevCookiesReady = useRef(false);
  useEffect(() => {
    if (cookiesReady && !prevCookiesReady.current) {
      prevCookiesReady.current = true;
      setThumbnailFailed(false);
      setOriginalFailed(false);
    }
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
    if (fill) {
      return (
        <Image
          src={fallbackSrc}
          alt={alt}
          fill
          className={className}
          sizes={sizes}
        />
      );
    }
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

  const handleError = () => {
    if (!thumbnailFailed && thumbnailSize !== 'original') {
      // Thumbnail failed — retry with original
      setThumbnailFailed(true);
    } else {
      // Original also failed — show placeholder
      setOriginalFailed(true);
    }
  };

  const isUnoptimized = shouldUnoptimizeImage(imageUrl);

  // Fill mode: image fills its relative-positioned parent
  if (fill) {
    return (
      <Image
        src={imageUrl}
        alt={alt}
        fill
        className={className}
        priority={priority}
        loading={priority ? undefined : (loading ?? 'lazy')}
        unoptimized={isUnoptimized}
        onError={handleError}
        sizes={sizes}
      />
    );
  }

  // Fixed mode: explicit width/height
  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={width || 200}
      height={height || 200}
      className={className}
      priority={priority}
      loading={priority ? undefined : (loading ?? 'lazy')}
      unoptimized={isUnoptimized}
      onError={handleError}
    />
  );
}
