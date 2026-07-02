# CLAUDE.md

Guidance for working in the **puerto-shirts** monorepo (aka *Camisas del Puerto*): a
small inventory & sales system for a football-shirt reseller. Spanish domain language
throughout (lotes, maletas, camisetas, ventas). Read `DEPLOYMENT.md` for the full
infra/CI story — this file is about the code and the day-to-day workflow.

## What the app does

A reseller buys football shirts in **lotes** (purchase batches from a **proveedor**),
stores them in **maletas** (suitcases/bins), and sells them. Core flow:

- **Lote** — a purchase from a supplier (`fecha`, `tipoCompra` contado/crédito, `costoTotal`).
- **Inventario** — one row per (camiseta, lote, maleta, talla) with `costoUnidad`,
  `precioVenta`, `cantidadDisponible`. Stock enters via `inventario/ingreso`, moves
  between maletas via `inventario/traslado`, leaves via `inventario/venta`.
- **Kardex** — append-only ledger of every movement (entrada / venta / traslado).
- **Ventas / venta_detalles** — sales headers + line items, carrying `utilidad` (profit).
- **Reportes** — daily sales aggregation (with utilidad); **Dashboard** — summary cards.

## Repo layout (pnpm workspace)

```
artifacts/
  api-server/            Express API → AWS Lambda (serverless-http). The backend.
  camisas-del-puerto/    React SPA (Vite + wouter + TanStack Query + Tailwind + shadcn/ui). The frontend.
  mockup-sandbox/        Throwaway design sandbox.
lib/
  db/                    Drizzle schema + migrations (@workspace/db). Postgres (Supabase).
  api-spec/              openapi.yaml — the API contract + orval codegen config.
  api-zod/               GENERATED zod schemas from the spec (@workspace/api-zod).
  api-client-react/      GENERATED TanStack Query hooks from the spec (@workspace/api-client-react).
  object-storage-web/    FE upload helper against the presigned-URL flow.
scripts/                 gen_api_template.py, generate-swagger-spec.cjs, pipeline-*.sh
swagger/                 puerto-shirts.json — GENERATED from route JSDoc; feeds API Gateway.
cloudformation/, deploys/, api-gateway/, secrets/  — infra (see DEPLOYMENT.md).
```

Package manager is **pnpm only** (a `preinstall` guard rejects npm/yarn). Node ESM.

## The API contract flow (important)

There are **two** OpenAPI documents and they are generated differently — keep both in sync
when you add or change an endpoint:

1. **`lib/api-spec/openapi.yaml`** — the hand-written source of truth for **codegen**.
   `orval` reads it and regenerates `api-zod` (request/response zod) and
   `api-client-react` (hooks). The BE validates request bodies with the generated zod
   (`@workspace/api-zod`); the FE calls the generated hooks (`useListLotes`, etc.).
2. **`swagger/puerto-shirts.json`** — generated from the `@swagger` JSDoc blocks in the
   route files by `scripts/generate-swagger-spec.cjs`. It feeds the **API Gateway**
   template (`scripts/gen_api_template.py`) and the Lambda's `/api-docs`.

**When you add/modify an endpoint:**
1. Add the route in `artifacts/api-server/src/routes/*` (+ its `@swagger` JSDoc).
2. Add matching request/response schemas + paths in `lib/api-spec/openapi.yaml`.
3. Regenerate the client/zod: `pnpm --filter @workspace/api-spec run codegen`.
4. Regenerate the swagger + API Gateway artifacts:
   `node scripts/generate-swagger-spec.cjs` (and `--dist` for the bundled copy).
5. Use the new generated hook on the FE; validate with the new zod on the BE.

Do **not** hand-edit anything under `generated/` in `api-zod` / `api-client-react`.

## Backend conventions (`artifacts/api-server`)

- App assembly lives in `config/ExpressAppConfig.ts`; `index.ts` is the local entry,
  `lambda.ts` is the serverless-http handler. SSM config + DB init happen inside a
  readiness gate, so both entries share one assembly.
- Routes are thin Express routers under `src/routes`, registered in `routes/index.ts`.
- Numbers from Postgres `numeric` come back as **strings** — convert with `num()` from
  `src/lib/http.ts` before doing math or returning JSON. Money is `numeric(12,2)`.
- Validate every body with the generated zod (`safeParse`) and return `422` on failure.
- DB access is Drizzle via `db` from `@workspace/db`. Use `db.transaction()` for
  multi-table writes (see `inventario/venta`), and guard stock with
  `gte(cantidadDisponible, n)` in the `WHERE` so decrements are atomic.
- Every stock change must also append a `kardex` row.
- S3 uploads use the **presigned-PUT** pattern (`lib/objectStorage.ts`): the client asks
  for a URL, PUTs straight to S3, then references the public CloudFront URL. The API never
  streams file bytes. Env: `UPLOADS_BUCKET`, `PUBLIC_ASSET_BASE_URL`.
- Logging is `pino` via `req.log`.

## Frontend conventions (`artifacts/camisas-del-puerto`)

- Routing: `wouter` in `src/App.tsx`. Pages in `src/pages`, one per domain area.
- Data: generated TanStack Query hooks from `@workspace/api-client-react`. After a
  mutation, `queryClient.invalidateQueries()` to refresh.
- UI: shadcn/ui components under `src/components/ui`, Tailwind, dark mode forced.
- Use `useConfirm()` (`components/confirm-dialog`) for destructive confirms and `useToast()`
  for feedback. Format money/dates with helpers in `src/lib/format` (`money`, `fmtDate`).
- Spanish UI copy.

## Database (`lib/db`)

- Drizzle schema in `lib/db/src/schema/*` (one file per table, barrel in `index.ts`),
  SQL in `lib/db/migrations/`. Tables: equipos, camisetas, maletas, lotes, proveedores,
  inventario, kardex, ventas, venta_detalles.
- Supabase Postgres via the **transaction pooler** (`:6543`) — `postgres-js` runs with
  `prepare:false` (required for the pooler).
- Push schema changes: `DATABASE_URL=… pnpm --filter @workspace/db exec drizzle-kit push --force`.
- Local dev: put `DATABASE_URL` (or `DATABASE_*`) in a gitignored `.env` — no AWS calls.

## Common commands

```bash
pnpm install                                          # workspace install (pnpm only)
pnpm --filter @workspace/api-server run dev           # build + run API locally (needs PORT + DATABASE_URL)
pnpm --filter @workspace/api-server run test:api      # JSON-driven local Lambda API tests
pnpm --filter @workspace/api-server run typecheck
pnpm --filter camisas-del-puerto run dev              # Vite dev server (FE)
pnpm --filter @workspace/api-spec run codegen         # regenerate zod + react-query client from openapi.yaml
pnpm run typecheck                                    # workspace-wide typecheck
```

## Gotchas

- `numeric` → string: always `num()` before math or JSON output.
- Two specs to keep in sync (see contract flow). Regenerating is not optional.
- Pooler needs `prepare:false`; don't switch to a session-mode assumption.
- The API is currently **public** (no auth) by design — see DEPLOYMENT.md "Auth (later)".
- Only `prod` is deployed today; `dev` is stood up on demand.
</content>
