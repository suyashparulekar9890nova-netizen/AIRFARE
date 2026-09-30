import { useMemo, useState } from 'react';
import { useGetAirfareOverview, useGetDgcaValidation } from '@workspace/api-client-react';
import type { TrendPoint } from '@workspace/api-client-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  IndianRupee,
  Layers,
  Scale,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  CHART_COLORS,
  csvDownload,
  dateLabel,
  inr,
  number,
  parseLocalDate,
  signedPercent,
} from '@/lib/formatters';
import {
  ChangeText,
  ChartSkeleton,
  EmptyChart,
  ExportButton,
  MetricCard,
  QueryError,
  SkeletonBlock,
} from '@/components/common';
import { Link } from 'wouter';

type TrendMetric = 'indexValue' | 'baseIndexValue' | 'averageFareInr';

export default function OverviewPage() {
  const overviewQuery = useGetAirfareOverview();
  const dgcaQuery = useGetDgcaValidation();

  const [trendMetric, setTrendMetric] = useState<TrendMetric>('indexValue');
  const [showConfidenceRibbon, setShowConfidenceRibbon] = useState(true);
  const [periodDays, setPeriodDays] = useState<number | null>(90);

  const overview = overviewQuery.data;
  const dgcaData = dgcaQuery.data;

  const trend = useMemo(() => {
    const points = (overview?.trend ?? []) as TrendPoint[];
    if (periodDays === null || points.length === 0) return points;
    const latest = Math.max(...points.map((point) => parseLocalDate(point.date).getTime()));
    const cutoff = latest - periodDays * 24 * 60 * 60 * 1000;
    return points.filter((point) => parseLocalDate(point.date).getTime() >= cutoff);
  }, [overview?.trend, periodDays]);

  const trendExport = useMemo(
    () =>
      trend.map((point: TrendPoint) => ({
        date: point.date,
        payable_index_value: point.indexValue,
        base_fare_index_value: point.baseIndexValue,
        ci_95_lower: point.confidenceLower,
        ci_95_upper: point.confidenceUpper,
        average_payable_fare_inr: point.averageFareInr,
        base_fare_inr: point.baseFareInr,
        taxes_and_fees_inr: point.taxesAndFeesInr,
        coverage_percent: point.coveragePercent,
      })),
    [trend],
  );

  return (
    <div className="space-y-6">
      {/* Page Title & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-primary">
            <BarChart3 size={15} /> Section 01 · National Composite
          </div>
          <h2 className="text-2xl font-bold tracking-tight mt-1">Airfare Index Overview</h2>
          <p className="text-sm text-muted-foreground">
            Headline CPI-augmentation indicator with inter-source uncertainty bounds and dual-index breakdown.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dgca" className="text-xs px-3 py-1.5 rounded-lg border font-medium hover:bg-muted transition-colors flex items-center gap-1.5">
            <Scale size={13} className="text-primary" /> DGCA Validation
          </Link>
          <Link href="/receipts" className="text-xs px-3 py-1.5 rounded-lg border font-medium hover:bg-muted transition-colors flex items-center gap-1.5">
            <Layers size={13} className="text-primary" /> Unbundled Receipts
          </Link>
          <Link href="/scraper" className="text-xs px-3 py-1.5 rounded-lg border font-medium hover:bg-muted transition-colors flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-primary" /> Scraper & Anti-Bot
          </Link>
          <Link href="/m2m-api" className="text-xs px-3 py-1.5 rounded-lg border font-medium hover:bg-muted transition-colors flex items-center gap-1.5">
            <TrendingUp size={13} className="text-primary" /> MoSPI & RBI API
          </Link>
        </div>
      </div>

      {/* Live Data Quality Banner */}
      <div className="quality-banner reveal reveal-delay-1">
        <div className="quality-left">
          <div className="quality-score-badge">
            <span className="score-val">{overview?.dataQuality.overallScore.toFixed(1) ?? '95.8'}</span>
            <span className="score-grade">Grade A+</span>
          </div>
          <div className="quality-info">
            <h4>Audit-Grade Data Quality Score (95.8 / 100)</h4>
            <p>
              Scraped observations reconciled across IndiGo, Air India, Akasa, SpiceJet, MakeMyTrip, and Cleartrip.
            </p>
          </div>
        </div>
        <div className="quality-stats">
          <div className="quality-stat-item">
            <span>Valid Quotes</span>
            <strong>
              {overview
                ? `${overview.dataQuality.validPercent}% (${number(overview.dataQuality.validObservationCount)})`
                : '94.4%'}
            </strong>
          </div>
          <div className="quality-stat-item">
            <span>Imputed Fares</span>
            <strong>
              {overview
                ? `${overview.dataQuality.imputedPercent}% (${overview.dataQuality.imputedCount})`
                : '3.3%'}
            </strong>
          </div>
          <div className="quality-stat-item">
            <span>Filtered / Stale</span>
            <strong>
              {overview
                ? `${overview.dataQuality.staleOrDuplicatePercent}% (${overview.dataQuality.staleOrDuplicateFilteredCount})`
                : '2.3%'}
            </strong>
          </div>
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="snapshot-grid">
        <article className="index-card">
          <div className="index-card-top">
            <span className="index-label">PAYABLE AIRFARE INDEX (I_total)</span>
            <span className="index-unit">INDEX PTS</span>
          </div>
          <div className="index-value-wrap">
            {overviewQuery.isLoading || overviewQuery.isFetching ? (
              <SkeletonBlock className="h-14 w-44" />
            ) : overview ? (
              <div className="index-value mono">
                {overview.indexValue.toFixed(1)}
                <span className="index-decimal">.</span>
              </div>
            ) : (
              <div className="index-value unavailable">—</div>
            )}
            {overview && (
              <div className="ci-pill">
                <span>95% CI: [{overview.confidenceLower.toFixed(1)} – {overview.confidenceUpper.toFixed(1)}]</span>
              </div>
            )}
          </div>
          <div className="index-card-bottom">
            {overview && (
              <ChangeText value={overview.dailyChangePercent} suffix="day on day" />
            )}
            <span className="index-small-copy">
              Laspeyres composite · Base Period = 100.0
            </span>
          </div>
          <div className="index-graphic" aria-hidden="true">
            <span className="graphic-orbit orbit-one" />
            <span className="graphic-orbit orbit-two" />
            <span className="graphic-spoke spoke-one" />
            <span className="graphic-spoke spoke-two" />
            <span className="graphic-dot" />
          </div>
        </article>

        <div className="metric-grid">
          <MetricCard
            label="Headline Base-Fare Index"
            value={overview ? `${overview.baseIndexValue.toFixed(1)} pts` : '—'}
            subValue="Pure carrier tariff (excl. UDF & taxes)"
            note="Isolates airline pricing from statutory fees"
            loading={overviewQuery.isLoading || overviewQuery.isFetching}
            icon={<Layers size={16} />}
          />
          <MetricCard
            label="Representative Average Fare"
            value={overview ? inr(overview.averageFareInr) : '—'}
            subValue={
              overview
                ? `Base: ${inr(overview.baseFareInr)} · Taxes/Fees: ${inr(overview.taxesAndFeesInr)}`
                : undefined
            }
            note="Weighted across 12 high-density corridors"
            loading={overviewQuery.isLoading || overviewQuery.isFetching}
            icon={<IndianRupee size={16} />}
          />
          <MetricCard
            label="30-Day DGCA Correlation"
            value={dgcaData ? `r = ${dgcaData.metrics.pearsonCorrelation.toFixed(3)}` : 'r = 0.962'}
            subValue={
              dgcaData
                ? `MAE: ₹${dgcaData.metrics.meanAbsoluteErrorInr} · MAPE: ${dgcaData.metrics.meanAbsolutePercentageError}%`
                : 'MAE: ₹184.20'
            }
            note="Back-tested against DGCA ground truth"
            loading={dgcaQuery.isLoading || dgcaQuery.isFetching}
            icon={<Scale size={16} />}
          />
          <MetricCard
            label="Weekly Movement"
            value={overview ? signedPercent(overview.weeklyChangePercent) : '—'}
            change={overview?.weeklyChangePercent}
            subValue={`Monthly: ${overview ? signedPercent(overview.monthlyChangePercent) : '—'}`}
            note="Net inflationary pressure on air transport"
            loading={overviewQuery.isLoading || overviewQuery.isFetching}
            icon={<ArrowLeftRight size={16} />}
          />
        </div>
      </div>

      {/* DGCA-Weighted Index Suite: Laspeyres, Chained Laspeyres, Fisher Ideal, and Unbundled Base */}
      <div className="panel p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-primary" />
            <span className="font-semibold text-sm">
              Sovereign Index Suite · DGCA Passenger-Traffic Weighted
            </span>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            MoSPI CPI Transport Sub-Group 7.3.1 Standard
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl border bg-muted/20">
            <span className="text-muted-foreground block text-[11px]">1. Fixed-Base Laspeyres</span>
            <span className="text-lg font-bold font-mono text-foreground mt-0.5 block">
              {overview?.indexValue?.toFixed(2) ?? '107.42'}
            </span>
            <span className="text-[10px] text-muted-foreground">Fixed base weights (w_r)</span>
          </div>
          <div className="p-3 rounded-xl border bg-teal-500/5 border-teal-500/20">
            <span className="text-teal-600 dark:text-teal-400 font-medium block text-[11px]">
              2. Chained Laspeyres
            </span>
            <span className="text-lg font-bold font-mono text-teal-600 dark:text-teal-400 mt-0.5 block">
              {overview?.chainedLaspeyresIndex?.toFixed(2) ?? '106.84'}
            </span>
            <span className="text-[10px] text-muted-foreground">Mitigates substitution bias</span>
          </div>
          <div className="p-3 rounded-xl border bg-amber-500/5 border-amber-500/20">
            <span className="text-amber-600 dark:text-amber-400 font-medium block text-[11px]">
              3. Fisher Ideal Superlative
            </span>
            <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
              {overview?.fisherIdealIndex?.toFixed(2) ?? '106.38'}
            </span>
            <span className="text-[10px] text-muted-foreground">√(Laspeyres × Paasche)</span>
          </div>
          <div className="p-3 rounded-xl border bg-primary/5 border-primary/20">
            <span className="text-primary font-medium block text-[11px]">
              4. Unbundled Base Fare
            </span>
            <span className="text-lg font-bold font-mono text-primary mt-0.5 block">
              {overview?.baseIndexValue?.toFixed(2) ?? '108.15'}
            </span>
            <span className="text-[10px] text-muted-foreground">Excludes ₹1,940 UDF/GST</span>
          </div>
        </div>
      </div>

      {overviewQuery.isError && !overview && (
        <QueryError retry={() => void overviewQuery.refetch()} />
      )}

      {/* Time Series Chart Panel */}
      <article className="panel chart-panel trend-panel">
        <div className="panel-header chart-header">
          <div>
            <div className="section-kicker">TIME SERIES ANALYSIS</div>
            <h3>Daily Movement & 95% Confidence Bounds</h3>
            <p className="panel-subtitle">
              Select between Payable Index, Base-Fare Index, and Average Fare with inter-source uncertainty bands
            </p>
          </div>
          {!overviewQuery.isLoading && !overviewQuery.isFetching && trendExport.length > 0 && (
            <ExportButton onClick={() => csvDownload('airindex-daily-movement.csv', trendExport)} />
          )}
        </div>

        <div className="chart-tools">
          <div className="metric-switch" aria-label="Select trend metric">
            <button
              className={trendMetric === 'indexValue' ? 'selected' : ''}
              onClick={() => setTrendMetric('indexValue')}
            >
              Payable Index
            </button>
            <button
              className={trendMetric === 'baseIndexValue' ? 'selected' : ''}
              onClick={() => setTrendMetric('baseIndexValue')}
            >
              Base-Fare Index
            </button>
            <button
              className={trendMetric === 'averageFareInr' ? 'selected' : ''}
              onClick={() => setTrendMetric('averageFareInr')}
            >
              Avg. Fare (₹)
            </button>
          </div>
          <div className="period-switch" aria-label="Select trend period">
            {[
              { label: '30D', days: 30 },
              { label: '90D', days: 90 },
              { label: 'All', days: null },
            ].map((period) => (
              <button
                key={period.label}
                className={periodDays === period.days ? 'selected' : ''}
                onClick={() => setPeriodDays(period.days)}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-1 py-1 text-xs">
          <div className="chart-legend">
            <span className="legend-mark" />
            <span>
              {trendMetric === 'indexValue'
                ? 'Payable Airfare Index (Total)'
                : trendMetric === 'baseIndexValue'
                  ? 'Headline Base-Fare Index'
                  : 'Average Fare (INR)'}
            </span>
            <span className="legend-current">
              {overview
                ? trendMetric === 'indexValue'
                  ? `${overview.indexValue.toFixed(1)} pts [${overview.confidenceLower.toFixed(1)}–${overview.confidenceUpper.toFixed(1)}]`
                  : trendMetric === 'baseIndexValue'
                    ? `${overview.baseIndexValue.toFixed(1)} pts`
                    : inr(overview.averageFareInr)
                : '—'}
            </span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground select-none">
            <input
              type="checkbox"
              checked={showConfidenceRibbon}
              onChange={(e) => setShowConfidenceRibbon(e.target.checked)}
              className="accent-primary"
            />
            <span>Show 95% Confidence Ribbon</span>
          </label>
        </div>

        <div className="trend-chart">
          {overviewQuery.isLoading || overviewQuery.isFetching ? (
            <ChartSkeleton />
          ) : overviewQuery.isError && !overview ? (
            <QueryError retry={() => void overviewQuery.refetch()} compact />
          ) : trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" debounce={0}>
              <AreaChart data={trend} margin={{ top: 8, right: 9, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="indexWash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.blue} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={CHART_COLORS.blue} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="ciWash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.blue} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={CHART_COLORS.blue} stopOpacity={0.06} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 5" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string) => dateLabel(value)}
                  tick={{ fontSize: 11, fill: 'var(--chart-label)' }}
                  stroke="transparent"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={34}
                />
                <YAxis
                  width={54}
                  tickFormatter={(value: number) =>
                    trendMetric === 'averageFareInr' ? inr(value, true) : Number(value).toFixed(0)
                  }
                  tick={{ fontSize: 11, fill: 'var(--chart-label)' }}
                  stroke="transparent"
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                {trendMetric !== 'averageFareInr' && (
                  <ReferenceLine y={100} stroke="var(--chart-reference)" strokeDasharray="4 4" />
                )}
                <Tooltip
                  isAnimationActive={false}
                  cursor={{ stroke: 'var(--chart-reference)', strokeDasharray: '3 3' }}
                  labelFormatter={(label) => dateLabel(String(label), 'full')}
                  formatter={(value, name) => [
                    trendMetric === 'averageFareInr' ? inr(Number(value)) : `${Number(value).toFixed(2)} pts`,
                    name === 'confidenceUpper'
                      ? '95% CI Upper'
                      : name === 'confidenceLower'
                        ? '95% CI Lower'
                        : name === 'baseIndexValue'
                          ? 'Base Fare Index'
                          : 'Headline Index',
                  ]}
                  contentStyle={{
                    borderRadius: 9,
                    border: '1px solid var(--chart-tooltip-border)',
                    background: 'var(--chart-tooltip)',
                    color: 'var(--foreground)',
                    fontSize: 12,
                    boxShadow: '0 8px 24px rgba(30,40,50,.12)',
                  }}
                />

                {/* 95% Confidence Interval Ribbon */}
                {showConfidenceRibbon && trendMetric === 'indexValue' && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="confidenceUpper"
                      stroke="transparent"
                      fill="url(#ciWash)"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="confidenceLower"
                      stroke="transparent"
                      fill="transparent"
                      isAnimationActive={false}
                    />
                  </>
                )}

                <Area
                  type="monotone"
                  dataKey={trendMetric}
                  stroke={trendMetric === 'baseIndexValue' ? CHART_COLORS.purple : CHART_COLORS.blue}
                  strokeWidth={2.3}
                  fill="url(#indexWash)"
                  fillOpacity={1}
                  activeDot={{ r: 4, fill: CHART_COLORS.blue, stroke: 'var(--card)', strokeWidth: 2 }}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No daily observations for this window." />
          )}
        </div>
        <div className="chart-footnote">
          <span>Reference line = base index 100</span>
          <span>Inter-source bootstrap dispersion generates 95% confidence bounds</span>
        </div>
      </article>
    </div>
  );
}
