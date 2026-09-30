import { useMemo, useState } from 'react';
import { useGetAirfareRoutes } from '@workspace/api-client-react';
import type { AirfareRoute } from '@workspace/api-client-react';
import {
  AlertTriangle,
  ChevronDown,
  FileSpreadsheet,
  Layers,
  Plane,
  Search,
} from 'lucide-react';
import { csvDownload, inr, signedPercent, signedPoints } from '@/lib/formatters';
import { ChangeText, EmptyChart, ExportButton, QueryError, SkeletonBlock } from '@/components/common';

type RouteSort =
  | 'route'
  | 'weight'
  | 'averageFareInr'
  | 'weeklyChangePercent'
  | 'indexValue'
  | 'contributionPoints'
  | 'dataQualityScore'
  | 'quoteCount';

export default function RoutesPage() {
  const routesQuery = useGetAirfareRoutes();
  const routes = (routesQuery.data ?? []) as AirfareRoute[];

  const [routeSearch, setRouteSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [anomalyOnly, setAnomalyOnly] = useState(false);
  const [sortBy, setSortBy] = useState<RouteSort>('weight');
  const [sortAscending, setSortAscending] = useState(false);

  const directions = useMemo(() => {
    const unique = Array.from(new Set(routes.map((item) => item.cityPair))).sort((a, b) =>
      a.localeCompare(b),
    );
    return unique;
  }, [routes]);

  const visibleRoutes = useMemo(() => {
    const search = routeSearch.trim().toLowerCase();
    const filtered = routes.filter((item) => {
      const searchable = `${item.route} ${item.cityPair}`.toLowerCase();
      const matchesSearch = !search || searchable.includes(search);
      const matchesDirection = directionFilter === 'all' || item.cityPair === directionFilter;
      const matchesAnomaly = !anomalyOnly || item.anomalyStatus !== 'NORMAL';
      return matchesSearch && matchesDirection && matchesAnomaly;
    });
    return filtered.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      const result =
        typeof aValue === 'string'
          ? aValue.localeCompare(String(bValue))
          : Number(aValue) - Number(bValue);
      return sortAscending ? result : -result;
    });
  }, [anomalyOnly, directionFilter, routeSearch, routes, sortAscending, sortBy]);

  const sortRoutes = (key: RouteSort) => {
    if (key === sortBy) setSortAscending((previous) => !previous);
    else {
      setSortBy(key);
      setSortAscending(key === 'route');
    }
  };

  const routeExport = useMemo(
    () =>
      visibleRoutes.map((row) => ({
        route: row.route,
        city_pair: row.cityPair,
        weight_share: row.weight,
        base_period_fare_p0: row.baseFareInr,
        current_payable_fare_pt: row.averageFareInr,
        current_base_fare: row.currentBaseFareInr,
        mandatory_taxes_and_fees: row.mandatoryTaxesInr,
        weekly_change_percent: row.weeklyChangePercent,
        route_index: row.indexValue,
        laspeyres_contribution_pts: row.contributionPoints,
        anomaly_status: row.anomalyStatus,
        robust_z_score: row.robustZScore,
        data_quality_score: row.dataQualityScore,
        quote_count: row.quoteCount,
      })),
    [visibleRoutes],
  );

  return (
    <div className="space-y-6">
      {/* Page Title & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-primary">
            <Layers size={15} /> Section 03 · Laspeyres Basket
          </div>
          <h2 className="text-2xl font-bold tracking-tight mt-1">Corridor Contributions & Anomaly Tags</h2>
          <p className="text-sm text-muted-foreground">
            Auditable route weights (w_r), base period pricing (P_0), and exact point contribution (ΔI_r) to the headline index.
          </p>
        </div>
        {!routesQuery.isLoading && routeExport.length > 0 && (
          <button
            onClick={() => csvDownload('airindex-route-contributions.csv', routeExport)}
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
          >
            <FileSpreadsheet size={15} /> Export Corridor Basket (CSV)
          </button>
        )}
      </div>

      <section className="panel route-panel">
        <div className="filter-row print-hidden pt-4">
          <label className="search-box">
            <Search size={15} />
            <input
              value={routeSearch}
              onChange={(event) => setRouteSearch(event.target.value)}
              placeholder="Search corridor or city pair (e.g. DEL-BOM, Kolkata)"
              aria-label="Search corridor or city pair"
            />
            {routeSearch && (
              <button
                onClick={() => setRouteSearch('')}
                aria-label="Clear search"
                className="clear-search"
              >
                ×
              </button>
            )}
          </label>

          <label className="filter-select-wrap">
            <span className="filter-label">CITY PAIR</span>
            <select
              value={directionFilter}
              onChange={(event) => setDirectionFilter(event.target.value)}
              aria-label="Filter by city pair"
            >
              <option value="all">All corridors ({routes.length})</option>
              {directions.map((direction) => (
                <option key={direction} value={direction}>
                  {direction}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="select-caret" />
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground select-none ml-auto">
            <input
              type="checkbox"
              checked={anomalyOnly}
              onChange={(e) => setAnomalyOnly(e.target.checked)}
              className="accent-primary"
            />
            <span>Anomalies Only (MAD Rule)</span>
          </label>
        </div>

        <div className="route-table-wrap">
          {routesQuery.isLoading || routesQuery.isFetching ? (
            <div className="table-skeleton p-4">
              <SkeletonBlock className="h-10 w-full mb-2" />
              {[0, 1, 2, 3, 4, 5, 6].map((item) => (
                <SkeletonBlock key={item} className="h-12 w-full mb-2" />
              ))}
            </div>
          ) : routesQuery.isError && !routesQuery.data ? (
            <QueryError retry={() => void routesQuery.refetch()} />
          ) : visibleRoutes.length > 0 ? (
            <table className="route-table">
              <thead>
                <tr>
                  <th onClick={() => sortRoutes('route')} style={{ cursor: 'pointer' }}>
                    <div className="flex items-center gap-1">
                      <span>CORRIDOR</span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${sortBy === 'route' ? (sortAscending ? 'rotate-180 text-primary' : 'text-primary') : 'opacity-30'}`}
                      />
                    </div>
                  </th>
                  <th className="align-right" onClick={() => sortRoutes('weight')} style={{ cursor: 'pointer' }}>
                    <div className="flex items-center justify-end gap-1">
                      <span>WEIGHT (w_r)</span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${sortBy === 'weight' ? (sortAscending ? 'rotate-180 text-primary' : 'text-primary') : 'opacity-30'}`}
                      />
                    </div>
                  </th>
                  <th className="align-right">BASE FARE (P_0)</th>
                  <th className="align-right" onClick={() => sortRoutes('averageFareInr')} style={{ cursor: 'pointer' }}>
                    <div className="flex items-center justify-end gap-1">
                      <span>CURRENT FARE (P_t)</span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${sortBy === 'averageFareInr' ? (sortAscending ? 'rotate-180 text-primary' : 'text-primary') : 'opacity-30'}`}
                      />
                    </div>
                  </th>
                  <th className="align-right" onClick={() => sortRoutes('weeklyChangePercent')} style={{ cursor: 'pointer' }}>
                    <div className="flex items-center justify-end gap-1">
                      <span>WEEKLY</span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${sortBy === 'weeklyChangePercent' ? (sortAscending ? 'rotate-180 text-primary' : 'text-primary') : 'opacity-30'}`}
                      />
                    </div>
                  </th>
                  <th className="align-right" onClick={() => sortRoutes('indexValue')} style={{ cursor: 'pointer' }}>
                    <div className="flex items-center justify-end gap-1">
                      <span>ROUTE INDEX</span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${sortBy === 'indexValue' ? (sortAscending ? 'rotate-180 text-primary' : 'text-primary') : 'opacity-30'}`}
                      />
                    </div>
                  </th>
                  <th className="align-right" onClick={() => sortRoutes('contributionPoints')} style={{ cursor: 'pointer' }}>
                    <div className="flex items-center justify-end gap-1">
                      <span>CONTRIBUTION (ΔI_r)</span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${sortBy === 'contributionPoints' ? (sortAscending ? 'rotate-180 text-primary' : 'text-primary') : 'opacity-30'}`}
                      />
                    </div>
                  </th>
                  <th className="align-right">ANOMALY (MAD z)</th>
                  <th className="align-right" onClick={() => sortRoutes('dataQualityScore')} style={{ cursor: 'pointer' }}>
                    <div className="flex items-center justify-end gap-1">
                      <span>QUALITY</span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${sortBy === 'dataQualityScore' ? (sortAscending ? 'rotate-180 text-primary' : 'text-primary') : 'opacity-30'}`}
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRoutes.map((row, index) => (
                  <tr
                    key={`${row.route}-${row.cityPair}`}
                    className="route-row"
                    style={{ animationDelay: `${Math.min(index, 8) * 25}ms` }}
                  >
                    <td>
                      <div className="route-cell">
                        <span className="route-glyph">
                          <Plane size={13} />
                        </span>
                        <span>
                          <strong>{row.route}</strong>
                          <small>{row.cityPair}</small>
                        </span>
                      </div>
                    </td>
                    <td className="align-right mono">
                      <span className="weight-pill">{(row.weight * 100).toFixed(1)}%</span>
                    </td>
                    <td className="align-right mono text-muted-foreground">{inr(row.baseFareInr)}</td>
                    <td className="align-right mono fare-cell">
                      <div>{inr(row.averageFareInr)}</div>
                      <span className="fare-breakdown-sub">
                        Base: {inr(row.currentBaseFareInr)} + Tax: {inr(row.mandatoryTaxesInr)}
                      </span>
                    </td>
                    <td className="align-right">
                      <ChangeText value={row.weeklyChangePercent} suffix="" />
                    </td>
                    <td className="align-right mono index-cell font-bold">{row.indexValue.toFixed(1)}</td>
                    <td className="align-right mono">
                      <span
                        className={`contrib-pill ${row.contributionPoints >= 0 ? 'contrib-pos' : 'contrib-neg'}`}
                      >
                        {signedPoints(row.contributionPoints)}
                      </span>
                    </td>
                    <td className="align-right">
                      <span
                        className={`anomaly-pill ${
                          row.anomalyStatus === 'PRICE_SPIKE'
                            ? 'anomaly-spike'
                            : row.anomalyStatus === 'VOLATILITY_SURGE'
                              ? 'anomaly-surge'
                              : 'anomaly-normal'
                        }`}
                      >
                        {row.anomalyStatus === 'PRICE_SPIKE' && <AlertTriangle size={11} />}
                        {row.anomalyStatus === 'NORMAL'
                          ? 'NORMAL'
                          : `${row.anomalyStatus} (z=${row.robustZScore > 0 ? '+' : ''}${row.robustZScore.toFixed(1)})`}
                      </span>
                    </td>
                    <td className="align-right mono font-semibold text-xs">
                      {row.dataQualityScore.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-routes p-8">
              <Search size={22} className="mx-auto text-muted-foreground mb-2" />
              <strong>No corridors match those filters</strong>
              <p className="text-xs text-muted-foreground mt-1">Try clearing the anomaly filter or adjusting search terms.</p>
              <button
                className="text-button mt-3"
                onClick={() => {
                  setRouteSearch('');
                  setDirectionFilter('all');
                  setAnomalyOnly(false);
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
        <div className="table-foot">
          <span>Weights (w_r) reflect DGCA annual domestic passenger volume share (summing to 100.0%).</span>
          <span>Contribution (ΔI_r = w_r × [I_r - 100]) shows exact index point impact on the national composite.</span>
        </div>
      </section>
    </div>
  );
}
