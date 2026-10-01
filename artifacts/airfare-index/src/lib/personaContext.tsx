import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Building2, Landmark, LucideIcon } from 'lucide-react';

export type PersonaType = 'citizen' | 'mospi' | 'rbi';

export interface PersonaMetadata {
  id: PersonaType;
  label: string;
  shortLabel: string;
  department: string;
  icon: LucideIcon;
  themeColor: string;
  badgeBg: string;
  borderColor: string;
  accentText: string;
  tagline: string;
  description: string;
  primaryMetric: string;
  primaryMetricValue: string;
  suggestedAction: {
    label: string;
    path: string;
  };
}

export const PERSONAS: Record<PersonaType, PersonaMetadata> = {
  citizen: {
    id: 'citizen',
    label: 'Public Citizen / Passenger',
    shortLabel: 'Citizen',
    department: 'Consumer Transparency Portal',
    icon: User,
    themeColor: 'from-amber-500/20 to-orange-500/10',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    borderColor: 'border-amber-500/30',
    accentText: 'text-amber-400',
    tagline: 'Consumer Transparency & Fair Pricing Tracker',
    description:
      'Clear, unbundled price insights for everyday air travelers. See why your ticket costs what it does, explore fare trends, and discover when to book.',
    primaryMetric: 'Average Domestic Fare',
    primaryMetricValue: '₹6,425',
    suggestedAction: {
      label: 'Explore Unbundled Taxes',
      path: '/receipts',
    },
  },
  mospi: {
    id: 'mospi',
    label: 'MoSPI NSO Statistical Officer',
    shortLabel: 'MoSPI Officer',
    department: 'National Statistical Office (Price Statistics Division)',
    icon: Building2,
    themeColor: 'from-emerald-500/20 to-teal-500/10',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    borderColor: 'border-emerald-500/30',
    accentText: 'text-emerald-400',
    tagline: 'Official Airfare Price Index (CPI Augmentation Pipeline · Problem 13)',
    description:
      'Audit-grade index calculation using Chained Jevons, 5-horizon Advance Booking Window (ABW) matrix weights, and DGCA monthly passenger yield calibration.',
    primaryMetric: 'Jevons Index (2024=100)',
    primaryMetricValue: '110.8 (±0.8 CI)',
    suggestedAction: {
      label: 'Inspect Ingestion & Archive',
      path: '/scraper',
    },
  },
  rbi: {
    id: 'rbi',
    label: 'RBI Monetary Policy Analyst',
    shortLabel: 'RBI Analyst',
    department: 'Department of Economic and Policy Research (DEPR)',
    icon: Landmark,
    themeColor: 'from-indigo-500/20 to-violet-500/10',
    badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    borderColor: 'border-indigo-500/30',
    accentText: 'text-indigo-400',
    tagline: 'High-Frequency Inflation Nowcasting & Macroeconomic Intelligence',
    description:
      'Real-time transport services inflation telemetry for Monetary Policy Committee (MPC) nowcasting, core inflation contribution, and automated M2M SDMX streams.',
    primaryMetric: 'Core Transport Contribution',
    primaryMetricValue: '+38 bps YoY',
    suggestedAction: {
      label: 'Open RBI M2M SDMX Feeds',
      path: '/m2m-api',
    },
  },
};

interface PersonaContextValue {
  persona: PersonaType;
  setPersona: (p: PersonaType) => void;
  metadata: PersonaMetadata;
  canTriggerScraper: boolean;
  canCalibrateDgca: boolean;
  canExportSdmx: boolean;
}

const PersonaContext = createContext<PersonaContextValue | undefined>(undefined);

export function PersonaProvider({ children }: { children: React.ReactNode }) {
  // Default to MoSPI Officer for hackathon / competition pitch
  const [persona, setPersonaState] = useState<PersonaType>(() => {
    const saved = localStorage.getItem('airindex_active_persona');
    if (saved === 'citizen' || saved === 'mospi' || saved === 'rbi') {
      return saved;
    }
    return 'mospi';
  });

  const setPersona = (newPersona: PersonaType) => {
    setPersonaState(newPersona);
    localStorage.setItem('airindex_active_persona', newPersona);

    // Record audit event to SQLite backend
    try {
      fetch('/api/database/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'ROLE_ACCESS',
          details: `User switched active persona to ${PERSONAS[newPersona].label}`,
          recordsAffected: 1,
          userPersona: newPersona.toUpperCase(),
        }),
      }).catch(() => {});
    } catch {}
  };

  const metadata = PERSONAS[persona];
  const canTriggerScraper = persona === 'mospi';
  const canCalibrateDgca = persona === 'mospi';
  const canExportSdmx = persona === 'mospi' || persona === 'rbi';

  return (
    <PersonaContext.Provider
      value={{
        persona,
        setPersona,
        metadata,
        canTriggerScraper,
        canCalibrateDgca,
        canExportSdmx,
      }}
    >
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona() {
  const context = useContext(PersonaContext);
  if (!context) {
    throw new Error('usePersona must be used within a PersonaProvider');
  }
  return context;
}
