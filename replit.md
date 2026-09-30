# Airfare Price Index

An interactive prototype dashboard for exploring a transparent, route-level airfare price index for domestic travel in India.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/airfare-index run dev` — run the dashboard
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Dashboard values are generated synthetic demonstration data. No database or fare source is connected.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/airfare-index/` — interactive dashboard and its visual system.
- `artifacts/api-server/src/routes/airfare.ts` — illustrative index snapshot, route basket, and advance-purchase sample series.
- `lib/api-spec/openapi.yaml` — source of truth for the dashboard API contract.
- `lib/api-client-react/` and `lib/api-zod/` — generated API client and response validation.

## Architecture decisions

- Keep index values and fare observations explicitly marked as synthetic until a reviewed source feed is connected.
- Serve dashboard values through the shared API server and validate responses against generated OpenAPI schemas.
- Keep the first prototype read-only; it does not persist scraped fare quotes or claim a historical back-test.

## Product

- National index snapshot and trend with daily, weekly, and monthly movement.
- Representative domestic city-pair indicators and average fares by advance-purchase window.
- Searchable route view, chart exports, printable view, refresh controls, dark mode, and visible methodology and limitations.

## User preferences

_No additional preferences recorded._

## Gotchas

- Do not present synthetic values as observed fares or official MoSPI/NSO/RBI statistics.
- Before adding collection, review each source's terms and robots.txt, rate-limit appropriately, and distinguish fare, tax, and fee fields.
- The prototype has no verified DGCA back-test data; do not imply back-testing until a documented dataset and method are added.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
