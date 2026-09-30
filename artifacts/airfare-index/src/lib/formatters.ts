export const CHART_COLORS = {
  blue: '#187c75',
  coral: '#d7774f',
  slate: '#64788a',
  amber: '#d97706',
  purple: '#7c3aed',
  tealWash: 'rgba(24, 124, 117, 0.14)',
};

export function inr(value: number, compact = false) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard',
  }).format(value);
}

export function number(value: number) {
  return new Intl.NumberFormat('en-IN').format(value);
}

export function signedPercent(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function signedPoints(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)} pts`;
}

export function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function dateLabel(dateString: string, format: 'short' | 'full' = 'short') {
  const options: Intl.DateTimeFormatOptions =
    format === 'full'
      ? { day: 'numeric', month: 'short', year: 'numeric' }
      : { day: 'numeric', month: 'short' };
  return parseLocalDate(dateString).toLocaleDateString('en-IN', options);
}

export function heatCellColor(value: number, min: number, max: number, isDark: boolean) {
  const intensity = max > min ? (value - min) / (max - min) : 0.5;
  const hue = 174 - intensity * 154;
  const lightness = isDark ? 25 + intensity * 9 : 96 - intensity * 13;
  return `hsl(${hue} 54% ${lightness}%)`;
}

export function csvDownload<T extends Record<string, string | number>>(filename: string, rows: T[]) {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const content = [
    columns.map(quote).join(','),
    ...rows.map((row) => columns.map((key) => quote(row[key])).join(',')),
  ].join('\r\n');
  const blob = new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
