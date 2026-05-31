'use client';

import { useState, type ImgHTMLAttributes } from 'react';

interface GameImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Element to show while loading or on error (emoji, icon, gradient, etc.). */
  fallback: React.ReactNode;
  /** CSS class for the fallback wrapper when the image isn't available. */
  fallbackClassName?: string;
}

/**
 * Renders an <img> for game assets. If the image hasn't loaded yet or fails
 * (file doesn't exist, slow network, etc.), shows `fallback` instead.
 *
 * Usage:
 * ```tsx
 * <GameImage
 *   src="/images/cards/esquive.webp"
 *   alt="Esquive"
 *   fallback={<span className="text-lg">💨</span>}
 * />
 * ```
 */
export function GameImage({
  src,
  alt,
  fallback,
  fallbackClassName,
  className,
  ...imgProps
}: GameImageProps) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');

  // If the image was already served (e.g. SSR), assume loaded immediately.
  // We let the browser fire onLoad/onError to correct this.
  return (
    <>
      {/* Image — always mounted; visibility toggled */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setState('loaded')}
        onError={() => setState('error')}
        className={
          state === 'loaded'
            ? className ?? ''
            : 'hidden'
        }
        {...imgProps}
      />

      {/* Fallback — shown while loading or on error */}
      {state !== 'loaded' && (
        <div className={fallbackClassName ?? 'flex items-center justify-center'}>
          {fallback}
        </div>
      )}
    </>
  );
}
