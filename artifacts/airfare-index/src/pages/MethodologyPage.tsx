import { AlertTriangle, CheckCircle2, FileText, Info, Layers, Scale, ShieldCheck } from 'lucide-react';

export default function MethodologyPage() {
  return (
    <div className="space-y-6">
      {/* Page Title & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-primary">
            <FileText size={15} /> Section 06 · Mathematical & Statistical Audit
          </div>
          <h2 className="text-2xl font-bold tracking-tight mt-1">Methodology, Formulations & Governance</h2>
          <p className="text-sm text-muted-foreground">
            Complete mathematical specification, anomaly filtering rules, data quality grading, and MoSPI CPI integration blueprint.
          </p>
        </div>
      </div>

      {/* Scope Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="metric-card p-3">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Route Scope</span>
          <div className="text-lg font-bold mt-1">12 Top Corridors</div>
          <p className="text-[11px] text-muted-foreground">Covers 62% of domestic passenger volume</p>
        </div>
        <div className="metric-card p-3">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Weighting Standard</span>
          <div className="text-lg font-bold mt-1">DGCA Volume Weights</div>
          <p className="text-[11px] text-muted-foreground">Calibrated against annual city-pair statistics</p>
        </div>
        <div className="metric-card p-3">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Lead Windows</span>
          <div className="text-lg font-bold mt-1">5 Sampling Windows</div>
          <p className="text-[11px] text-muted-foreground">T+1, T+7, T+15, T+30, T+45 days</p>
        </div>
        <div className="metric-card p-3">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Anomaly Engine</span>
          <div className="text-lg font-bold mt-1">Robust MAD Z-Score</div>
          <p className="text-[11px] text-muted-foreground">Resistant to scrapers/glitches (z &gt; 2.0)</p>
        </div>
      </div>

      {/* Mathematical Formulations */}
      <div className="space-y-4">
        <div className="formula-card">
          <h4 className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Scale size={18} className="text-primary" /> 1. Laspeyres Aggregation Formula
          </h4>
          <div className="formula-box text-sm">
            I_t = 100 × ∑ ( w_r × [ P_r,t / P_r,0 ] ), where ∑ w_r = 1.000
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Where <code>w_r</code> is the relative passenger traffic weight of route <code>r</code> derived from official DGCA annual city-pair passenger records, <code>P_r,t</code> is the representative average payable fare on route <code>r</code> at time <code>t</code>, and <code>P_r,0</code> is the declared base-period benchmark fare.
          </p>
          <div className="mt-2 text-xs font-semibold text-primary">
            Route Contribution Equation: ΔI_r = w_r × (I_r,t - 100)
          </div>
        </div>

        <div className="formula-card">
          <h4 className="text-base font-semibold flex items-center gap-2 text-foreground">
            <AlertTriangle size={18} className="text-amber-500" /> 2. Robust Median Absolute Deviation (MAD) Anomaly Filter
          </h4>
          <div className="formula-box text-sm">
            z_i = [ x_i - median(x) ] / [ 1.4826 × MAD(x) ]
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Standard deviation methods suffer from breakdown points as low as a single extreme outlier. Using the Median Absolute Deviation ensures robust detection of festival price spikes and flash surges without contaminating the baseline inflation signal. An observation with <code>|z_i| &gt; 2.0</code> triggers a volatility flag; <code>|z_i| &gt; 3.0</code> is isolated for automated secondary verification.
          </p>
        </div>

        <div className="formula-card">
          <h4 className="text-base font-semibold flex items-center gap-2 text-foreground">
            <ShieldCheck size={18} className="text-teal-600" /> 3. Data Quality Score & Audit Protocol
          </h4>
          <div className="formula-box text-sm">
            DQI = 100 - [ 10 × (N_imputed / N_total) + 20 × (N_stale / N_total) + 15 × (1 - Coverage) ]
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Every index snapshot is accompanied by a transparent Data Quality Index (DQI). This prevents black-box indexing and guarantees that policy analysts at MoSPI, NSO, and RBI know exactly what percentage of input data was observed versus statistically imputed.
          </p>
        </div>

        <div className="formula-card">
          <h4 className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Layers size={18} className="text-purple-600" /> 4. CPI Augmentation & Integration Flow
          </h4>
          <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              In the revised Indian CPI framework, air travel represents a volatile sub-component of the Transport &amp; Communication group. Instead of relying on monthly manual price collections, AirIndex-Trust supplies a continuous, multi-source, daily Laspeyres index feed that can be integrated into the official CPI calculation via:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2 text-foreground font-medium">
              <li>High-frequency geometric mean aggregation for monthly release reconciliation.</li>
              <li>Dual reporting of pure carrier base tariffs versus statutory tax-adjusted payable fares.</li>
              <li>Back-tested calibration against monthly DGCA tariff publications ensuring long-term cointegration.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
