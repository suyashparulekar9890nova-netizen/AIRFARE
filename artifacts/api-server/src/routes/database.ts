import { Router, type IRouter } from "express";
import { sqliteDb } from "../lib/sqliteDb";
import { fareStore } from "../lib/fareStore";

const router: IRouter = Router();

// GET /api/database/status - Returns SQLite engine status, table counts, file size & WAL journal mode
router.get("/database/status", (_req, res) => {
  const stats = sqliteDb.getDbStats();
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    ...stats,
  });
});

// GET /api/database/logs - Returns system audit trail
router.get("/database/logs", (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 25;
  const logs = sqliteDb.getRecentAuditLogs(Math.min(limit, 100));
  res.json({
    count: logs.length,
    logs,
  });
});

// POST /api/database/audit - Record an RBAC / user action into the immutable audit trail
router.post("/database/audit", (req, res) => {
  const { eventType = "ROLE_ACCESS", details = "User interaction", recordsAffected = 0, userPersona = "CITIZEN" } = req.body || {};
  sqliteDb.logAudit(eventType, details, recordsAffected, userPersona);
  res.json({
    success: true,
    message: "Audit event recorded to SQLite database",
    recordedAt: new Date().toISOString(),
  });
});

export default router;
