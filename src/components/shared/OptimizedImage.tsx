'use client';

import { useState, useRef, useEffect } from 'react';
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
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Error placeholder */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-400 text-sm">Failed to load image</div>
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

  const handleImageInView = (index: number) => {
    setLoadedImages(prev => new Set([...prev, index]));
  };

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

  useEffect(() => {
    if (!imgRef.current || shouldLoad) return;

    const observer = imageOptimization.createLazyLoadObserver(() => {
      setIsInView(true);
      onInView();
    });

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [shouldLoad, onInView]);

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
        <div className="w-full h-full bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
          <div className="text-gray-400 text-xs">Loading...</div>
        </div>
      )}
    </div>
  );
}