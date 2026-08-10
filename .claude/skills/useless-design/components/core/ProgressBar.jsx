import React from 'react';

export function ProgressBar({ percent, tone = 'ink', height = 8 }) {
  const fill = tone === 'accent' ? 'var(--lime)' : 'var(--ink)';
  return (
    <div style={{ height, borderRadius: height / 2, background: 'var(--surface-sunken)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, percent))}%`, borderRadius: height / 2, background: fill }} />
    </div>
  );
}
