import React, { useState, useEffect, useRef } from 'react';
import defaultDishImg from '../assets/default-dish.svg';

export const DEFAULT_DISH_IMAGE = defaultDishImg;

export const getDishImageSrc = (src?: string | null): string => {
  if (typeof src === 'string' && src.trim().length > 0) {
    return src;
  }
  return defaultDishImg;
};

interface DishImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  loading?: 'lazy' | 'eager';
  showSkeleton?: boolean;
}

export const DishImage: React.FC<DishImageProps> = ({
  src,
  alt,
  className = '',
  imgClassName = 'w-full h-full object-cover',
  loading = 'eager',
  showSkeleton = false,
}) => {
  const normalizedSrc = typeof src === 'string' && src.trim().length > 0 ? src.trim() : '';
  const [hasError, setHasError] = useState(false);
  const [loaded, setLoaded] = useState(!normalizedSrc);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const prevSrcRef = useRef(normalizedSrc);

  useEffect(() => {
    if (prevSrcRef.current !== normalizedSrc) {
      prevSrcRef.current = normalizedSrc;
      setHasError(false);
      setLoaded(!normalizedSrc);
    }
  }, [normalizedSrc]);

  const resolvedSrc = !normalizedSrc || hasError ? defaultDishImg : normalizedSrc;

  // Ensure cached or synchronous images mark loaded immediately on mount/remount
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !normalizedSrc) {
      setLoaded(true);
      return;
    }
    if (img.complete) {
      if (img.naturalWidth > 0) {
        setLoaded(true);
      } else if (!hasError) {
        setHasError(true);
        setLoaded(true);
      }
    }
  }, [resolvedSrc, normalizedSrc, hasError]);

  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
      {showSkeleton && !loaded && (
        <div className="absolute inset-0 bg-slate-200/80 animate-pulse" />
      )}
      <img
        ref={imgRef}
        src={resolvedSrc}
        alt={alt}
        loading={loading}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setHasError(true);
          setLoaded(true);
        }}
        className={`${imgClassName} ${
          showSkeleton && !loaded ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </div>
  );
};
