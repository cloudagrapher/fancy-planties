'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { imageOptimization } from '@/lib/utils/performance';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width = 400,
  height = 300,
  className = '',
  priority = false,
  quality = 80,
  placeholder = 'empty',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [optimizedSrc, setOptimizedSrc] = useState<string>(src);
  const imgRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(priority);

  // Lazy loading with Intersection Observer
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = imageOptimization.createLazyLoadObserver((entry) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.unobserve(entry.target);
      }
    });

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [priority]);

  // Optimize base64 images
  useEffect(() => {
    if (src.startsWith('data:image/') && !priority) {
      imageOptimization.compressBase64Image(src, quality / 100)
        .then(setOptimizedSrc)
        .catch(() => setOptimizedSrc(src));
    } else {
      setOptimizedSrc(src);
    }
  }, [src, quality, priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Loading placeholder */}
      {!isLoaded && !hasError && (
        <div className="image-placeholder--loading overlay">
          <div className="spinner" />
        </div>
      )}

      {/* Error placeholder */}
      {hasError && (
        <div className="image-placeholder--error overlay">
          <div className="image-placeholder-text">Failed to load image</div>
        </div>
      )}

      {/* Actual image */}
      {isInView && !hasError && (
        <Image
          src={optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          quality={quality}
          placeholder={placeholder}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          sizes={`(max-width: 768px) ${width}px, (max-width: 1200px) ${Math.floor(width * 1.5)}px, ${width * 2}px`}
        />
      )}
    </div>
  );
}

interface LazyImageGalleryProps {
  images: string[];
  alt: string;
  className?: string;
  onImageClick?: (index: number) => void;
}

export function LazyImageGallery({
  images,
  alt,
  className = '',
  onImageClick,
}: LazyImageGalleryProps) {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0])); // Load first image immediately

  const handleImageInView = useCallback((index: number) => {
    setLoadedImages(prev => new Set([...prev, index]));
  }, []);

  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      {images.map((image, index) => (
        <LazyGalleryImage
          key={index}
          src={image}
          alt={`${alt} ${index + 1}`}
          index={index}
          shouldLoad={loadedImages.has(index)}
          onInView={() => handleImageInView(index)}
          onClick={() => onImageClick?.(index)}
        />
      ))}
    </div>
  );
}

interface LazyGalleryImageProps {
  src: string;
  alt: string;
  index: number;
  shouldLoad: boolean;
  onInView: () => void;
  onClick: () => void;
}

function LazyGalleryImage({
  src,
  alt,
  index,
  shouldLoad,
  onInView,
  onClick,
}: LazyGalleryImageProps) {
  const imgRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const onInViewRef = useRef(onInView);
  onInViewRef.current = onInView;

  useEffect(() => {
    if (!imgRef.current || shouldLoad) return;

    const observer = imageOptimization.createLazyLoadObserver(() => {
      setIsInView(true);
      onInViewRef.current();
    });

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div
      ref={imgRef}
      className="aspect-square cursor-pointer hover:opacity-80 transition-opacity"
      onClick={onClick}
    >
      {(shouldLoad || isInView) ? (
        <OptimizedImage
          src={src}
          alt={alt}
          width={200}
          height={200}
          className="w-full h-full object-cover rounded-lg"
          quality={70}
        />
      ) : (
        <div className="image-placeholder--loading w-full h-full rounded-lg">
          <div className="image-placeholder-text text-xs">Loading...</div>
        </div>
      )}
    </div>
  );
}