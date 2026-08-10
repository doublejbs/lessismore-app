import React from 'react';

export function Chip({ label, selected = false, size = 'md', dotColor, onClick }) {
  const sm = size === 'sm';
  const style = {
    height: sm ? 28 : 34,
    padding: sm ? '0 12px' : '0 15px',
    borderRadius: sm ? 'var(--radius-chip-sm)' : 'var(--radius-chip)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    boxSizing: 'border-box',
    border: selected ? '.5px solid var(--ink)' : '.5px solid rgba(16,16,18,.06)',
    background: selected ? 'var(--ink)' : 'rgba(255,255,255,.8)',
    font: sm ? 'var(--type-caption)' : 'var(--type-body-sm)',
    fontWeight: selected ? 600 : 500,
    color: selected ? '#FFFFFF' : 'var(--ink-secondary)',
  };

  return (
    <span style={style} onClick={onClick} role="button" aria-pressed={selected}>
      {dotColor ? <span style={{ width: 8, height: 8, borderRadius: 4, background: dotColor }} /> : null}
      {label}
    </span>
  );
}
