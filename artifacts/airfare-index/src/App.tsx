import { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useGetAirfareLeadTime,
  useGetAirfareOverview,
  useGetAirfareRoutes,
  useGetDgcaValidation,
} from '@workspace/api-client-react';
import { Link, Route, Switch, useLocation } from 'wouter';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  Cpu,
  FileText,
  Layers,
  LayoutGrid,
  Menu,
  Moon,
  Network,
  Receipt,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import OverviewPage from '@/pages/OverviewPage';
import DgcaPage from '@/pages/DgcaPage';
import RoutesPage from '@/pages/RoutesPage';
import HeatmapPage from '@/pages/HeatmapPage';
import LeadTimePage from '@/pages/LeadTimePage';
import MethodologyPage from '@/pages/MethodologyPage';
import ScraperPage from '@/pages/ScraperPage';
import ReceiptsPage from '@/pages/ReceiptsPage';
import M2mApiPage from '@/pages/M2mApiPage';
import NotFound from '@/pages/not-found';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const NAV_ITEMS = [
  { path: '/', label: 'Index Overview', icon: BarChart3, step: '01' },
  { path: '/dgca', label: 'DGCA Back-Testing', icon: Scale, step: '02' },
  { path: '/routes', label: 'Corridor Basket', icon: Layers, step: '03' },
  { path: '/heatmap', label: 'Fare Heatmap', icon: LayoutGrid, step: '04' },
  { path: '/leadtime', label: 'Advance Booking', icon: Activity, step: '05' },
  { path: '/methodology', label: 'Methodology & Audit', icon: FileText, step: '06' },
  { path: '/scraper', label: 'Scraping & Anti-Bot', icon: Cpu, step: '07' },
  { path: '/receipts', label: 'Unbundled Receipts', icon: Receipt, step: '08' },
  { path: '/m2m-api', label: 'MoSPI & RBI M2M API', icon: Network, step: '09' },
];

const INTERVAL_OPTIONS = [
  { label: 'Every 5 min', ms: 5 * 60 * 1000 },
  { label: 'Every 15 min', ms: 15 * 60 * 1000 },
  { label: 'Every 1 hour', ms: 60 * 60 * 1000 },
];

function AppLayout() {
  const [location, setLocation] = useLocation();
  const [isDark, setIsDark] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedIntervalMs, setSelectedIntervalMs] = useState(5 * 60 * 1000);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const overviewQuery = useGetAirfareOverview();
  const routesQuery = useGetAirfareRoutes();
  const leadTimeQuery = useGetAirfareLeadTime();
  const dgcaQuery = useGetDgcaValidation();

  const isFetching =
    overviewQuery.isFetching ||
    routesQuery.isFetching ||
    leadTimeQuery.isFetching ||
    dgcaQuery.isFetching;

  const currentNav = NAV_ITEMS.find((item) =>
    item.path === '/' ? location === '/' : location.startsWith(item.path),
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    if (isFetching) {
      setIsSpinning(true);
      return;
    }
    const timeout = window.setTimeout(() => setIsSpinning(false), 600);
    return () => window.clearTimeout(timeout);
  }, [isFetching]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close drawer on navigation
  const handleNavigate = (path: string) => {
    setLocation(path);
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const refreshAll = () => {
    void Promise.all([
      overviewQuery.refetch(),
      routesQuery.refetch(),
      leadTimeQuery.refetch(),
      dgcaQuery.refetch(),
    ]);
  };

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(refreshAll, Math.max(selectedIntervalMs, 5 * 60 * 1000));
    return () => window.clearInterval(interval);
  }, [autoRefresh, selectedIntervalMs]);

  return (
    <div className="app-shell min-h-[100dvh]">
      {/* Mobile Drawer Backdrop */}
      {drawerOpen && (
        <div
          className="drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-out Navigation Drawer (Burger Menu) */}
      <aside className={`nav-drawer ${drawerOpen ? 'open' : ''}`} aria-label="Mobile Navigation">
        <div className="drawer-header">
          <div className="brand-lockup">
            <span className="brand-symbol">
              <span />
              <span />
              <span />
            </span>
            <span className="brand-name">
              AirIndex<span>·Trust</span>
            </span>
          </div>
          <button
            className="drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="nav-caption">SEPARATE PAGES</div>
        <nav className="side-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/' ? location === '/' : location.startsWith(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => {
                  setDrawerOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`nav-link text-left w-full flex items-center ${isActive ? 'active' : ''}`}
              >
                <span className="nav-mark" />
                <Icon size={16} />
                <span className="flex-1">{item.label}</span>
                <span className="text-[10px] font-mono opacity-50">{item.step}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/10">
          <div className="text-xs text-muted-foreground">
            <p className="font-semibold text-white/80">SIH26056 Pilot</p>
            <p className="text-[11px] mt-0.5 opacity-70">
              Auditable airfare price index for CPI augmentation.
            </p>
          </div>
        </div>
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside className="sidebar print-hidden hidden md:flex overflow-y-auto">
        <Link
          href="/"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="brand-lockup cursor-pointer"
        >
          <span className="brand-symbol">
            <span />
            <span />
            <span />
          </span>
          <span className="brand-name">
            AirIndex<span>·Trust</span>
          </span>
        </Link>
        <div className="sidebar-rule" />
        <div className="nav-caption">NAVIGATION</div>
        <nav className="side-nav" aria-label="Dashboard sections">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/' ? location === '/' : location.startsWith(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => {
                  setDrawerOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`nav-link text-left w-full flex items-center ${isActive ? 'active' : ''}`}
              >
                <span className="nav-mark" />
                <Icon size={16} />
                <span className="flex-1">{item.label}</span>
                <span className="text-[10px] font-mono opacity-50">{item.step}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-note">
          <span className="note-index">SIH26056</span>
          <p>Transparent, auditable airfare price index for CPI augmentation.</p>
        </div>
        <div className="sidebar-foot">
          <span className="status-dot" />
          <span>Audit-Grade Pipeline</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main id="top" className="main-content">
        <header className="topbar">
          <div className="flex items-center gap-2">
            {/* Burger Menu Button (accessible on all screens) */}
            <button
              className="burger-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              title="Open menu"
            >
              <Menu size={18} />
            </button>

            <div className="breadcrumb">
              <span className="hidden sm:inline">MoSPI / CPI</span>
              <span className="crumb-divider hidden sm:inline">/</span>
              <span>Airfare Price Index</span>
              <span className="crumb-divider">/</span>
              <strong>{currentNav?.label ?? 'Page'}</strong>
            </div>
          </div>

          <div className="topbar-meta">
            <Link
              href="/methodology"
              className="env-pill hover:opacity-90 transition-opacity cursor-pointer hidden sm:flex items-center gap-1.5"
            >
              <ShieldCheck size={13} className="text-teal-500" />
              <span>Grade A+ (95.8)</span>
            </Link>

            <div className="header-actions print-hidden">
              <div className="refresh-anchor" ref={dropdownRef}>
                <div className="split-refresh">
                  <button onClick={refreshAll} disabled={isFetching} className="refresh-main">
                    <RefreshCw className={isSpinning ? 'spinning' : ''} size={15} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  <span className="refresh-separator" />
                  <button
                    onClick={() => setDropdownOpen((open) => !open)}
                    className="refresh-menu"
                    aria-label="Refresh settings"
                    aria-expanded={dropdownOpen}
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                {dropdownOpen && (
                  <div className="refresh-dropdown">
                    <div className="dropdown-label">AUTOMATIC UPDATES</div>
                    <button
                      className="auto-row"
                      onClick={() => setAutoRefresh((value) => !value)}
                    >
                      <span>
                        <strong>Auto-refresh</strong>
                        <small>Off by default</small>
                      </span>
                      <span className={`toggle ${autoRefresh ? 'toggle-on' : ''}`}>
                        <span />
                      </span>
                    </button>
                    <div className="dropdown-label interval-label">
                      INTERVAL <span>5 min minimum</span>
                    </div>
                    {INTERVAL_OPTIONS.map((option) => (
                      <button
                        key={option.ms}
                        className={`interval-row ${selectedIntervalMs === option.ms ? 'selected' : ''}`}
                        onClick={() => setSelectedIntervalMs(option.ms)}
                      >
                        <span>{option.label}</span>
                        {selectedIntervalMs === option.ms && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => window.print()}
                className="header-icon"
                aria-label="Export as PDF"
                title="Print or save as PDF"
              >
                <FileText size={16} />
              </button>

              <button
                onClick={() => setIsDark((dark) => !dark)}
                className="header-icon"
                aria-label="Toggle dark mode"
                title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>
        </header>

        <div className="content-wrap">
          <ErrorBoundary resetKey={location}>
            <Switch>
              <Route path="/" component={OverviewPage} />
              <Route path="/dgca" component={DgcaPage} />
              <Route path="/routes" component={RoutesPage} />
              <Route path="/heatmap" component={HeatmapPage} />
              <Route path="/leadtime" component={LeadTimePage} />
              <Route path="/methodology" component={MethodologyPage} />
              <Route path="/scraper" component={ScraperPage} />
              <Route path="/receipts" component={ReceiptsPage} />
              <Route path="/m2m-api" component={M2mApiPage} />
              <Route component={NotFound} />
            </Switch>
          </ErrorBoundary>

          <footer className="page-footer mt-12 pt-6 border-t">
            <div className="footer-brand">
              <span className="brand-symbol small">
                <span />
                <span />
                <span />
              </span>{' '}
              AirIndex-Trust <span className="footer-separator">/</span> SIH26056 Prototype
            </div>
            <span className="footer-disclaimer">
              Built for Ministry of Statistics and Programme Implementation (MoSPI) · Problem 13
            </span>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="back-top flex items-center gap-1 hover:text-primary transition-colors"
            >
              Back to top <ArrowUpRight size={14} />
            </button>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppLayout />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}