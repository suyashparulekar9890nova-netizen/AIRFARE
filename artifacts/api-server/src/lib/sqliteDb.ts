import fs from "node:fs";
import path from "node:path";
import { logger } from "./logger";

export interface AuditLogEntry {
  id?: number;
  timestamp: string;
  eventType: "LIVE_SCRAPE" | "ARCHIVE_REPLAY" | "DGCA_CALIBRATION" | "DB_INIT" | "ROLE_ACCESS" | "HYDRATE";
  details: string;
  recordsAffected: number;
  userPersona: string;
}

export interface DbStats {
  engine: string;
  connected: boolean;
  databasePath: string;
  journalMode: string;
  fileSizeBytes: number;
  tableCounts: {
    scrapedQuotes: number;
    dailyHistory: number;
    routeBasket: number;
    auditLogs: number;
  };
  lastAuditLog: AuditLogEntry | null;
}

class SqliteDatabase {
  private db: any = null;
  private dbPath: string;
  private isFallbackMode = false;
  private memoryStore: {
    scrapedQuotes: any[];
    dailyHistory: any[];
    routeBasket: any[];
    auditLogs: AuditLogEntry[];
  } = {
    scrapedQuotes: [],
    dailyHistory: [],
    routeBasket: [],
    auditLogs: [],
  };

  constructor() {
    const cwd = process.cwd();
    const dataDir = cwd.endsWith("api-server")
      ? path.resolve(cwd, "data")
      : path.resolve(cwd, "artifacts/api-server/data");
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (e) {
        logger.warn({ err: e }, "Failed to create data directory, using current directory");
      }
    }
    this.dbPath = path.resolve(dataDir, "airindex.db");
    this.initDatabase();
  }

  private initDatabase() {
    try {
      // Dynamic import / require of node:sqlite
      const { DatabaseSync } = require("node:sqlite");
      this.db = new DatabaseSync(this.dbPath);

      // Enable WAL (Write-Ahead Logging) for high performance and concurrency
      this.db.exec("PRAGMA journal_mode = WAL;");
      this.db.exec("PRAGMA synchronous = NORMAL;");

      // 1. Scraped Quotes Table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS scraped_quotes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          receipt_id TEXT UNIQUE,
          route TEXT,
          city_pair TEXT,
          carrier TEXT,
          flight_number TEXT,
          departure_date TEXT,
          observed_timestamp TEXT,
          source_platform TEXT,
          ip_region_used TEXT,
          base_fare_inr REAL,
          fuel_surcharge_yq_inr REAL,
          udf_inr REAL,
          psf_inr REAL,
          asf_inr REAL,
          gst_inr REAL,
          total_mandatory_payable_inr REAL,
          compliance_status TEXT,
          raw_json TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 2. Daily Index History Table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS daily_index_history (
          date TEXT PRIMARY KEY,
          base_index REAL,
          headline_index REAL,
          weighted_fare_inr REAL,
          fuel_surcharge_contrib_pts REAL,
          taxes_contrib_pts REAL,
          data_quality_score REAL,
          quotes_count INTEGER,
          ci_lower REAL,
          ci_upper REAL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 3. Route Corridor Basket Table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS route_corridor_basket (
          route TEXT PRIMARY KEY,
          city_pair TEXT,
          origin TEXT,
          destination TEXT,
          weight REAL,
          base_fare_inr REAL,
          current_base_fare_inr REAL,
          mandatory_taxes_inr REAL,
          average_fare_inr REAL,
          weekly_change_percent REAL,
          quote_count INTEGER,
          data_quality_score REAL,
          anomaly_status TEXT,
          robust_z_score REAL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 4. System Audit Logs
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS system_audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT,
          event_type TEXT,
          details TEXT,
          records_affected INTEGER,
          user_persona TEXT
        );
      `);

      logger.info({ dbPath: this.dbPath }, "SQLite database initialized with WAL mode");
      this.logAudit("DB_INIT", "SQLite 3.46 schema initialized with WAL journal mode", 0, "SYSTEM");
    } catch (err) {
      logger.error({ err }, "Could not initialize node:sqlite native engine, falling back to structured file store");
      this.isFallbackMode = true;
      this.loadFallbackStore();
    }
  }

  private loadFallbackStore() {
    const jsonPath = path.resolve(path.dirname(this.dbPath), "airindex_store.json");
    if (fs.existsSync(jsonPath)) {
      try {
        const raw = fs.readFileSync(jsonPath, "utf-8");
        this.memoryStore = JSON.parse(raw);
      } catch (e) {
        logger.error({ err: e }, "Failed to read JSON fallback store");
      }
    }
  }

  private persistFallbackStore() {
    if (!this.isFallbackMode) return;
    const jsonPath = path.resolve(path.dirname(this.dbPath), "airindex_store.json");
    try {
      fs.writeFileSync(jsonPath, JSON.stringify(this.memoryStore, null, 2), "utf-8");
    } catch (e) {
      logger.error({ err: e }, "Failed to write JSON fallback store");
    }
  }

  public logAudit(eventType: AuditLogEntry["eventType"], details: string, recordsAffected = 0, userPersona = "SYSTEM") {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      details,
      recordsAffected,
      userPersona,
    };

    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT INTO system_audit_logs (timestamp, event_type, details, records_affected, user_persona)
          VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(entry.timestamp, entry.eventType, entry.details, entry.recordsAffected, entry.userPersona);
      } catch (err) {
        logger.warn({ err }, "Failed to write audit log to sqlite");
      }
    } else {
      this.memoryStore.auditLogs.unshift(entry);
      if (this.memoryStore.auditLogs.length > 500) this.memoryStore.auditLogs.pop();
      this.persistFallbackStore();
    }
  }

  public saveScrapedQuote(receipt: any) {
    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT INTO scraped_quotes (
            receipt_id, route, city_pair, carrier, flight_number,
            departure_date, observed_timestamp, source_platform, ip_region_used,
            base_fare_inr, fuel_surcharge_yq_inr, udf_inr, psf_inr, asf_inr, gst_inr,
            total_mandatory_payable_inr, compliance_status, raw_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(receipt_id) DO UPDATE SET
            total_mandatory_payable_inr = excluded.total_mandatory_payable_inr,
            observed_timestamp = excluded.observed_timestamp
        `);

        stmt.run(
          receipt.receiptId,
          receipt.route,
          receipt.cityPair,
          receipt.carrier,
          receipt.flightNumber,
          receipt.departureDate,
          receipt.observedTimestamp,
          receipt.sourcePlatform,
          receipt.ipRegionUsed || "in-central-mum1",
          receipt.baseFareInr,
          receipt.fuelSurchargeYqInr,
          receipt.userDevelopmentFeeUdfInr,
          receipt.passengerServiceFeePsfInr,
          receipt.aviationSecurityFeeAsfInr,
          receipt.gstInr,
          receipt.totalMandatoryPayableInr,
          receipt.cpiComplianceStatus || "COMPLIANT",
          JSON.stringify(receipt)
        );
      } catch (err) {
        logger.warn({ err, receiptId: receipt.receiptId }, "Failed to upsert quote in sqlite");
      }
    } else {
      const idx = this.memoryStore.scrapedQuotes.findIndex((q) => q.receiptId === receipt.receiptId);
      if (idx >= 0) {
        this.memoryStore.scrapedQuotes[idx] = receipt;
      } else {
        this.memoryStore.scrapedQuotes.unshift(receipt);
      }
      this.persistFallbackStore();
    }
  }

  public saveBatchQuotes(receipts: any[]) {
    if (!receipts || receipts.length === 0) return;
    for (const r of receipts) {
      this.saveScrapedQuote(r);
    }
    this.logAudit("LIVE_SCRAPE", `Batch upsert of ${receipts.length} quotes`, receipts.length, "M2M_PIPELINE");
  }

  public saveDailyIndexPoint(point: any) {
    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT INTO daily_index_history (
            date, base_index, headline_index, weighted_fare_inr,
            fuel_surcharge_contrib_pts, taxes_contrib_pts, data_quality_score,
            quotes_count, ci_lower, ci_upper
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(date) DO UPDATE SET
            base_index = excluded.base_index,
            headline_index = excluded.headline_index,
            weighted_fare_inr = excluded.weighted_fare_inr,
            data_quality_score = excluded.data_quality_score,
            quotes_count = excluded.quotes_count
        `);

        stmt.run(
          point.date,
          point.baseIndex,
          point.headlineIndex,
          point.weightedFareInr,
          point.fuelSurchargeContribPts || 6.8,
          point.taxesContribPts || 4.2,
          point.dataQualityScore,
          point.quotesCount,
          point.ciLower || point.headlineIndex - 1.2,
          point.ciUpper || point.headlineIndex + 1.2
        );
      } catch (err) {
        logger.warn({ err, date: point.date }, "Failed to upsert daily index point in sqlite");
      }
    } else {
      const idx = this.memoryStore.dailyHistory.findIndex((h) => h.date === point.date);
      if (idx >= 0) {
        this.memoryStore.dailyHistory[idx] = point;
      } else {
        this.memoryStore.dailyHistory.push(point);
      }
      this.persistFallbackStore();
    }
  }

  public saveRouteBasket(routes: any[]) {
    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT INTO route_corridor_basket (
            route, city_pair, origin, destination, weight,
            base_fare_inr, current_base_fare_inr, mandatory_taxes_inr,
            average_fare_inr, weekly_change_percent, quote_count,
            data_quality_score, anomaly_status, robust_z_score
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(route) DO UPDATE SET
            average_fare_inr = excluded.average_fare_inr,
            current_base_fare_inr = excluded.current_base_fare_inr,
            quote_count = excluded.quote_count,
            robust_z_score = excluded.robust_z_score
        `);

        for (const item of routes) {
          stmt.run(
            item.route,
            item.cityPair,
            item.origin,
            item.destination,
            item.weight,
            item.baseFareInr,
            item.currentBaseFareInr,
            item.mandatoryTaxesInr,
            item.averageFareInr,
            item.weeklyChangePercent,
            item.quoteCount,
            item.dataQualityScore,
            item.anomalyStatus,
            item.robustZScore
          );
        }
      } catch (err) {
        logger.warn({ err }, "Failed to update route basket in sqlite");
      }
    } else {
      this.memoryStore.routeBasket = routes;
      this.persistFallbackStore();
    }
  }

  public getDbStats(): DbStats {
    let fileSizeBytes = 0;
    try {
      if (fs.existsSync(this.dbPath)) {
        const stat = fs.statSync(this.dbPath);
        fileSizeBytes = stat.size;
      }
    } catch {}

    const tableCounts = {
      scrapedQuotes: 0,
      dailyHistory: 0,
      routeBasket: 0,
      auditLogs: 0,
    };

    let lastAudit: AuditLogEntry | null = null;

    if (this.db) {
      try {
        const qCount = this.db.prepare("SELECT COUNT(*) as count FROM scraped_quotes").get() as any;
        const hCount = this.db.prepare("SELECT COUNT(*) as count FROM daily_index_history").get() as any;
        const rCount = this.db.prepare("SELECT COUNT(*) as count FROM route_corridor_basket").get() as any;
        const aCount = this.db.prepare("SELECT COUNT(*) as count FROM system_audit_logs").get() as any;

        tableCounts.scrapedQuotes = qCount?.count || 0;
        tableCounts.dailyHistory = hCount?.count || 0;
        tableCounts.routeBasket = rCount?.count || 0;
        tableCounts.auditLogs = aCount?.count || 0;

        const lastRow = this.db.prepare("SELECT * FROM system_audit_logs ORDER BY id DESC LIMIT 1").get() as any;
        if (lastRow) {
          lastAudit = {
            id: lastRow.id,
            timestamp: lastRow.timestamp,
            eventType: lastRow.event_type,
            details: lastRow.details,
            recordsAffected: lastRow.records_affected,
            userPersona: lastRow.user_persona,
          };
        }
      } catch (err) {
        logger.warn({ err }, "Error reading table counts from sqlite");
      }
    } else {
      tableCounts.scrapedQuotes = this.memoryStore.scrapedQuotes.length;
      tableCounts.dailyHistory = this.memoryStore.dailyHistory.length;
      tableCounts.routeBasket = this.memoryStore.routeBasket.length;
      tableCounts.auditLogs = this.memoryStore.auditLogs.length;
      lastAudit = this.memoryStore.auditLogs[0] || null;
    }

    return {
      engine: this.db ? "SQLite 3.46 (Embedded ACID Store, node:sqlite)" : "Structured JSON Snapshot Store",
      connected: true,
      databasePath: this.dbPath,
      journalMode: this.db ? "WAL (Write-Ahead Logging)" : "Synchronous File",
      fileSizeBytes,
      tableCounts,
      lastAuditLog: lastAudit,
    };
  }

  public getRecentAuditLogs(limit = 20): AuditLogEntry[] {
    if (this.db) {
      try {
        const rows = this.db.prepare(`
          SELECT * FROM system_audit_logs ORDER BY id DESC LIMIT ?
        `).all(limit) as any[];

        return rows.map((r) => ({
          id: r.id,
          timestamp: r.timestamp,
          eventType: r.event_type,
          details: r.details,
          recordsAffected: r.records_affected,
          userPersona: r.user_persona,
        }));
      } catch {
        return [];
      }
    }
    return this.memoryStore.auditLogs.slice(0, limit);
  }
}

export const sqliteDb = new SqliteDatabase();
