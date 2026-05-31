export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const GC = (grade) => ({
  O: '#065f46', 'A+': '#15803d', A: '#16a34a', 'B+': '#2563eb', B: '#3b82f6',
  'C+': '#d97706', C: '#f59e0b', D: '#ea580c', F: '#dc2626',
}[grade] || '#6b7280');

export const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

export const parseCSV = (text) => {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/["']/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/["']/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
};
