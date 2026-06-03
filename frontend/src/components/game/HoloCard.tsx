'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

interface HoloCardProps {
  children: React.ReactNode;
  /** Extra class names for the outer wrapper */
  className?: string;
  /** Disable the holographic effect (static card) */
  disabled?: boolean;
  /** Holographic pattern intensity: 0-1, default 1 */
  intensity?: number;
}

/**
 * HoloCard — wraps any content with a 3D holographic card effect.
 *
 * Features:
 * - 3D perspective tilt that follows the mouse cursor
 * - Holographic shine band (sweeping gradient) tied to cursor
 * - Glare overlay (radial gradient spotlight)
 * - Smooth snap-back animation on mouse leave
 *
 * Usage:
 * ```tsx
 * <HoloCard>
 *   <img src={cardImage} alt="card" />
 * </HoloCard>
 * ```
 */
export function HoloCard({
  children,
  className = '',
  disabled = false,
  intensity = 1,
}: HoloCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [vars, setVars] = useState<Vars>(INITIAL_VARS);
  const rafRef = useRef<number | null>(null);
  const isInteracting = useRef(false);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || !cardRef.current) return;
      isInteracting.current = true;

      const rect = cardRef.current.getBoundingClientRect();
      const absX = e.clientX - rect.left;
      const absY = e.clientY - rect.top;
      const pX = clamp((100 / rect.width) * absX);
      const pY = clamp((100 / rect.height) * absY);
      const cX = pX - 50;
      const cY = pY - 50;
      const fromCenter = Math.sqrt(cX * cX + cY * cY) / 50;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setVars({
          '--pointer-x': `${pX}%`,
          '--pointer-y': `${pY}%`,
          '--rotate-x': `${round(-(cX / 3.5))}deg`,
          '--rotate-y': `${round(cY / 3.5)}deg`,
          '--pointer-from-center': `${fromCenter}`,
          '--pointer-from-top': `${pY / 100}`,
          '--pointer-from-left': `${pX / 100}`,
          '--card-opacity': `${intensity}`,
        });
      });
    },
    [disabled, intensity],
  );

  const handlePointerLeave = useCallback(() => {
    isInteracting.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    // Animate back to resting state
    setVars(INITIAL_VARS);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className={`holo-card group ${disabled ? 'holo-card--disabled' : ''} ${className}`}
      style={vars as React.CSSProperties}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="holo-card__rotator">
        {children}

        {/* Shine — holographic band that sweeps with the cursor */}
        <div className="holo-card__shine" />

        {/* Glare — radial spotlight that follows the cursor */}
        <div className="holo-card__glare" />
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

interface Vars {
  '--pointer-x': string;
  '--pointer-y': string;
  '--rotate-x': string;
  '--rotate-y': string;
  '--pointer-from-center': string;
  '--pointer-from-top': string;
  '--pointer-from-left': string;
  '--card-opacity': string;
}

const INITIAL_VARS: Vars = {
  '--pointer-x': '50%',
  '--pointer-y': '50%',
  '--rotate-x': '0deg',
  '--rotate-y': '0deg',
  '--pointer-from-center': '0',
  '--pointer-from-top': '0.5',
  '--pointer-from-left': '0.5',
  '--card-opacity': '1',
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, precision = 3): number {
  return parseFloat(value.toFixed(precision));
}
