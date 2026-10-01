import { useMemo, useState } from 'react';
import { useGetAirfareLeadTime } from '@workspace/api-client-react';
import type { LeadTimeFare } from '@workspace/api-client-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, CircleHelp, FileSpreadsheet, Info, Sliders, Zap } from 'lucide-react';
import { CHART_COLORS, csvDownload, inr } from '@/lib/formatters';
import { ChartSkeleton, EmptyChart, ExportButton, QueryError } from '@/components/common';

export default function LeadTimePage() {
  const leadTimeQuery = useGetAirfareLeadTime();
  const leadTimes = (leadTimeQuery.data ?? []) as LeadTimeFare[];

  const [selectedHorizon, setSelectedHorizon] = useState<number>(30);

  const leadExport = useMemo(
    () =>
      leadTimes.map((row: LeadTimeFare) => ({
        lead_days: row.leadDays,
        window: row.label,
        average_payable_fare_inr: row.averageFareInr,
        base_fare_inr: row.baseFareInr,
        taxes_and_fees_inr: row.taxesAndFeesInr,
        index_value: row.indexValue,
      })),
    [leadTimes],
  );

  const activePoint = useMemo(
    () => leadTimes.find((p) => p.leadDays === selectedHorizon) ?? leadTimes[3] ?? null,
    [leadTimes, selectedHorizon],
  );

  const baselineFare = useMemo(
    () => leadTimes.find((p) => p.leadDays === 30)?.averageFareInr ?? 6617,
    [leadTimes],
  );

  return (
    <div className="space-y-6">
      {/* Page Title & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-primary font-mono">
            <Activity size={15} /> Section 05 · Booking Elasticity
          </div>
          <h2 className="text-2xl font-black tracking-tight mt-1 font-heading uppercase text-foreground">
            Advance Purchase Sensitivity (Lead-Time Curve)
          </h2>
          <p className="text-sm text-muted-foreground font-mono">
            Price trajectory as travel date approaches (T+45 down to T+1), decomposing base carrier tariffs from mandatory statutory fees.
          </p>
        </div>
        {!leadTimeQuery.isLoading && leadExport.length > 0 && (
          <button
            onClick={() => csvDownload('airindex-advance-purchase-fares.csv', leadExport)}
            className="nike-pill-btn bg-foreground text-background hover:bg-foreground/90 font-bold"
          >
            <FileSpreadsheet size={15} /> Export Lead-Time Series (CSV)
          </button>
        )}
      </div>

      {/* Pricing Unit Problem & ABW Matrix Rationale */}
      <div className="p-5 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-primary font-heading uppercase">
            <Zap size={16} /> Standardized Pricing Unit (P_r,t) Econometric Holding Matrix
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded bg-primary text-primary-foreground font-mono font-black">
            P_r,t = ∑ β_k · F_r,t,k (∑ β_k = 1.00)
          </span>
        </div>
        <p className="text-xs text-muted-foreground font-mono leading-relaxed">
          <strong className="text-foreground">Why Airfare Cannot Be Scraped as a Single Point Quote:</strong> An airfare is an advance-purchase yield curve, not a static price. Scraping 3 days out on Monday and 14 days out on Thursday introduces artificial volatility. By defining <code className="text-primary font-bold">P_r,t</code> across a fixed 5-horizon basket with constant empirical weights (<code className="text-foreground">β_k</code>), our index isolates true inflation from yield discrimination and cushions the index against flight cancellation stock-outs.
        </p>
      </div>

      {/* Metric Tiles for each window (Nike Pill Style) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {leadTimes.map((point) => {
          const betaWeight =
            point.leadDays === 1 ? '10%' : point.leadDays === 7 ? '20%' : point.leadDays === 15 ? '35%' : point.leadDays === 30 ? '25%' : '10%';
          const roleDesc =
            point.leadDays === 1 ? 'Stock-out capped' : point.leadDays === 7 ? 'Short business' : point.leadDays === 15 ? 'Modal peak volume' : point.leadDays === 30 ? 'Baseline disc.' : 'Apex leisure';
          const isSelected = selectedHorizon === point.leadDays;

          return (
            <div
              key={point.leadDays}
              onClick={() => setSelectedHorizon(point.leadDays)}
              className={`p-4 rounded-xl border bg-card cursor-pointer transition-all nike-card space-y-2 ${
                isSelected ? 'border-primary ring-1 ring-primary shadow-md' : 'border-border hover:border-border/80'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="uppercase font-bold text-muted-foreground">{point.label} Window</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-black">
                  β = {betaWeight}
                </span>
              </div>
              <div className="font-display font-black text-2xl text-foreground mt-0.5">{inr(point.averageFareInr)}</div>
              <div className="text-xs text-muted-foreground font-mono">
                Index: <span className="font-bold text-primary">{point.indexValue.toFixed(1)} pts</span>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground border-t border-border pt-1.5 flex items-center justify-between">
                <span>Base: {inr(point.baseFareInr)}</span>
                <span className="text-primary font-bold">{roleDesc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Active Horizon Inspector Card */}
      {activePoint && (
        <div className="p-4 rounded-xl border border-border bg-muted/30 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-muted-foreground uppercase font-bold">SELECTED HORIZON:</span>
            <span className="text-base font-black text-foreground">{activePoint.label} (T+{activePoint.leadDays})</span>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block">Multiplier vs Baseline</span>
              <span className="font-black text-primary text-sm">
                {(activePoint.averageFareInr / baselineFare).toFixed(2)}x
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block">Statutory Taxes</span>
              <span className="font-black text-foreground text-sm">{inr(activePoint.taxesAndFeesInr)}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block">Pure Base Fare</span>
              <span className="font-black text-emerald-400 text-sm">{inr(activePoint.baseFareInr)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Chart Panel */}
      <section className="panel chart-panel">
        <div className="panel-header chart-header">
          <div>
            <div className="section-kicker font-mono text-primary font-bold">ELASTICITY CURVE</div>
            <h3 className="font-heading font-black text-lg uppercase text-foreground">Payable Fare vs. Carrier Base Tariff Escalation</h3>
            <p className="panel-subtitle font-mono text-xs">
              Demonstrating dynamic inventory pricing: statutory taxes remain invariant while base tariffs surge close to departure.
            </p>
          </div>
          {!leadTimeQuery.isLoading && leadExport.length > 0 && (
            <ExportButton
              label="Export advance-purchase fares as CSV"
              onClick={() => csvDownload('airindex-advance-purchase-fares.csv', leadExport)}
            />
          )}
        </div>

        <div className="lead-callout mb-3 font-mono text-xs">
          <span className="lead-callout-mark">
            <CircleHelp size={15} />
          </span>
          <p>T+30 serves as the reference booking baseline (Index 100.0); T+1 reflects last-minute emergency travel pricing.</p>
        </div>

        <div className="h-[340px] w-full mt-2">
          {leadTimeQuery.isLoading ? (
            <ChartSkeleton />
          ) : leadTimeQuery.isError && !leadTimeQuery.data ? (
            <QueryError retry={() => void leadTimeQuery.refetch()} compact />
          ) : leadTimes.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={leadTimes} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 5" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="transparent"
                />
                <YAxis
                  tickFormatter={(val: number) => `₹${Math.round(val / 1000)}K`}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="transparent"
                  domain={['dataMin - 500', 'dataMax + 1000']}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as LeadTimeFare;
                    return (
                      <div className="p-3 rounded-lg border border-border bg-card shadow-lg font-mono text-xs space-y-1">
                        <div className="font-bold text-foreground">{d.label} Window (T+{d.leadDays})</div>
                        <div className="text-primary font-black">Payable: {inr(d.averageFareInr)}</div>
                        <div className="text-muted-foreground">Base Tariff: {inr(d.baseFareInr)}</div>
                        <div className="text-muted-foreground">Mandatory Taxes: {inr(d.taxesAndFeesInr)}</div>
                        <div className="text-foreground pt-1 border-t border-border">Index: {d.indexValue.toFixed(1)} pts</div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  x="T+30"
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 3"
                  label={{
                    value: 'T+30 Reference',
                    position: 'insideTopLeft',
                    fontSize: 10,
                    fill: 'hsl(var(--muted-foreground))',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="averageFareInr"
                  name="Total Payable Fare"
                  stroke="#FF6B4A"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#FF6B4A' }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey="baseFareInr"
                  name="Pure Carrier Base Fare"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ r: 5, fill: 'hsl(var(--primary))' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No lead-time fare data available." />
          )}
        </div>

        <div className="flex items-center justify-center gap-8 pt-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="h-2 w-4 rounded-full bg-[#FF6B4A]" />
            <span className="text-foreground font-bold">Total Payable Fare</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-4 rounded-full bg-primary" />
            <span className="text-foreground font-bold">Pure Carrier Base Fare (Excl. Statutory Taxes)</span>
          </div>
        </div>
      </section>

      {/* Fee Structure Table */}
      <section className="panel">
        <div className="p-4 border-b border-border">
          <h3 className="font-heading font-black text-base uppercase text-foreground">
            Advance-Purchase Fee Decomposition Matrix
          </h3>
          <p className="text-xs text-muted-foreground font-mono">
            Component breakdown between base tariffs, user fees, and index numbers.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="route-table">
            <thead>
              <tr className="font-mono text-xs">
                <th>WINDOW</th>
                <th>DEPARTURE LEAD</th>
                <th className="align-right">TOTAL PAYABLE FARE</th>
                <th className="align-right">CARRIER BASE FARE</th>
                <th className="align-right">MANDATORY TAXES & UDF</th>
                <th className="align-right">INDEX VALUE</th>
              </tr>
            </thead>
            <tbody>
              {leadTimes.map((row) => (
                <tr
                  key={row.leadDays}
                  onClick={() => setSelectedHorizon(row.leadDays)}
                  className={`cursor-pointer transition-colors ${
                    selectedHorizon === row.leadDays ? 'bg-primary/10' : 'hover:bg-muted/40'
                  }`}
                >
                  <td className="font-heading font-black text-foreground">{row.label}</td>
                  <td className="font-mono text-xs text-muted-foreground">{row.leadDays} days before flight</td>
                  <td className="align-right font-mono font-bold text-foreground">{inr(row.averageFareInr)}</td>
                  <td className="align-right font-mono text-primary font-bold">{inr(row.baseFareInr)}</td>
                  <td className="align-right font-mono text-muted-foreground">{inr(row.taxesAndFeesInr)}</td>
                  <td className="align-right font-mono font-black text-foreground">{row.indexValue.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
