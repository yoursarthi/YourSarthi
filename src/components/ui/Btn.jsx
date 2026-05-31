const variants = {
  primary: { background: '#1a237e', color: '#fff', border: 'none' },
  ghost:   { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' },
  red:     { background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' },
  green:   { background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' },
  blue:    { background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' },
  yellow:  { background: '#fef9c3', color: '#713f12', border: '1px solid #fde68a' },
};

export default function Btn({ variant = 'ghost', sm, full, disabled, onClick, children, style = {} }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    padding: sm ? '5px 11px' : '8px 16px', borderRadius: 8,
    fontSize: sm ? 12 : 14, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1, width: full ? '100%' : undefined,
    transition: 'opacity 0.15s',
    ...variants[variant],
    ...style,
  };
  return <button style={base} disabled={disabled} onClick={onClick}>{children}</button>;
}
