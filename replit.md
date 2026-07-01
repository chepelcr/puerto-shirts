# Camisas del Puerto

A mobile-first, dark-mode inventory management app (Spanish UI) for a football jersey reselling business. Tracks suppliers, teams, jersey models, storage cases, purchase lots, per-size inventory, and an immutable movement ledger (kardex).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/camisas-del-puerto run dev` — run the web frontend (Vite)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string; object storage vars for image uploads

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, PostgreSQL + Drizzle ORM, Zod (`zod/v4`)
- Frontend: React + Vite, wouter (routing), TanStack Query, shadcn/ui, Tailwind
- API codegen: Orval (React Query hooks + types from OpenAPI spec)
- Object storage: Google Cloud Storage (via `@google-cloud/storage`) for jersey images

## Where things live

- DB schema (source of truth): `artifacts/api-server/src/db/schema.ts`
- API routes: `artifacts/api-server/src/routes/*` (proveedores, equipos, maletas, camisetas, lotes, inventario, kardex, dashboard)
- Shared HTTP helpers: `artifacts/api-server/src/lib/http.ts` (`HttpError`, `num`, `parseId`, `toDateString`)
- Generated API client (do not edit): `lib/api-client-react/src/generated/`
- Frontend pages: `artifacts/camisas-del-puerto/src/pages/`
- Frontend format/img helpers: `artifacts/camisas-del-puerto/src/lib/format.ts`
- Theme tokens: `artifacts/camisas-del-puerto/src/index.css`

## Architecture decisions

- **Kardex is immutable**: every entrada/venta/traslado writes an append-only movement row; inventory quantities are derived by applying movements. Never mutate or delete kardex rows.
- **Business invariant**: `precioVenta` MUST be strictly greater than `costoUnidad`; violations return HTTP 422. Enforced server-side and mirrored client-side in the ingreso form.
- **Utility formula**: `utilidad = (precioVenta - costoUnidad) * cantidad`.
- **Stock bajo**: a size (talla) is low-stock when `cantidadDisponible < 3`; surfaced with badges on dashboard, inventory, and detail views.
- **Numeric DB columns return strings**: backend converts via `num()`/`String()`; the frontend treats generated types as numbers.
- **Frontend calls `/api` relatively** (no base URL); the Replit proxy path-routes `/` to web and `/api` to the API server on the same origin.
- **Image uploads**: request a presigned URL (`useRequestUploadUrl`), PUT the file to GCS, then store `"/api/storage" + objectPath` as `urlImagen`.

## Product

Spanish-language inventory system. Users manage Proveedores, Equipos, Maletas, Camisetas (with images), Lotes (contado/crédito purchases), and per-size Inventario. Operations: ingresar (add stock), vender (sell), trasladar (move between cases). A Dashboard summarizes models, units, projected utility, and low-stock alerts; the Kardex shows the full immutable movement history with filters.

## User preferences

- UI language: Spanish.
- Theme: "Blue Book" — dark bg `#111111`, orange `#F25C05`, blue `#4A90E2`, surfaces `#1C2A39`; Oswald (display) + Inter (body); shark logo; slogan "La pasión del fútbol en cada lote."

## Gotchas

- Project references require `composite: true` — any `lib/*` package referenced by an artifact's `tsconfig.json` must set it (e.g. `lib/object-storage-web`).
- The seed script is bundled with esbuild (external: `pg-native`, `@google-cloud/*`, `*.node`) and run as `node dist/seed.mjs`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
