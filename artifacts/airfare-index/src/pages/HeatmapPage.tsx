import { useMemo, useState } from 'react';
import { useGetAirfareLeadTime, useGetAirfareRoutes } from '@workspace/api-client-react';
import type { AirfareRoute, LeadTimeFare } from '@workspace/api-client-react';
import { FileSpreadsheet, Info, LayoutGrid } from 'lucide-react';
import { csvDownload, heatCellColor, inr } from '@/lib/formatters';
import { EmptyChart, ExportButton, QueryError, SkeletonBlock } from '@/components/common';

export default function HeatmapPage() {
  const routesQuery = useGetAirfareRoutes();
  const leadTimeQuery = useGetAirfareLeadTime();

  const routes = (routesQuery.data ?? []) as AirfareRoute[];
  const leadTimes = (leadTimeQuery.data ?? []) as LeadTimeFare[];

  const isDark = document.documentElement.classList.contains('dark');

  const heatmapRows = useMemo(() => {
    const baselineFare = leadTimes.find((item) => item.leadDays === 30)?.averageFareInr ?? 6_900;
    return routes.map((route) => ({
      route,
      fares: leadTimes.map((leadTime) => ({
        ...leadTime,
        fare: Math.round((route.averageFareInr * leadTime.averageFareInr) / baselineFare),
      })),
    }));
  }, [leadTimes, routes]);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-primary">
            <LayoutGrid size={15} /> Section 04 · Fare Surface
          </div>
          <h2 className="text-2xl font-bold tracking-tight mt-1">Route × Booking Window Heatmap</h2>
          <p className="text-sm text-muted-foreground">
            Two-dimensional fare surface displaying price variation across 12 domestic corridors and 5 advance-purchase intervals.
          </p>
        </div>
        {!routesQuery.isLoading && !leadTimeQuery.isLoading && heatmapExport.length > 0 && (
          <button
            onClick={() => csvDownload('airindex-route-booking-window-heatmap.csv', heatmapExport)}
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
          >
            <FileSpreadsheet size={15} /> Export Heatmap Matrix (CSV)
          </button>
        )}
      </div>

      <section className="panel heatmap-panel">
        <div className="heatmap-note pt-4 px-4">
          <Info size={14} /> Matrix reveals advance-purchase discount decay across regional business vs. leisure corridors.
        </div>
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
                  <th scope="col">CORRIDOR / CITY PAIR</th>
                  {leadTimes.map((leadTime) => (
                    <th scope="col" key={leadTime.leadDays}>
                      {leadTime.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapRows.map((row) => (
                  <tr key={row.route.route}>
                    <th scope="row">
                      <span className="heatmap-route">{row.route.route}</span>
                      <span className="heatmap-city">{row.route.cityPair}</span>
                    </th>
                    {row.fares.map((item) => (
                      <td key={`${row.route.route}-${item.leadDays}`}>
                        <span
                          className="heat-cell"
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
                        </span>
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
        <div className="heatmap-footer">
          <span>Payable fares in INR including statutory airport fees and fuel surcharges</span>
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
