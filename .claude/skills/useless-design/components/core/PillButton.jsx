import React from 'react';

export function PillButton({ label, variant = 'primary', leading, trailing, block = false, onClick }) {
  const map = {
    primary: { background: 'var(--ink)', color: '#FFFFFF', boxShadow: 'var(--shadow-cta)', border: 'none' },
    accent: { background: 'var(--lime)', color: 'var(--lime-on)', boxShadow: 'var(--shadow-accent)', border: 'none' },
    secondary: { background: 'var(--surface)', color: 'var(--ink)', boxShadow: 'none', border: '1px solid rgba(16,16,18,.12)' },
    glass: { background: 'var(--glass-fill-strong)', color: 'var(--ink)', boxShadow: 'var(--shadow-glass-sm)', border: '.5px solid var(--glass-stroke)', backdropFilter: 'var(--glass-blur)' },
  };

  return (
    <button
      onClick={onClick}
      style={{
        height: 54,
        padding: '0 24px',
        borderRadius: 'var(--radius-pill)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: block ? '100%' : 'auto',
        cursor: 'pointer',
        font: 'var(--type-heading)',
        fontWeight: 600,
        ...map[variant],
      }}
    >
      {leading}
      {label}
      {trailing}
    </button>
  );
}
