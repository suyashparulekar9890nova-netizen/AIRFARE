AIRFARE PRICE INDEX — EDITABLE SOURCE

This archive contains the workspace source code and configuration. The dashboard is in:
  artifacts/airfare-index/
The synthetic airfare API is in:
  artifacts/api-server/src/routes/airfare.ts
Shared API schemas and generated clients are under:
  lib/api-spec/, lib/api-zod/, lib/api-client-react/

The displayed fares and index values are synthetic demonstration data. No live airline/OTA source or verified DGCA back-test is connected.

To edit and build, use Node.js 24 and pnpm. From the workspace root:
  pnpm install
  pnpm run typecheck
  PORT=4174 BASE_PATH=/ pnpm --filter @workspace/airfare-index run dev

The API server is a separate service and requires PORT, for example:
  PORT=5000 pnpm --filter @workspace/api-server run dev

Replit preview uses the project's configured workflows and artifact routing. Outside Replit, configure the frontend's /api requests to reach the API server (for example, with a local development proxy).

This source archive intentionally excludes installed dependencies, generated build output, local caches, git history, and environment/secret files.
