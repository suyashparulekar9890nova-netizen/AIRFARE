import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'wouter';
import { usePersona, PERSONAS, PersonaType } from '@/lib/personaContext';
import {
  ChevronDown,
  Check,
  Shield,
  Database,
  ArrowRight,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface DbStatusResponse {
  engine: string;
  connected: boolean;
  journalMode: string;
  tableCounts: {
    scrapedQuotes: number;
    dailyHistory: number;
    routeBasket: number;
    auditLogs: number;
  };
}

export function PersonaSwitcher() {
  const { persona, setPersona, metadata } = usePersona();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const CurrentIcon = metadata.icon;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-card/80 hover:bg-card hover:border-primary/40 text-xs font-medium text-foreground transition-all shadow-xs"
        aria-label="Switch Institutional Persona"
        title="1-Click Institutional Persona Switcher"
      >
        <span className="flex h-2 w-2 relative">
          <span className={`inline-flex rounded-full h-2 w-2 ${
            persona === 'citizen' ? 'bg-amber-500' : persona === 'rbi' ? 'bg-indigo-500' : 'bg-emerald-500'
          }`} />
        </span>
        <CurrentIcon size={14} className="text-muted-foreground" />
        <span className="font-semibold tracking-tight text-foreground hidden sm:inline">{metadata.shortLabel}</span>
        <span className="sm:hidden text-foreground">{metadata.shortLabel.split(' ')[0]}</span>
        <ChevronDown size={13} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 rounded-xl bg-card border border-border shadow-xl z-50 p-2 text-left">
          <div className="px-3 py-2 border-b border-border/80 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Institutional Perspective
            </span>
            <span className="text-[10px] text-primary font-mono flex items-center gap-1 font-medium">
              <Shield size={10} /> Zero-Wall RBAC
            </span>
          </div>

          <div className="space-y-1 py-1.5">
            {(Object.keys(PERSONAS) as PersonaType[]).map((key) => {
              const p = PERSONAS[key];
              const Icon = p.icon;
              const isSelected = key === persona;

              return (
                <button
                  key={key}
                  onClick={() => {
                    setPersona(key);
                    setOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors ${
                    isSelected
                      ? 'bg-muted/80 border border-border'
                      : 'hover:bg-muted/40 border border-transparent'
                  }`}
                >
                  <div className={`p-2 rounded-md shrink-0 mt-0.5 ${
                    isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Icon size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {p.label}
                      </span>
                      {isSelected && <Check size={14} className="text-primary" />}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {p.department}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2 px-3 pb-1 border-t border-border/80 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <Database size={11} className="text-emerald-500" />
              <span>SQLite 3.46 WAL Connected</span>
            </span>
            <span>SIH26056</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function PersonaBanner() {
  const { metadata, persona } = usePersona();
  const Icon = metadata.icon;

  const dbQuery = useQuery<DbStatusResponse>({
    queryKey: ['dbStatus'],
    queryFn: async () => {
      const res = await fetch('/api/database/status');
      return res.json();
    },
    refetchInterval: 30000,
  });

  return (
    <div className="rounded-xl border border-border/70 bg-card/40 backdrop-blur-xs px-3.5 py-2.5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs">
      {/* Institutional Mission */}
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-md shrink-0 ${
          persona === 'citizen'
            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
            : persona === 'rbi'
            ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
            : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
        }`}>
          <Icon size={15} />
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
          <span className="font-semibold text-foreground tracking-tight">
            {metadata.shortLabel}
          </span>
          <span className="text-muted-foreground/60 hidden sm:inline">·</span>
          <span className="text-muted-foreground text-[11px] truncate max-w-xl">
            {metadata.tagline}
          </span>
        </div>
      </div>

      {/* Database Status & Quick Action */}
      <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
        {dbQuery.data?.connected && (
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground px-2 py-0.5 rounded-md bg-muted/30 border border-border/50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>SQLite WAL · {dbQuery.data.tableCounts.scrapedQuotes} quotes</span>
          </div>
        )}

        <Link
          href={metadata.suggestedAction.path}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline transition-all"
        >
          <span>{metadata.suggestedAction.label}</span>
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
