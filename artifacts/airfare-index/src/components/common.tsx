import { ReactNode } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Download,
  Info,
} from 'lucide-react';
import { signedPercent } from '@/lib/formatters';

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} aria-hidden="true" />;
}

export function ChartSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <SkeletonBlock className="h-full w-full" />
    </div>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
      <Info size={24} className="mb-2 opacity-50" />
      <p>{message}</p>
    </div>
  );
}

export function ExportButton({
  onClick,
  label = 'Export chart data as CSV',
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button className="icon-control print-hidden" onClick={onClick} aria-label={label} title={label}>
      <Download size={15} strokeWidth={1.8} />
    </button>
  );
}

export function ChangeText({ value, suffix = 'vs previous period' }: { value: number; suffix?: string }) {
  const rising = value > 0;
  const flat = value === 0;
  return (
    <span className={`change ${flat ? 'change-flat' : rising ? 'change-up' : 'change-down'}`}>
      {rising ? <ArrowUpRight size={14} /> : flat ? <ArrowRight size={13} /> : <ArrowDownRight size={14} />}
      {signedPercent(value)} <span className="change-context">{suffix}</span>
    </span>
  );
}

export function MetricCard({
  label,
  value,
  note,
  change,
  loading,
  icon,
  subValue,
}: {
  label: string;
  value: string;
  note: string;
  change?: number;
  loading: boolean;
  icon: ReactNode;
  subValue?: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <div className="metric-value-wrap">
        {loading ? <SkeletonBlock className="h-8 w-28" /> : <div className="metric-value mono">{value}</div>}
        {subValue && !loading && <span className="fare-breakdown-sub">{subValue}</span>}
      </div>
      <div className="metric-bottom">
        {change !== undefined && !loading && <ChangeText value={change} suffix="" />}
        <span className="metric-note">{note}</span>
      </div>
    </article>
  );
}

export function QueryError({ retry, compact = false }: { retry: () => void; compact?: boolean }) {
  return (
    <div className={`query-error ${compact ? 'query-error-compact' : ''}`}>
      <div className="error-mark">
        <Info size={16} />
      </div>
      <div>
        <p className="error-title">Couldn’t load this series</p>
        <p className="error-copy">The prototype API did not return data. Try again in a moment.</p>
      </div>
      <button className="text-button" onClick={retry}>
        Retry
      </button>
    </div>
  );
}
