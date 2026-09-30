import { useMemo } from 'react';
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
import { Activity, CircleHelp, FileSpreadsheet, Info } from 'lucide-react';
import { CHART_COLORS, csvDownload, inr } from '@/lib/formatters';
import { ChartSkeleton, EmptyChart, ExportButton, QueryError } from '@/components/common';

export default function LeadTimePage() {
  const leadTimeQuery = useGetAirfareLeadTime();
  const leadTimes = (leadTimeQuery.data ?? []) as LeadTimeFare[];

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

  return (
    <div className="space-y-6">
      {/* Page Title & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-primary">
            <Activity size={15} /> Section 05 · Booking Elasticity
          </div>
          <h2 className="text-2xl font-bold tracking-tight mt-1">Advance Purchase Sensitivity (Lead-Time Curve)</h2>
          <p className="text-sm text-muted-foreground">
            Price trajectory as travel date approaches (T+45 down to T+1), decomposing base carrier fares from mandatory statutory fees.
          </p>
        </div>
        {!leadTimeQuery.isLoading && leadExport.length > 0 && (
          <button
            onClick={() => csvDownload('airindex-advance-purchase-fares.csv', leadExport)}
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
          >
            <FileSpreadsheet size={15} /> Export Lead-Time Series (CSV)
          </button>
        )}
      </div>

      {/* Metric Tiles for each window */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {leadTimes.map((point) => (
          <div key={point.leadDays} className="metric-card p-3">
            <div className="text-xs uppercase font-semibold text-muted-foreground">{point.label} Window</div>
            <div className="text-xl font-bold mono mt-1">{inr(point.averageFareInr)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Index: <span className="font-bold text-primary">{point.indexValue.toFixed(1)} pts</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 border-t pt-1">
              Base: {inr(point.baseFareInr)} · Tax: {inr(point.taxesAndFeesInr)}
            </div>
          </div>
        ))}
      </div>

      {/* Chart Panel */}
      <section className="panel chart-panel">
        <div className="panel-header chart-header">
          <div>
            <div className="section-kicker">ELASTICITY CURVE</div>
            <h3>Payable Fare vs. Carrier Base Tariff Escalation</h3>
            <p className="panel-subtitle">
              Demonstrating dynamic inventory pricing: statutory taxes remain invariant while base tariffs surge close to departure
            </p>
          </div>
          {!leadTimeQuery.isLoading && leadExport.length > 0 && (
            <ExportButton
              label="Export advance-purchase fares as CSV"
              onClick={() => csvDownload('airindex-advance-purchase-fares.csv', leadExport)}
            />
          )}
        </div>

        <div className="lead-callout mb-3">
          <span className="lead-callout-mark">
            <CircleHelp size={15} />
          </span>
          <p>T+30 serves as the reference booking baseline (Index 100.0); T+1 reflects last-minute emergency travel pricing.</p>
        </div>

        <div className="h-[320px] w-full mt-2">
          {leadTimeQuery.isLoading ? (
            <ChartSkeleton />
          ) : leadTimeQuery.isError && !leadTimeQuery.data ? (
            <QueryError retry={() => void leadTimeQuery.refetch()} compact />
          ) : leadTimes.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={leadTimes} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 5" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: 'var(--chart-label)' }}
                  stroke="transparent"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  width={52}
                  tickFormatter={(value: number) => inr(value, true)}
                  tick={{ fontSize: 11, fill: 'var(--chart-label)' }}
                  stroke="transparent"
                  tickLine={false}
                  axisLine={false}
                />
                <ReferenceLine
                  y={leadTimes.find((item) => item.leadDays === 30)?.averageFareInr}
                  stroke="var(--chart-reference)"
                  strokeDasharray="4 4"
                  label={{ value: 'T+30 Reference', position: 'top', fill: 'var(--chart-label)', fontSize: 10 }}
                />
                <Tooltip
                  isAnimationActive={false}
                  cursor={{ stroke: 'var(--chart-reference)', strokeDasharray: '3 3' }}
                  formatter={(value, name) => [
                    inr(Number(value)),
                    name === 'averageFareInr'
                      ? 'Total Payable Fare'
                      : 'Pure Carrier Base Fare',
                  ]}
                  labelFormatter={(label) => `Advance purchase · ${label}`}
                  contentStyle={{
                    borderRadius: 9,
                    border: '1px solid var(--chart-tooltip-border)',
                    background: 'var(--chart-tooltip)',
                    color: 'var(--foreground)',
                    fontSize: 12,
                    boxShadow: '0 8px 24px rgba(30,40,50,.12)',
                  }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10, fontSize: 12 }} />
                <Line
                  type="monotone"
                  name="Total Payable Fare"
                  dataKey="averageFareInr"
                  stroke={CHART_COLORS.coral}
                  strokeWidth={2.8}
                  dot={{ r: 4, fill: CHART_COLORS.coral }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  name="Pure Carrier Base Fare"
                  dataKey="baseFareInr"
                  stroke={CHART_COLORS.purple}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3.5, fill: CHART_COLORS.purple }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No advance-purchase observations available." />
          )}
        </div>
      </section>

      {/* Tabular Breakdown */}
      <section className="panel route-panel">
        <div className="panel-header routes-header">
          <div>
            <div className="section-kicker">FEE STRUCTURE TABLE</div>
            <h3>Advance-Purchase Fee Decomposition</h3>
            <p className="panel-subtitle">Component breakdown between base tariffs, user fees, and index numbers</p>
          </div>
        </div>

        <div className="route-table-wrap">
          <table className="route-table">
            <thead>
              <tr>
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
                <tr key={row.leadDays} className="route-row">
                  <td className="font-bold">{row.label}</td>
                  <td>{row.leadDays} days before flight</td>
                  <td className="align-right mono font-bold text-coral">{inr(row.averageFareInr)}</td>
                  <td className="align-right mono">{inr(row.baseFareInr)}</td>
                  <td className="align-right mono text-muted-foreground">{inr(row.taxesAndFeesInr)}</td>
                  <td className="align-right mono font-bold text-primary">{row.indexValue.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
