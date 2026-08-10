import React from 'react';

export function MetricRow({ brand, name, meta, value, unit = 'g', accent = false, trailing }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 16px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {brand ? <div style={{ font: 'var(--type-caption)', fontWeight: 600, color: 'var(--ink-muted)' }}>{brand}</div> : null}
        <div style={{ font: 'var(--type-body)', fontWeight: 600, color: 'var(--ink)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        {meta ? <div style={{ font: 'var(--type-caption)', color: 'var(--ink-subtle)', marginTop: 2 }}>{meta}</div> : null}
      </div>
      {value != null ? (
        <span style={{ font: 'var(--type-num-md)', color: accent ? 'var(--lime-ink)' : 'var(--ink)' }}>
          {value}<span style={{ fontSize: 12, color: 'var(--ink-subtle)' }}>{unit}</span>
        </span>
      ) : null}
      {trailing}
    </div>
  );
}
