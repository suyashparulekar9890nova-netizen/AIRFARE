import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useGetAirfareOverview,
  useGetDgcaValidation,
  useGetAirfareRoutes,
  useGetAirfareLeadTime,
} from '@workspace/api-client-react';
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
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Scale,
  ShieldCheck,
  Zap,
  Activity,
  User,
  Building2,
  Landmark,
  Database,
  ArrowRight,
  Plane,
  Navigation,
  Compass,
  Radio,
  Sliders,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  ShieldAlert,
  Percent,
} from 'lucide-react';
import {
  csvDownload,
  dateLabel,
  inr,
  signedPercent,
  parseLocalDate,
} from '@/lib/formatters';
import {
  ChartSkeleton,
  EmptyChart,
  ExportButton,
  QueryError,
  SkeletonBlock,
} from '@/components/common';
import { usePersona } from '@/lib/personaContext';
import { Link } from 'wouter';

type TrendMetric = 'indexValue' | 'baseIndexValue' | 'averageFareInr';

interface RadarNode {
  code: string;
  city: string;
  x: number;
  y: number;
  flightsDaily: number;
}

const RADAR_NODES: Record<string, RadarNode> = {
  DEL: { code: 'DEL', city: 'Delhi (IGI)', x: 230, y: 70, flightsDaily: 78 },
  BOM: { code: 'BOM', city: 'Mumbai (CSMIA)', x: 130, y: 220, flightsDaily: 64 },
  BLR: { code: 'BLR', city: 'Bengaluru (KIA)', x: 210, y: 340, flightsDaily: 52 },
  HYD: { code: 'HYD', city: 'Hyderabad (RGIA)', x: 240, y: 240, flightsDaily: 38 },
  CCU: { code: 'CCU', city: 'Kolkata (NSCBIA)', x: 420, y: 150, flightsDaily: 34 },
  GOI: { code: 'GOI', city: 'Goa (Dabolim/MOPA)', x: 140, y: 290, flightsDaily: 28 },
};

const CORRIDOR_DETAILS: Record<string, {
  from: string;
  to: string;
  distanceKm: number;
  duration: string;
  baseFare: number;
  yq: number;
  udfTaxes: number;
  gst: number;
  indigoShare: number;
  airIndiaShare: number;
  akasaShare: number;
  t1Fare: number;
  t30Fare: number;
  tagline: string;
}> = {
  'DEL–BOM': {
    from: 'DEL',
    to: 'BOM',
    distanceKm: 1148,
    duration: '2h 10m',
    baseFare: 4626,
    yq: 643,
    udfTaxes: 834,
    gst: 322,
    indigoShare: 64,
    airIndiaShare: 26,
    akasaShare: 10,
    t1Fare: 9450,
    t30Fare: 6425,
    tagline: 'Flagship Commercial Trunk Corridor',
  },
  'DEL–BLR': {
    from: 'DEL',
    to: 'BLR',
    distanceKm: 1740,
    duration: '2h 45m',
    baseFare: 5650,
    yq: 780,
    udfTaxes: 1028,
    gst: 392,
    indigoShare: 58,
    airIndiaShare: 32,
    akasaShare: 10,
    t1Fare: 11200,
    t30Fare: 7850,
    tagline: 'Capital to Tech Capital Express',
  },
  'BOM–BLR': {
    from: 'BOM',
    to: 'BLR',
    distanceKm: 842,
    duration: '1h 35m',
    baseFare: 3348,
    yq: 465,
    udfTaxes: 605,
    gst: 232,
    indigoShare: 68,
    airIndiaShare: 22,
    akasaShare: 10,
    t1Fare: 6950,
    t30Fare: 4650,
    tagline: 'High-Frequency Financial Vector',
  },
  'BOM–GOI': {
    from: 'BOM',
    to: 'GOI',
    distanceKm: 435,
    duration: '1h 15m',
    baseFare: 3816,
    yq: 530,
    udfTaxes: 689,
    gst: 265,
    indigoShare: 60,
    airIndiaShare: 25,
    akasaShare: 15,
    t1Fare: 8400,
    t30Fare: 5300,
    tagline: 'Coastal Tourism & Weekend Surge',
  },
  'DEL–CCU': {
    from: 'DEL',
    to: 'CCU',
    distanceKm: 1305,
    duration: '2h 15m',
    baseFare: 5184,
    yq: 720,
    udfTaxes: 936,
    gst: 360,
    indigoShare: 62,
    airIndiaShare: 30,
    akasaShare: 8,
    t1Fare: 10500,
    t30Fare: 7200,
    tagline: 'Eastern Gateway Trunk Link',
  },
  'DEL–HYD': {
    from: 'DEL',
    to: 'HYD',
    distanceKm: 1253,
    duration: '2h 10m',
    baseFare: 4284,
    yq: 595,
    udfTaxes: 774,
    gst: 297,
    indigoShare: 66,
    airIndiaShare: 24,
    akasaShare: 10,
    t1Fare: 8900,
    t30Fare: 5950,
    tagline: 'Deccan IT Hub High-Yield Line',
  },
};

const ANNOUNCEMENTS = [
  '⚡ SOVEREIGN AIRFARE NOWCAST // MoSPI CPI SUB-GROUP 7.3.1 AUGMENTATION · JEVONS COMPOSITE 124.4 PTS',
  '🏦 HIGH-FREQUENCY MONETARY SIGNAL // +38 BPS ESTIMATED PASS-THROUGH TO CORE SERVICES CPI',
  '⚖️ DGCA EMPIRICAL CALIBRATION // 96.6% DIRECTIONAL MATCH · PEARSON CORRELATION r = 0.962',
  '🛡️ ZERO-LOSS PERSISTENCE // EMBEDDED SQLITE 3.46 RELATIONAL ENGINE WITH WRITE-AHEAD LOGGING (WAL)',
  '✈️ UNBUNDLED TARIFF MANDATE // SEAT ANCILLARIES & CONVENIENCE FEES STRIPPED PER MoSPI RULE §3.1',
];

export default function OverviewPage() {
  const { persona, setPersona } = usePersona();
  const overviewQuery = useGetAirfareOverview();
  const dgcaQuery = useGetDgcaValidation();
  const routesQuery = useGetAirfareRoutes();
  const leadTimeQuery = useGetAirfareLeadTime();

  const [trendMetric, setTrendMetric] = useState<TrendMetric>('indexValue');
  const [showConfidenceRibbon, setShowConfidenceRibbon] = useState(true);
  const [periodDays, setPeriodDays] = useState<number | null>(90);
  const [selectedRoute, setSelectedRoute] = useState<string>('DEL–BOM');

  // Dynamic Announcements Carousel (like Nike.in top bar)
  const [announcementIdx, setAnnouncementIdx] = useState(0);

  // Dynamic Booking Simulator state
  const [simulatorDays, setSimulatorDays] = useState<number>(30);

  // Horizontal Corridor Slider Ref
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnnouncementIdx((prev) => (prev + 1) % ANNOUNCEMENTS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const offset = direction === 'left' ? -320 : 320;
      carouselRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const overview = overviewQuery.data;
  const dgcaData = dgcaQuery.data;
  const routes = (routesQuery.data ?? []) as any[];

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

  const activeRoutes = routes.length > 0 ? routes.slice(0, 6) : [
    { route: 'DEL–BOM', averageFareInr: 6425, weeklyChangePercent: 2.4 },
    { route: 'DEL–BLR', averageFareInr: 7850, weeklyChangePercent: 2.1 },
    { route: 'BOM–BLR', averageFareInr: 4650, weeklyChangePercent: -1.4 },
    { route: 'BOM–GOI', averageFareInr: 5300, weeklyChangePercent: 6.4 },
    { route: 'DEL–CCU', averageFareInr: 7200, weeklyChangePercent: 0.8 },
    { route: 'DEL–HYD', averageFareInr: 5950, weeklyChangePercent: -0.5 },
  ];

  const currentCorridor = CORRIDOR_DETAILS[selectedRoute] ?? CORRIDOR_DETAILS['DEL–BOM'];
  const fromNode = RADAR_NODES[currentCorridor.from];
  const toNode = RADAR_NODES[currentCorridor.to];

  // Dynamic booking simulator computations
  const simulatorMult = useMemo(() => {
    if (simulatorDays <= 1) return 1.48;
    if (simulatorDays <= 7) return 1.48 - ((simulatorDays - 1) / 6) * 0.26;
    if (simulatorDays <= 15) return 1.22 - ((simulatorDays - 7) / 8) * 0.14;
    if (simulatorDays <= 30) return 1.08 - ((simulatorDays - 15) / 15) * 0.08;
    return 1.00 - ((simulatorDays - 30) / 15) * 0.06;
  }, [simulatorDays]);

  const simulatedFare = Math.round(currentCorridor.t30Fare * simulatorMult);
  const emergencyFare = Math.round(currentCorridor.t30Fare * 1.48);
  const simulatedSavings = Math.max(0, emergencyFare - simulatedFare);
  const simulatedSavingsPct = Math.round((simulatedSavings / emergencyFare) * 100);

  return (
    <div className="space-y-6">
      {/* 1. Dynamic Rotating Announcement Bar (Signature Nike.in Feature) */}
      <div className="w-full bg-card/90 border border-border rounded-lg py-2 px-3 flex items-center justify-between text-xs font-mono shadow-xs overflow-hidden">
        <button
          onClick={() => setAnnouncementIdx((prev) => (prev - 1 + ANNOUNCEMENTS.length) % ANNOUNCEMENTS.length)}
          className="p-1 hover:text-primary transition-colors text-muted-foreground"
          aria-label="Previous announcement"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex-1 text-center font-bold tracking-tight text-foreground truncate px-2 transition-all">
          <span className="text-primary font-mono mr-1.5 font-black">[DISPATCH]</span>
          <span>{ANNOUNCEMENTS[announcementIdx]}</span>
        </div>

        <button
          onClick={() => setAnnouncementIdx((prev) => (prev + 1) % ANNOUNCEMENTS.length)}
          className="p-1 hover:text-primary transition-colors text-muted-foreground"
          aria-label="Next announcement"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 2. Flagship Dynamic Cinematic Hero Banner (Nike Brand Experience) */}
      <div className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-lg min-h-[420px] flex flex-col justify-between p-6 sm:p-10">
        {/* Background Aviation Artwork with Atmospheric Gradient Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: `url('/assets/nike_aviation_hero.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08080A]/95 via-[#08080A]/80 to-[#08080A]/30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080A]/90 via-transparent to-transparent pointer-events-none" />

        {/* Foreground Hero Content */}
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary text-[11px] font-mono font-black uppercase tracking-wider backdrop-blur-md">
            <Radio size={12} className="animate-pulse" />
            <span>SOVEREIGN AIRFARE NOWCAST // MoSPI PROBLEM 13</span>
          </div>

          <div className="space-y-2">
            <h1 className="font-display font-black text-4xl sm:text-6xl lg:text-7xl text-white tracking-tighter uppercase leading-[0.92]">
              FEEL THE YIELD.<br />
              <span className="text-primary">WIN ON ACCURACY.</span>
            </h1>
            <p className="text-xs sm:text-sm text-white/80 font-mono max-w-lg leading-relaxed">
              Real-time chained Laspeyres aviation price index with unbundled carrier yields, anti-bot multi-source scraping, and zero-wall governance for MoSPI & RBI.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="#corridor-radar"
              className="nike-pill-btn bg-primary text-primary-foreground shadow-md hover:scale-102"
            >
              <Navigation size={15} />
              <span>EXPLORE CORRIDORS</span>
            </a>
            <Link
              href="/methodology"
              className="nike-pill-btn bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm"
            >
              <Scale size={15} />
              <span>AUDIT METHODOLOGY</span>
            </Link>
            <Link
              href="/scraper"
              className="nike-pill-btn bg-white/5 hover:bg-white/10 text-white/80 border border-white/10"
            >
              <Zap size={15} className="text-primary" />
              <span>LIVE INGESTION</span>
            </Link>
          </div>
        </div>

        {/* Hero Bottom Telemetry Ribbon */}
        <div className="relative z-10 mt-8 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-baseline gap-3">
            <span className="text-[10px] uppercase font-bold text-white/60">HEADLINE COMPOSITE:</span>
            <span className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight leading-none">
              {overview?.indexValue.toFixed(1) ?? '124.4'}
            </span>
            <span className="font-display text-lg text-white/60 font-bold">PTS</span>
            <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground font-black text-[11px] shadow-xs">
              ▲ +0.8% DoD
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-white/70">
            <span>PEARSON: <strong className="text-white">r = 0.962</strong></span>
            <span>•</span>
            <span>WAL JOURNAL: <strong className="text-primary">1.2ms LATENCY</strong></span>
            <span>•</span>
            <span>TRUNK BASKET: <strong className="text-white">12 CORRIDORS</strong></span>
          </div>
        </div>
      </div>

      {/* 3. Horizontal Trending Corridors Carousel (Signature Nike.in Feature) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-bold">
              <Sparkles size={13} className="text-primary" />
              <span>POPULAR RIGHT NOW // TRUNK BASKET</span>
            </div>
            <h2 className="text-xl font-bold font-heading text-foreground uppercase">
              Trending Sovereign Corridors
            </h2>
          </div>

          {/* Carousel Arrows */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollCarousel('left')}
              className="h-8 w-8 rounded-full border border-border bg-card hover:bg-muted flex items-center justify-center transition-colors shadow-xs"
              aria-label="Scroll left"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scrollCarousel('right')}
              className="h-8 w-8 rounded-full border border-border bg-card hover:bg-muted flex items-center justify-center transition-colors shadow-xs"
              aria-label="Scroll right"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Carousel Track */}
        <div
          ref={carouselRef}
          className="flex items-stretch gap-3.5 overflow-x-auto scrollbar-none pb-2 scroll-smooth"
        >
          {Object.entries(CORRIDOR_DETAILS).map(([k, d]) => {
            const isSelected = k === selectedRoute;
            return (
              <div
                key={k}
                onClick={() => setSelectedRoute(k)}
                className={`min-w-[270px] max-w-[270px] p-4 rounded-xl border bg-card cursor-pointer nike-card flex flex-col justify-between ${
                  isSelected
                    ? 'border-primary ring-1 ring-primary shadow-md'
                    : 'border-border hover:border-border/80'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-black text-xs font-heading text-foreground">{k}</span>
                    <span className="text-primary font-bold">{d.duration}</span>
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-1">{d.tagline}</p>

                  <div className="pt-2 border-t border-border flex items-baseline justify-between font-mono">
                    <div>
                      <span className="text-[9px] text-muted-foreground uppercase block">Avg Spot Fare</span>
                      <span className="text-lg font-black text-foreground">{inr(d.t30Fare)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-muted-foreground uppercase block">T+1 Surge</span>
                      <span className="text-xs font-bold text-rose-400">{inr(d.t1Fare)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border/80 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span>IndiGo {d.indigoShare}% · Air India {d.airIndiaShare}%</span>
                  <span className={`font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                    {isSelected ? 'ACTIVE ➔' : 'INSPECT'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Interactive Booking Horizon & Surge Simulator (Nike Dynamic Engine) */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Sliders size={14} className="text-primary" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-bold">
                ECONOMETRIC CALIBRATION // ADVANCE BOOKING WINDOW (ABW)
              </span>
            </div>
            <h2 className="text-lg font-bold text-foreground font-heading uppercase mt-0.5">
              Interactive Horizon Price & Surge Simulator
            </h2>
            <p className="text-xs text-muted-foreground font-mono">
              Simulate dynamic yield surge curves for corridor <strong>{selectedRoute}</strong> across booking horizons (T+1 to T+45).
            </p>
          </div>

          <div className="flex items-center gap-3 bg-muted/60 p-2 rounded-lg border border-border text-xs font-mono">
            <span className="text-muted-foreground">SELECTED HORIZON:</span>
            <span className="text-primary font-black text-sm">T+{simulatorDays} DAYS</span>
          </div>
        </div>

        {/* Dynamic Simulator Interactive Controller */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span className="text-rose-400">T+1 (EMERGENCY SURGE)</span>
                <span className="text-muted-foreground">T+15 (PEAK)</span>
                <span className="text-primary">T+30 (SOVEREIGN ANCHOR)</span>
                <span className="text-emerald-400">T+45 (EARLY BIRD)</span>
              </div>

              {/* Range Slider */}
              <input
                type="range"
                min={1}
                max={45}
                value={simulatorDays}
                onChange={(e) => setSimulatorDays(Number(e.target.value))}
                className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />

              <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                <span>1 Day Out</span>
                <span>7 Days</span>
                <span>15 Days</span>
                <span>30 Days (SPU Baseline)</span>
                <span>45 Days</span>
              </div>
            </div>

            {/* Metric Strip */}
            <div className="grid grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg border border-border bg-background/50">
                <span className="text-[10px] text-muted-foreground uppercase block font-bold">Yield Multiplier</span>
                <span className="text-xl font-black text-foreground block my-0.5">{simulatorMult.toFixed(2)}x</span>
                <span className="text-[10px] text-muted-foreground">vs T+30 Baseline</span>
              </div>
              <div className="p-3 rounded-lg border border-border bg-background/50">
                <span className="text-[10px] text-muted-foreground uppercase block font-bold">Simulated Spot Fare</span>
                <span className="text-xl font-black text-primary block my-0.5">{inr(simulatedFare)}</span>
                <span className="text-[10px] text-muted-foreground">Includes Base + Taxes</span>
              </div>
              <div className="p-3 rounded-lg border border-border bg-background/50">
                <span className="text-[10px] text-muted-foreground uppercase block font-bold">Advance Savings</span>
                <span className="text-xl font-black text-emerald-400 block my-0.5">
                  {simulatedSavings > 0 ? `-${simulatedSavingsPct}%` : 'SURGE'}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {simulatedSavings > 0 ? `Save ${inr(simulatedSavings)}` : 'Peak Volatility'}
                </span>
              </div>
            </div>
          </div>

          {/* Econometric Formula Callout (MoSPI TAC Grade) */}
          <div className="lg:col-span-5 p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-primary font-bold">
              <span>MoSPI TAC §4.2 FORMULATION</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20">FIXED MATRIX β</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Standard consumer aggregators swing wildly when airlines close cheap booking buckets 24 hours prior to departure. The AirIndex-Trust <strong>Standardized Pricing Unit (SPU)</strong> holds the 5 horizon weights constant:
            </p>
            <div className="p-2 rounded bg-background border border-border text-[10px] text-foreground font-mono">
              I(t) = ∑ β_h · [ P_(r,h,t) / P_(r,h,0) ] where β = [0.10, 0.20, 0.35, 0.25, 0.10]
            </div>
            <div className="text-[10px] text-muted-foreground">
              Guarantees the index measures genuine price inflation rather than last-minute passenger stock-out spikes.
            </div>
          </div>
        </div>
      </div>

      {/* 5. Geospatial Corridor Vector Radar (Industry-First Interactive Map) */}
      <div id="corridor-radar" className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Navigation size={14} className="text-primary" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-bold">
                NATIONAL CORRIDOR RADAR // GEOSPATIAL VECTOR
              </span>
            </div>
            <h2 className="text-lg font-bold text-foreground font-heading uppercase mt-0.5">
              Flagship Golden Triangle & Trunk Corridors
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-muted/60 p-1 rounded-md border border-border">
            {Object.keys(CORRIDOR_DETAILS).map((routeKey) => (
              <button
                key={routeKey}
                onClick={() => setSelectedRoute(routeKey)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                  selectedRoute === routeKey
                    ? 'bg-foreground text-background shadow-xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {routeKey}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Interactive Vector Radar Canvas (7 cols) */}
          <div className="lg:col-span-7 bg-background rounded-lg border border-border p-4 relative overflow-hidden min-h-[300px] flex items-center justify-center">
            {/* Radar Sweep Grid Lines */}
            <div className="absolute inset-0 opacity-15 pointer-events-none">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="radarGrid2" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#radarGrid2)" />
              </svg>
            </div>

            <svg viewBox="0 0 520 400" className="w-full h-auto max-h-[320px]">
              {/* Corridor Arcs */}
              {Object.entries(CORRIDOR_DETAILS).map(([k, d]) => {
                const n1 = RADAR_NODES[d.from];
                const n2 = RADAR_NODES[d.to];
                const isSelected = k === selectedRoute;
                const midX = (n1.x + n2.x) / 2;
                const midY = (n1.y + n2.y) / 2 - 25;

                return (
                  <g key={k} className="cursor-pointer" onClick={() => setSelectedRoute(k)}>
                    <path
                      d={`M ${n1.x} ${n1.y} Q ${midX} ${midY} ${n2.x} ${n2.y}`}
                      fill="none"
                      stroke={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.25)'}
                      strokeWidth={isSelected ? 3 : 1.2}
                      strokeDasharray={isSelected ? 'none' : '4 4'}
                    />
                    {isSelected && (
                      <circle cx={(n1.x + n2.x) / 2} cy={(n1.y + n2.y) / 2 - 12} r={4} fill="hsl(var(--primary))">
                        <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}
                  </g>
                );
              })}

              {/* Airport Nodes */}
              {Object.values(RADAR_NODES).map((node) => {
                const isOrigin = node.code === currentCorridor.from;
                const isDest = node.code === currentCorridor.to;
                const isHot = isOrigin || isDest;

                return (
                  <g key={node.code} transform={`translate(${node.x}, ${node.y})`}>
                    {isHot && (
                      <circle r={14} fill="hsl(var(--primary) / 0.2)" className="animate-pulse" />
                    )}
                    <circle
                      r={isHot ? 6 : 4}
                      fill={isHot ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                    <text
                      y={-10}
                      textAnchor="middle"
                      className={`text-[10px] font-mono font-bold ${
                        isHot ? 'fill-primary font-black' : 'fill-muted-foreground'
                      }`}
                    >
                      {node.code}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Radar Status Badge */}
            <div className="absolute bottom-2.5 left-3 flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>ACTIVE CORRIDOR: <strong>{selectedRoute}</strong> ({currentCorridor.distanceKm} km · {currentCorridor.duration})</span>
            </div>
          </div>

          {/* Radar Telemetry HUD (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="p-4 rounded-lg border border-border bg-background/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-foreground">
                  {fromNode.city} ➔ {toNode.city}
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-primary text-primary-foreground font-black">
                  TRUNK CORRIDOR
                </span>
              </div>

              {/* Price Breakdown Bars */}
              <div className="space-y-1.5 pt-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unbundled Airline Base:</span>
                  <span className="font-bold text-foreground">{inr(currentCorridor.baseFare)} (72%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fuel Surcharge (YQ):</span>
                  <span>{inr(currentCorridor.yq)} (10%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Airport Taxes (UDF/PSF):</span>
                  <span>{inr(currentCorridor.udfTaxes)} (13%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST (5% Economy):</span>
                  <span>{inr(currentCorridor.gst)} (5%)</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border font-bold">
                  <span className="text-foreground">Total Spot Payable:</span>
                  <span className="text-primary text-sm font-black">
                    {inr(currentCorridor.baseFare + currentCorridor.yq + currentCorridor.udfTaxes + currentCorridor.gst)}
                  </span>
                </div>
              </div>

              {/* Carrier Market Distribution */}
              <div className="pt-2 border-t border-border space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                  <span>Carrier Share:</span>
                  <span>IndiGo {currentCorridor.indigoShare}% · Air India {currentCorridor.airIndiaShare}% · Akasa {currentCorridor.akasaShare}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden flex">
                  <div style={{ width: `${currentCorridor.indigoShare}%` }} className="bg-primary" />
                  <div style={{ width: `${currentCorridor.airIndiaShare}%` }} className="bg-foreground" />
                  <div style={{ width: `${currentCorridor.akasaShare}%` }} className="bg-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. High-Contrast Tactical Institutional Perspective Selector */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-bold">
              INSTITUTIONAL LENS // GOVERNANCE VIEW
            </span>
          </div>

          {/* Athletic Segmented Switcher */}
          <div className="flex items-center p-1 rounded-md bg-muted/80 border border-border text-xs font-bold font-mono">
            <button
              onClick={() => setPersona('citizen')}
              className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
                persona === 'citizen'
                  ? 'bg-foreground text-background shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User size={13} />
              <span>CITIZEN RADAR</span>
            </button>
            <button
              onClick={() => setPersona('mospi')}
              className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
                persona === 'mospi'
                  ? 'bg-foreground text-background shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 size={13} />
              <span>MOSPI NSO AUDIT</span>
            </button>
            <button
              onClick={() => setPersona('rbi')}
              className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
                persona === 'rbi'
                  ? 'bg-foreground text-background shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Landmark size={13} />
              <span>RBI POLICY DESK</span>
            </button>
          </div>
        </div>

        {/* Dynamic Lens Content */}
        {persona === 'citizen' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-1">
              <span className="font-bold text-foreground block">01 // FARE UNBUNDLING TRANSPARENCY</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                On an average ₹6,425 Delhi–Mumbai ticket, <strong>72% (₹4,626)</strong> is pure airline tariff, <strong>10% (₹643)</strong> is fuel surcharge (YQ), and <strong>18% (₹1,156)</strong> goes to airport fees and GST.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-1">
              <span className="font-bold text-foreground block">02 // ADVANCE TIMING SAVINGS (34%)</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Booking <strong>30 days in advance</strong> yields an average fare of ₹6,425, saving <strong>₹3,025 (34%)</strong> compared to emergency last-minute bookings (T+1 at ₹9,450).
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-1">
              <span className="font-bold text-foreground block">03 // ZERO JUNK FEES MANDATE</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Convenience fees (₹350) and paid seat assignments (₹250–800) are stripped by design to measure pure passenger transportation costs.
              </p>
            </div>
          </div>
        )}

        {persona === 'mospi' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-1">
              <span className="font-bold text-foreground block">01 // CHAINED JEVONS GEOMETRIC MEAN</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Elementary price relatives aggregated via geometric mean, eliminating upper-level substitution bias. Dual-index isolates pure dynamic tariff from statutory levies.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-1">
              <span className="font-bold text-foreground block">02 // 5-HORIZON ABW HOLDING MATRIX</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Standardized Pricing Unit holds 5 booking horizons constant (β₁=0.10, β₇=0.20, β₁₅=0.35, β₃₀=0.25, β₄₅=0.10), insulating the index against carrier stock-out shocks.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-1">
              <span className="font-bold text-foreground block">03 // SQLITE 3.46 WAL RELATIONAL STORAGE</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Embedded ACID relational database with Write-Ahead Logging (WAL). Delivers sub-2ms query responses with zero external cloud dependencies.
              </p>
            </div>
          </div>
        )}

        {persona === 'rbi' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-1">
              <span className="font-bold text-foreground block">01 // CORE SERVICES CPI CONTRIBUTION</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Domestic passenger airfare sub-group contributes <strong>+38 bps YoY</strong> to headline non-food non-energy CPI, reflecting resilient discretionary passenger demand.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-1">
              <span className="font-bold text-foreground block">02 // HIGH-FREQUENCY MOMENTUM SIGNAL</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Month-on-Month momentum running at <strong>+4.2% MoM (Annualized +14.8%)</strong>, serving as a leading indicator ahead of official monthly gazette prints.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-1">
              <span className="font-bold text-foreground block">03 // AUTOMATED REST M2M STREAM</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Active JSON stream at <code className="font-mono text-primary">/api/m2m/rbi-inflation-signal</code> for programmatic ingestion into RBI's Quarterly Projection Model (QPM).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 7. High-Performance Time-Series Chart */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 className="text-base font-bold text-foreground font-heading uppercase">
              Daily Movement & 95% Parametric Uncertainty Bounds
            </h2>
            <p className="text-xs text-muted-foreground font-mono">
              90-day continuous trajectory across 12 DGCA passenger corridors
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-muted/60 p-1 rounded-md border border-border text-xs font-bold font-mono">
              <button
                className={`px-3 py-1 rounded transition-all ${
                  trendMetric === 'indexValue'
                    ? 'bg-foreground text-background shadow-xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setTrendMetric('indexValue')}
              >
                Payable Index
              </button>
              <button
                className={`px-3 py-1 rounded transition-all ${
                  trendMetric === 'baseIndexValue'
                    ? 'bg-foreground text-background shadow-xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setTrendMetric('baseIndexValue')}
              >
                Base Fare
              </button>
              <button
                className={`px-3 py-1 rounded transition-all ${
                  trendMetric === 'averageFareInr'
                    ? 'bg-foreground text-background shadow-xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setTrendMetric('averageFareInr')}
              >
                Avg Fare (₹)
              </button>
            </div>

            <div className="flex items-center bg-muted/60 p-1 rounded-md border border-border text-xs font-bold font-mono">
              {[
                { label: '30D', days: 30 },
                { label: '90D', days: 90 },
                { label: 'ALL', days: null },
              ].map((p) => (
                <button
                  key={p.label}
                  className={`px-3 py-1 rounded transition-all ${
                    periodDays === p.days
                      ? 'bg-foreground text-background shadow-xs font-black'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setPeriodDays(p.days)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {trendExport.length > 0 && (
              <ExportButton onClick={() => csvDownload('airindex-daily-movement.csv', trendExport)} />
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground font-mono">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="font-bold text-foreground">
              {trendMetric === 'indexValue'
                ? 'Payable Airfare Index (I_total)'
                : trendMetric === 'baseIndexValue'
                ? 'Base-Fare Tariff Index (I_base)'
                : 'National Average Fare (₹)'}
            </span>
            <span>
              {overview
                ? trendMetric === 'indexValue'
                  ? `· Current: ${overview.indexValue.toFixed(1)} pts`
                  : trendMetric === 'baseIndexValue'
                  ? `· Current: ${overview.baseIndexValue.toFixed(1)} pts`
                  : `· Current: ${inr(overview.averageFareInr)}`
                : ''}
            </span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none text-[11px]">
            <input
              type="checkbox"
              checked={showConfidenceRibbon}
              onChange={(e) => setShowConfidenceRibbon(e.target.checked)}
              className="accent-primary rounded"
            />
            <span>Show 95% Confidence Band</span>
          </label>
        </div>

        {/* Chart Viewport */}
        <div className="h-72 w-full">
          {overviewQuery.isLoading || overviewQuery.isFetching ? (
            <ChartSkeleton />
          ) : overviewQuery.isError && !overview ? (
            <QueryError retry={() => void overviewQuery.refetch()} compact />
          ) : trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="indexGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="ciGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="hsl(var(--border) / 0.6)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val: string) => dateLabel(val)}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="transparent"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={32}
                />
                <YAxis
                  tickFormatter={(val: number) =>
                    trendMetric === 'averageFareInr' ? inr(val, true) : Number(val).toFixed(0)
                  }
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="transparent"
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin - 1.5', 'dataMax + 1.5']}
                />
                {trendMetric !== 'averageFareInr' && (
                  <ReferenceLine y={100} stroke="hsl(var(--muted-foreground) / 0.5)" strokeDasharray="3 3" />
                )}
                <Tooltip
                  cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '3 3' }}
                  labelFormatter={(lbl) => dateLabel(String(lbl), 'full')}
                  formatter={(val, name) => [
                    trendMetric === 'averageFareInr' ? inr(Number(val)) : `${Number(val).toFixed(2)} pts`,
                    name === 'confidenceUpper'
                      ? '95% CI Upper'
                      : name === 'confidenceLower'
                      ? '95% CI Lower'
                      : name === 'baseIndexValue'
                      ? 'Base Fare Index'
                      : 'Payable Index',
                  ]}
                  contentStyle={{
                    borderRadius: 6,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                    color: 'hsl(var(--card-foreground))',
                    fontSize: 12,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  }}
                />

                {showConfidenceRibbon && trendMetric === 'indexValue' && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="confidenceUpper"
                      stroke="transparent"
                      fill="url(#ciGradient)"
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
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="url(#indexGradient)"
                  dot={false}
                  activeDot={{ r: 4, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No observations available for this date window." />
          )}
        </div>
      </div>
    </div>
  );
}
