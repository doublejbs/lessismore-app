import React from 'react';

export function SectionLabel({ children, trailing }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 10px' }}>
      <span style={{ font: 'var(--type-micro)', letterSpacing: 'var(--tracking-micro)', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>{children}</span>
      {trailing}
    </div>
  );
}
