'use client';

interface HpBarProps {
  current: number;
  max: number;
  animated?: boolean;
}

const HpBarEmpty: React.CSSProperties = {
  width: '0%',
  backgroundColor: '#6b7280',
  transition: 'width 0.5s ease, background-color 0.5s ease',
};

export function HpBar({ current, max, animated = false }: HpBarProps) {
  const percentage = max > 0 ? Math.max(0, (current / max) * 100) : 0;
  const isDead = current <= 0;

  // Color based on HP percentage
  const barColor =
    isDead ? '#6b7280'
    : percentage > 60 ? '#22c55e'
    : percentage > 30 ? '#eab308'
    : '#ef4444';

  const barStyle: React.CSSProperties = {
    width: `${percentage}%`,
    backgroundColor: barColor,
    ...(animated ? { transition: 'width 0.5s ease, background-color 0.5s ease' } : {}),
  };

  return (
    <div className="flex flex-col gap-0.5">
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-700">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={isDead ? HpBarEmpty : barStyle}
        />
        {/* Damage flash overlay */}
        {animated && current > 0 && (
          <div
            className="absolute inset-0 rounded-full bg-red-500/0"
            key={current}
            style={{
              animation: 'none',
              // We use a quick flash via a small delay trick — re-mount triggers
            }}
          />
        )}
      </div>
      <span className="text-[10px] text-gray-400">
        HP: {current}/{max}
      </span>
    </div>
  );
}
