import React from 'react';

export function StatTile({ value, label, tone = 'paper' }) {
  const accent = tone === 'accent';
  return (
    <div style={{
      flex: 1,
      borderRadius: 'var(--radius-tile)',
      padding: 16,
      background: accent ? 'var(--lime)' : 'var(--surface)',
      boxShadow: accent ? 'var(--shadow-accent)' : 'var(--shadow-tile)',
      boxSizing: 'border-box',
    }}>
      <div style={{ font: 'var(--type-num-lg)', letterSpacing: 'var(--tracking-num-lg)', color: 'var(--ink)' }}>{value}</div>
      <div style={{ font: 'var(--type-caption)', fontWeight: accent ? 600 : 500, color: accent ? 'var(--lime-on-quiet)' : 'var(--ink-muted)', marginTop: 4 }}>{label}</div>
    </div>
  );
}
