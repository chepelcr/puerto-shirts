---
name: Camisas del Puerto stack
description: How to add an API endpoint end-to-end in this pnpm monorepo (OpenAPI-first codegen, Drizzle DB, Express, React+react-query).
---

# Adding an API endpoint (end-to-end order)
The API is OpenAPI-first: `lib/api-spec/openapi.yaml` is the source of truth. Do NOT hand-write client hooks or zod bodies.

1. DB: edit `lib/db/src/schema/*.ts`, then `pnpm --filter @workspace/db run push` (drizzle-kit push, no migration files).
2. Spec: add path + schemas to `lib/api-spec/openapi.yaml`. Give each operation an `operationId`.
3. Codegen: `pnpm --filter @workspace/api-spec run codegen` (orval) → regenerates `@workspace/api-zod` and `@workspace/api-client-react` and typechecks libs.
4. Server: implement the route in `artifacts/api-server/src/routes/*.ts`, importing the zod body from `@workspace/api-zod`.
5. Web: consume the generated hook from `@workspace/api-client-react`.

# Codegen naming (derived from operationId)
- zod body: PascalCase(operationId) + `Body` (e.g. `setExposicion` → `SetExposicionBody`).
- react hook: `use` + PascalCase(operationId) (e.g. `useSetExposicion`, `useResetExposicion`).
- Mutation call shape: PATCH with IdParam+body → `.mutate({ id, data })`; POST with no body/params → `void`, call `.mutate(undefined, {..options})`.

# Conventions / gotchas
- `parseId(req.params.id)` (from `../lib/http`) THROWS `HttpError(400)` on bad id. For consistent JSON errors wrap it in try/catch and return `res.status(400).json({error})` — Express default formatting otherwise leaks HTML.
- Numeric DB columns come back as strings; convert with `num()` (server) before returning JSON.
- Web: wouter `base={import.meta.env.BASE_URL.replace(/\/$/,"")}`. Build in-app deep links as `${origin}${import.meta.env.BASE_URL}<path>`; read query string with wouter `useSearch()`.
- **Print/popup windows: never `document.write` interpolated DB text** (XSS). Build nodes with `createElement` + `textContent`.
