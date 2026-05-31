export default function Spin({ size = 14, color = '#6b7280' }) {
  return (
    <span style={{ display: 'inline-block', width: size, height: size, border: `2px solid ${color}30`, borderTop: `2px solid ${color}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
  );
}
