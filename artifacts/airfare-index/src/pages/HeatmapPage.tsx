import { useMemo, useState } from 'react';
import { useGetAirfareLeadTime, useGetAirfareRoutes } from '@workspace/api-client-react';
import type { AirfareRoute, LeadTimeFare } from '@workspace/api-client-react';
import {
  FileSpreadsheet,
  Info,
  LayoutGrid,
  Sparkles,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { csvDownload, heatCellColor, inr } from '@/lib/formatters';
import { EmptyChart, ExportButton, QueryError, SkeletonBlock } from '@/components/common';

const METRO_ROUTES = ['DEL-BOM', 'DEL-BLR', 'BOM-BLR', 'DEL-CCU', 'DEL-HYD', 'BOM-MAA'];
const REGIONAL_ROUTES = ['BLR-HYD', 'CCU-BLR', 'BOM-HYD', 'DEL-PNQ'];

export default function HeatmapPage() {
  const routesQuery = useGetAirfareRoutes();
  const leadTimeQuery = useGetAirfareLeadTime();

  const [categoryFilter, setCategoryFilter] = useState<'all' | 'metro' | 'regional'>('all');
  const [activeCell, setActiveCell] = useState<{
    route: string;
    cityPair: string;
    window: string;
    fare: number;
    leadDays: number;
  } | null>(null);

  const routes = (routesQuery.data ?? []) as AirfareRoute[];
  const leadTimes = (leadTimeQuery.data ?? []) as LeadTimeFare[];

  const isDark = document.documentElement.classList.contains('dark');

  const filteredRoutes = useMemo(() => {
    if (categoryFilter === 'metro') {
      return routes.filter((r) => METRO_ROUTES.includes(r.route));
    }
    if (categoryFilter === 'regional') {
      return routes.filter((r) => REGIONAL_ROUTES.includes(r.route));
    }
    return routes;
  }, [categoryFilter, routes]);

  const heatmapRows = useMemo(() => {
    const baselineFare = leadTimes.find((item) => item.leadDays === 30)?.averageFareInr ?? 6_900;
    return filteredRoutes.map((route) => ({
      route,
      fares: leadTimes.map((leadTime) => ({
        ...leadTime,
        fare: Math.round((route.averageFareInr * leadTime.averageFareInr) / baselineFare),
      })),
    }));
  }, [filteredRoutes, leadTimes]);

  const heatmapRange = useMemo(() => {
    const values = heatmapRows.flatMap((row) => row.fares.map((item) => item.fare));
    return {
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0,
    };
  }, [heatmapRows]);

  const heatmapExport = useMemo(
    () =>
      heatmapRows.flatMap((row) =>
        row.fares.map((item) => ({
          route: row.route.route,
          city_pair: row.route.cityPair,
          booking_window: item.label,
          lead_days: item.leadDays,
          illustrative_fare_inr: item.fare,
        })),
      ),
    [heatmapRows],
  );

  return (
    <div className="space-y-6">
      {/* Page Title & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-primary font-mono">
            <LayoutGrid size={15} /> Section 04 · Fare Surface
          </div>
          <h2 className="text-2xl font-black tracking-tight mt-1 font-heading uppercase text-foreground">
            Route × Booking Window Heatmap
          </h2>
          <p className="text-sm text-muted-foreground font-mono">
            Two-dimensional fare surface displaying price variation across 12 domestic corridors and 5 advance-purchase intervals.
          </p>
        </div>
        {!routesQuery.isLoading && !leadTimeQuery.isLoading && heatmapExport.length > 0 && (
          <button
            onClick={() => csvDownload('airindex-route-booking-window-heatmap.csv', heatmapExport)}
            className="nike-pill-btn bg-foreground text-background hover:bg-foreground/90 font-bold"
          >
            <FileSpreadsheet size={15} /> Export Heatmap Matrix (CSV)
          </button>
        )}
      </div>

      {/* Nike Athletic Telemetry Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase font-bold">
            <span>MAX OBSERVED SURGE</span>
            <span className="text-rose-400 font-black">T+1 WINDOW</span>
          </div>
          <div className="font-display font-black text-2xl text-foreground">₹10,882</div>
          <div className="text-[11px] font-mono text-muted-foreground">DEL–BOM Emergency Peak</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase font-bold">
            <span>APEX ADVANCE DISCOUNT</span>
            <span className="text-emerald-400 font-black">T+45 APEX</span>
          </div>
          <div className="font-display font-black text-2xl text-foreground">₹3,764</div>
          <div className="text-[11px] font-mono text-emerald-400">BLR–HYD Early Bird Baseline</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase font-bold">
            <span>SURGE ELASTICITY</span>
            <span className="text-primary font-black">2.14x SPREAD</span>
          </div>
          <div className="font-display font-black text-2xl text-foreground">Δ ₹7,118</div>
          <div className="text-[11px] font-mono text-muted-foreground">Peak Volatility Band</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase font-bold">
            <span>DECAY GRADIENT</span>
            <span className="text-primary font-black">MONOTONIC</span>
          </div>
          <div className="font-display font-black text-2xl text-foreground">-42.3%</div>
          <div className="text-[11px] font-mono text-muted-foreground">T+1 ➔ T+45 Booking Curve</div>
        </div>
      </div>

      {/* Main Heatmap Panel */}
      <section className="panel heatmap-panel">
        <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/60 border border-border text-xs font-mono">
            {(
              [
                { id: 'all', label: `ALL CORRIDORS (${routes.length})` },
                { id: 'metro', label: 'METRO TRUNK (6)' },
                { id: 'regional', label: 'REGIONAL (4)' },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1 rounded font-bold transition-all ${
                  categoryFilter === cat.id
                    ? 'bg-foreground text-background shadow-xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Info size={14} className="text-primary" />
            <span>Hover or click cell to inspect corridor delta vs T+30 SPU anchor</span>
          </div>
        </div>

        {/* Active Cell Telemetry HUD */}
        {activeCell && (
          <div className="p-3 mx-4 mt-3 rounded-lg border border-primary/40 bg-primary/5 flex items-center justify-between text-xs font-mono animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground font-black text-[10px]">
                CELL INSPECT
              </span>
              <strong className="text-foreground">{activeCell.route} ({activeCell.cityPair})</strong>
              <span className="text-muted-foreground">Horizon: <strong>{activeCell.window} (T+{activeCell.leadDays})</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">Simulated Payable:</span>
              <span className="text-primary text-base font-black">{inr(activeCell.fare)}</span>
            </div>
          </div>
        )}

        {routesQuery.isLoading || leadTimeQuery.isLoading ? (
          <div className="heatmap-loading p-4">
            <SkeletonBlock className="h-9 w-full mb-2" />
            {[0, 1, 2, 3, 4].map((item) => (
              <SkeletonBlock key={item} className="h-10 w-full mb-2" />
            ))}
          </div>
        ) : routesQuery.isError || leadTimeQuery.isError ? (
          <QueryError retry={() => { void routesQuery.refetch(); void leadTimeQuery.refetch(); }} />
        ) : heatmapRows.length > 0 && leadTimes.length > 0 ? (
          <div className="heatmap-table-wrap">
            <table className="heatmap-table">
              <thead>
                <tr>
                  <th scope="col" className="font-mono">CORRIDOR / CITY PAIR</th>
                  {leadTimes.map((leadTime) => (
                    <th scope="col" key={leadTime.leadDays} className="font-mono">
                      {leadTime.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapRows.map((row) => (
                  <tr key={row.route.route}>
                    <th scope="row">
                      <span className="heatmap-route font-heading font-black">{row.route.route}</span>
                      <span className="heatmap-city font-mono text-[10px]">{row.route.cityPair}</span>
                    </th>
                    {row.fares.map((item) => (
                      <td key={`${row.route.route}-${item.leadDays}`}>
                        <button
                          type="button"
                          onMouseEnter={() =>
                            setActiveCell({
                              route: row.route.route,
                              cityPair: row.route.cityPair,
                              window: item.label,
                              fare: item.fare,
                              leadDays: item.leadDays,
                            })
                          }
                          onClick={() =>
                            setActiveCell({
                              route: row.route.route,
                              cityPair: row.route.cityPair,
                              window: item.label,
                              fare: item.fare,
                              leadDays: item.leadDays,
                            })
                          }
                          className="heat-cell w-full transition-transform hover:scale-105 hover:shadow-xs focus:outline-hidden"
                          style={{
                            backgroundColor: heatCellColor(
                              item.fare,
                              heatmapRange.min,
                              heatmapRange.max,
                              isDark,
                            ),
                            color: isDark ? '#f9f5f0' : '#23352f',
                          }}
                          title={`${row.route.cityPair}, ${item.label}: ${inr(item.fare)}`}
                        >
                          {inr(item.fare)}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyChart message="No route and booking-window observations are available." />
        )}
        <div className="heatmap-footer font-mono text-[11px]">
          <span>Payable fares in INR including statutory airport fees and fuel surcharges.</span>
          <span className="heatmap-scale">
            <span>Lower fare</span>
            <i />
            <span>Higher fare</span>
          </span>
        </div>
      </section>
    </div>
  );
}
