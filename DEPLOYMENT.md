# puerto-shirts — Deployment

Self-hosted CI/CD mirroring the tsuru `management-be` pattern. Monorepo with
**independent** deploy flows per app.

## Architecture

| Piece | Where | Domain |
|---|---|---|
| Frontend (`artifacts/camisas-del-puerto`) | GitHub Pages | `shirts.jcampos.dev` |
| Backend (`artifacts/api-server`, Express → Lambda via serverless-http) | AWS Lambda + API Gateway (REST, per-endpoint) | `api.shirts.jcampos.dev` (dev `api-dev.`) |
| Uploads (images) | S3 + CloudFront | `uploads.shirts.jcampos.dev` (dev `uploads-dev.`) |
| Database | Supabase Postgres (transaction pooler `:6543`) | — |
| Config | SSM Parameter Store `/pacific/{env}/puerto-shirts/*` | — |
| DB credentials | Secrets Manager `pacific/{env}/puerto-shirts/database` | — |

AWS account: same as tsuru. Profile: **`PACIFIC-PROD`**. Region: `us-east-1`.
Hosted zone: `jcampos.dev` (resolved at deploy time).

## Config & DB connection (management-be pattern)

- `src/config/appConfig.ts` — SSM reader: `SSM → env → default`, 5-min cache. `SSM_BASE_PATH` env wins; else `settings.cfg`.
- `src/config/secrets.ts` — `getDatabaseUrl()`: `DATABASE_URL`/`NEW_DATABASE_URL` → SSM `aws.database` (secret name) → Secrets Manager → build `postgresql://…`.
- `lib/db` — lazy `postgres-js` with `prepare:false` (**required** for the Supabase pooler) + a `db` Proxy. `initializeDatabase()` runs at startup.
- **Local dev:** set `DATABASE_URL` (or the `DATABASE_HOST/PORT/USERNAME/PASSWORD/DBNAME` fields) — no AWS calls.

## The GitHub flow (3 independent workflows)

1. **`deploy-fe.yml`** — push to `main` touching `artifacts/camisas-del-puerto/**` or `lib/**` → build + publish to GitHub Pages (prod).
2. **`deploy-be.yml`** — push touching `artifacts/api-server/**`, `lib/**`, `scripts/**` → build the Lambda zip + `update-function-code` (**automatic; dev**). `workflow_dispatch` to target `prod`. Does **not** touch API Gateway.
3. **`deploy-api.yml`** — **MANUAL** (`workflow_dispatch` only): regenerate the swagger spec → `gen_api_template.py` → **`sam build` + `sam deploy`** (custom domain, cert, Route53). Run this after the Lambda code is live and whenever endpoints change.

> The `sam build` is intentionally a manual step — it changes the public API contract.

## API docs

Every endpoint carries `@swagger` JSDoc (`src/routes/*.ts`). `scripts/generate-swagger-spec.cjs`
builds the spec; `scripts/gen_api_template.py` turns it into the per-endpoint API Gateway
template. Swagger UI is served in-app at `/api-docs` (spec at `/api-docs/swagger.json`).
**The generated gateway only routes documented paths** — add `@swagger` to every new route.

## One-time bootstrap (run once per env with the `PACIFIC-PROD` profile)

```bash
export AWS_PROFILE=PACIFIC-PROD

# 1. OIDC deploy role (creates IAM) — dev and prod
aws cloudformation deploy --template-file cloudformation/deploy-role.yml \
  --stack-name puerto-shirts-dev-deploy-role --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides Environment=dev
#   → copy the DeployRoleArn output into the repo secret AWS_DEPLOY_ROLE_ARN_DEV (and _PROD)

# 2. DB secret (CFN placeholder + real Supabase pooler creds; never committed)
bash secrets/build-secrets.sh dev --database \
  --db-host aws-0-us-east-1.pooler.supabase.com --db-port 6543 \
  --db-user postgres.<projectref> --db-pass '<password>' --db-name postgres

# 3. Uploads bucket + CloudFront + uploads-dev.shirts.jcampos.dev
bash deploys/deploy-s3.sh dev

# 4. SSM params + Lambda (Lambda reads the uploads bucket from params)
aws cloudformation deploy --template-file cloudformation/params.yml \
  --stack-name puerto-shirts-dev-params --parameter-overrides \
  Environment=dev ApiUrl=https://api-dev.shirts.jcampos.dev \
  FrontendUrl=https://shirts.jcampos.dev UploadsUrl=https://uploads-dev.shirts.jcampos.dev \
  UploadsBucket=puerto-shirts-dev-uploads

aws cloudformation deploy --template-file cloudformation/lambda.yml \
  --stack-name puerto-shirts-dev-lambda --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides Environment=dev UploadsBucketName=puerto-shirts-dev-uploads \
  PublicAssetBaseUrl=https://uploads-dev.shirts.jcampos.dev
```

Then, once:
- **GitHub → Settings → Pages:** source = GitHub Actions; custom domain `shirts.jcampos.dev`.
- **Route53 (`jcampos.dev`):** `CNAME shirts.jcampos.dev → chepelcr.github.io`
  (the `api.` / `uploads.` records are created by the SAM + s3-uploads stacks).

## Database schema

Drizzle schema in `lib/db/src/schema`. Tables are created with:
```bash
DATABASE_URL=postgresql://… pnpm --filter @workspace/db exec drizzle-kit push --force
```
Committed SQL lives in `lib/db/migrations/`. The 9 tables (equipos, camisetas, maletas,
lotes, proveedores, inventario, kardex, ventas, venta_detalles) are already provisioned in
the Supabase project.

## Deploy sequence recap

1. Bootstrap (above) per env → set `AWS_DEPLOY_ROLE_ARN_DEV/_PROD` repo secrets.
2. `git push` → **deploy-fe** (Pages) + **deploy-be** (Lambda code, dev) run automatically.
3. Run **deploy-api** (manual) to (re)deploy the API Gateway.
4. Prod backend: run **deploy-be** / **deploy-api** via `workflow_dispatch` with `environment=prod`.

## Auth (later)

The API is **public** for now so it can be built and tested online. The generator is
authorizer-ready — add the Cognito user-management template later and flip on the
`CognitoAuthorizer` (per-route `security:`) in `scripts/gen_api_template.py`.
