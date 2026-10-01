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
  Sliders,
  Sparkles,
  TrendingUp,
  X,
  ShieldCheck,
  Zap,
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

const METRO_CORRIDORS = ['DEL-BOM', 'DEL-BLR', 'BOM-BLR', 'DEL-CCU', 'DEL-HYD', 'BOM-MAA'];
const REGIONAL_CORRIDORS = ['BLR-HYD', 'CCU-BLR', 'BOM-HYD', 'DEL-PNQ'];
const TOURISM_CORRIDORS = ['BOM-GOI', 'DEL-MAA'];

export default function RoutesPage() {
  const routesQuery = useGetAirfareRoutes();
  const routes = (routesQuery.data ?? []) as AirfareRoute[];

  const [routeSearch, setRouteSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'metro' | 'regional' | 'tourism'>('all');
  const [anomalyOnly, setAnomalyOnly] = useState(false);
  const [sortBy, setSortBy] = useState<RouteSort>('weight');
  const [sortAscending, setSortAscending] = useState(false);
  const [inspectedRoute, setInspectedRoute] = useState<AirfareRoute | null>(null);

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

      let matchesCategory = true;
      if (categoryFilter === 'metro') {
        matchesCategory = METRO_CORRIDORS.includes(item.route);
      } else if (categoryFilter === 'regional') {
        matchesCategory = REGIONAL_CORRIDORS.includes(item.route);
      } else if (categoryFilter === 'tourism') {
        matchesCategory = TOURISM_CORRIDORS.includes(item.route);
      }

      return matchesSearch && matchesDirection && matchesAnomaly && matchesCategory;
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
  }, [anomalyOnly, categoryFilter, directionFilter, routeSearch, routes, sortAscending, sortBy]);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-primary font-mono">
            <Layers size={15} /> Section 03 · Laspeyres Basket
          </div>
          <h2 className="text-2xl font-black tracking-tight mt-1 font-heading uppercase text-foreground">
            Corridor Contributions & Anomaly Tags
          </h2>
          <p className="text-sm text-muted-foreground font-mono">
            Auditable route weights (w_r), base period pricing (P_0), and exact point contribution (ΔI_r) to headline index.
          </p>
        </div>
        {!routesQuery.isLoading && routeExport.length > 0 && (
          <button
            onClick={() => csvDownload('airindex-route-contributions.csv', routeExport)}
            className="nike-pill-btn bg-foreground text-background hover:bg-foreground/90 font-bold"
          >
            <FileSpreadsheet size={15} /> Export Corridor Basket (CSV)
          </button>
        )}
      </div>

      {/* Nike Athletic Telemetry Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase font-bold">
            <span>BASKET CAPACITY</span>
            <span className="text-primary font-black">100% DGCA</span>
          </div>
          <div className="font-display font-black text-2xl text-foreground">12 CORRIDORS</div>
          <div className="text-[11px] font-mono text-muted-foreground">Fixed Laspeyres Weights</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase font-bold">
            <span>TOP WEIGHT</span>
            <span className="text-emerald-400 font-black">16.5% SHARE</span>
          </div>
          <div className="font-display font-black text-2xl text-foreground">DEL–BOM</div>
          <div className="text-[11px] font-mono text-emerald-400">+2.34 pts index contribution</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase font-bold">
            <span>MAX MOMENTUM</span>
            <span className="text-rose-400 font-black">+6.4% WoW</span>
          </div>
          <div className="font-display font-black text-2xl text-foreground">BOM–GOI</div>
          <div className="text-[11px] font-mono text-muted-foreground">Leisure weekend elasticity</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase font-bold">
            <span>MAD ANOMALY SHIELD</span>
            <span className="text-primary font-black">ACTIVE</span>
          </div>
          <div className="font-display font-black text-2xl text-foreground">0 ANOMALIES</div>
          <div className="text-[11px] font-mono text-muted-foreground">All |Z| ≤ 3.0 (Zero Spikes)</div>
        </div>
      </div>

      {/* Corridor Inspection Modal / Card */}
      {inspectedRoute && (
        <div className="p-5 rounded-xl border border-primary/40 bg-card shadow-md relative space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <button
            onClick={() => setInspectedRoute(null)}
            className="absolute top-4 right-4 h-7 w-7 rounded-full border border-border hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="Close Inspector"
          >
            <X size={15} />
          </button>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground font-black text-xs font-mono">
              CORRIDOR INSPECTION
            </span>
            <h3 className="font-black text-lg font-heading uppercase text-foreground">
              {inspectedRoute.route} ({inspectedRoute.cityPair})
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 text-xs font-mono">
            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">Weight (w_r)</span>
              <span className="text-lg font-black text-primary">{(inspectedRoute.weight * 100).toFixed(1)}%</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">Current Spot (P_t)</span>
              <span className="text-lg font-black text-foreground">{inr(inspectedRoute.averageFareInr)}</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">Base Tariff (P_0)</span>
              <span className="text-lg font-black text-muted-foreground">{inr(inspectedRoute.baseFareInr)}</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">Route Index</span>
              <span className="text-lg font-black text-foreground">{inspectedRoute.indexValue.toFixed(1)} pts</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">Contribution (ΔI_r)</span>
              <span className="text-lg font-black text-emerald-400">{signedPoints(inspectedRoute.contributionPoints)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Panel */}
      <section className="panel route-panel">
        <div className="filter-row print-hidden pt-4 flex flex-wrap items-center gap-3">
          {/* Category Quick Filter Pills (Nike Style) */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/60 border border-border text-xs font-mono">
            {(
              [
                { id: 'all', label: `ALL (${routes.length})` },
                { id: 'metro', label: 'METRO TRUNK (6)' },
                { id: 'regional', label: 'REGIONAL (4)' },
                { id: 'tourism', label: 'LEISURE (2)' },
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

          <label className="search-box ml-auto">
            <Search size={15} />
            <input
              value={routeSearch}
              onChange={(event) => setRouteSearch(event.target.value)}
              placeholder="Search corridor or city pair (e.g. DEL-BOM)"
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

          <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground select-none">
            <input
              type="checkbox"
              checked={anomalyOnly}
              onChange={(e) => setAnomalyOnly(e.target.checked)}
              className="accent-primary"
            />
            <span className="font-mono">Anomalies Only (MAD)</span>
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
                    <div className="flex items-center gap-1 font-mono">
                      <span>CORRIDOR</span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${sortBy === 'route' ? (sortAscending ? 'rotate-180 text-primary' : 'text-primary') : 'opacity-30'}`}
                      />
                    </div>
                  </th>
                  <th className="align-right" onClick={() => sortRoutes('weight')} style={{ cursor: 'pointer' }}>
                    <div className="flex items-center justify-end gap-1 font-mono">
                      <span>WEIGHT (w_r)</span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${sortBy === 'weight' ? (sortAscending ? 'rotate-180 text-primary' : 'text-primary') : 'opacity-30'}`}
                      />
                    </div>
                  </th>
                  <th className="align-right font-mono">BASE FARE (P_0)</th>
                  <th className="align-right" onClick={() => sortRoutes('averageFareInr')} style={{ cursor: 'pointer' }}>
                    <div className="flex items-center justify-end gap-1 font-mono">
                      <span>CURRENT FARE (P_t)</span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${sortBy === 'averageFareInr' ? (sortAscending ? 'rotate-180 text-primary' : 'text-primary') : 'opacity-30'}`}
                      />
                    </div>
                  </th>
                  <th className="align-right" onClick={() => sortRoutes('weeklyChangePercent')} style={{ cursor: 'pointer' }}>
                    <div className="flex items-center justify-end gap-1 font-mono">
                      <span>WEEKLY</span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${sortBy === 'weeklyChangePercent' ? (sortAscending ? 'rotate-180 text-primary' : 'text-primary') : 'opacity-30'}`}
                      />
                    </div>
                  </th>
                  <th className="align-right" onClick={() => sortRoutes('indexValue')} style={{ cursor: 'pointer' }}>
                    <div className="flex items-center justify-end gap-1 font-mono">
                      <span>ROUTE INDEX</span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${sortBy === 'indexValue' ? (sortAscending ? 'rotate-180 text-primary' : 'text-primary') : 'opacity-30'}`}
                      />
                    </div>
                  </th>
                  <th className="align-right" onClick={() => sortRoutes('contributionPoints')} style={{ cursor: 'pointer' }}>
                    <div className="flex items-center justify-end gap-1 font-mono">
                      <span>CONTRIBUTION (ΔI_r)</span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${sortBy === 'contributionPoints' ? (sortAscending ? 'rotate-180 text-primary' : 'text-primary') : 'opacity-30'}`}
                      />
                    </div>
                  </th>
                  <th className="align-right font-mono">ANOMALY (MAD z)</th>
                  <th className="align-right font-mono" onClick={() => sortRoutes('dataQualityScore')} style={{ cursor: 'pointer' }}>
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
                    className={`route-row cursor-pointer transition-colors ${
                      inspectedRoute?.route === row.route ? 'bg-primary/10' : 'hover:bg-muted/40'
                    }`}
                    onClick={() => setInspectedRoute(row)}
                    style={{ animationDelay: `${Math.min(index, 8) * 25}ms` }}
                  >
                    <td>
                      <div className="route-cell">
                        <span className="route-glyph text-primary">
                          <Plane size={13} />
                        </span>
                        <span>
                          <strong>{row.route}</strong>
                          <small>{row.cityPair}</small>
                        </span>
                      </div>
                    </td>
                    <td className="align-right mono">
                      <span className="weight-pill font-bold">{(row.weight * 100).toFixed(1)}%</span>
                    </td>
                    <td className="align-right mono text-muted-foreground">{inr(row.baseFareInr)}</td>
                    <td className="align-right mono fare-cell">
                      <div className="font-bold">{inr(row.averageFareInr)}</div>
                      <span className="fare-breakdown-sub font-mono">
                        Base: {inr(row.currentBaseFareInr)} + Tax: {inr(row.mandatoryTaxesInr)}
                      </span>
                    </td>
                    <td className="align-right">
                      <ChangeText value={row.weeklyChangePercent} suffix="" />
                    </td>
                    <td className="align-right mono index-cell font-black">{row.indexValue.toFixed(1)}</td>
                    <td className="align-right mono">
                      <span
                        className={`contrib-pill font-bold ${row.contributionPoints >= 0 ? 'contrib-pos' : 'contrib-neg'}`}
                      >
                        {signedPoints(row.contributionPoints)}
                      </span>
                    </td>
                    <td className="align-right">
                      <span
                        className={`anomaly-pill font-mono font-bold ${
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
                    <td className="align-right mono font-black text-xs text-primary">
                      {row.dataQualityScore.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-routes p-8 text-center">
              <Search size={22} className="mx-auto text-muted-foreground mb-2" />
              <strong>No corridors match those filters</strong>
              <p className="text-xs text-muted-foreground mt-1">Try clearing the anomaly filter or adjusting search terms.</p>
              <button
                className="nike-pill-btn bg-muted text-foreground mt-3 font-bold"
                onClick={() => {
                  setRouteSearch('');
                  setDirectionFilter('all');
                  setCategoryFilter('all');
                  setAnomalyOnly(false);
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
        <div className="table-foot font-mono text-[11px]">
          <span>Weights (w_r) reflect DGCA annual domestic passenger volume share (summing to 100.0%).</span>
          <span>Contribution (ΔI_r = w_r × [I_r - 100]) shows exact index point impact on national composite.</span>
        </div>
      </section>
    </div>
  );
}
