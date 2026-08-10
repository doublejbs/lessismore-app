import React from 'react';

export function Card({ children, tone = 'paper', radius = 'card', padding = 16 }) {
  const tones = {
    paper: { background: 'var(--surface)', boxShadow: 'var(--shadow-card)', border: 'none' },
    quiet: { background: 'var(--surface-quiet)', boxShadow: 'none', border: '.5px solid rgba(16,16,18,.05)' },
    glass: { background: 'var(--glass-fill-strong)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '.5px solid var(--glass-stroke)', boxShadow: 'var(--shadow-glass)' },
    accent: { background: 'var(--lime)', boxShadow: 'var(--shadow-accent)', border: 'none' },
    ink: { background: 'var(--ink)', boxShadow: 'var(--shadow-cta)', border: 'none' },
  };

  return (
    <div style={{ borderRadius: `var(--radius-${radius})`, padding, boxSizing: 'border-box', ...tones[tone] }}>
      {children}
    </div>
  );
}
