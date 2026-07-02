# puerto-shirts — Deployment

Self-hosted CI/CD mirroring tsuru `management-be`. Monorepo with **independent**
deploy flows (FE vs BE). Everything is Infrastructure-as-Code so it can be
replayed in any AWS account.

## Architecture

| Piece | Where | Prod domain |
|---|---|---|
| Frontend (`artifacts/camisas-del-puerto`) | GitHub Pages | `shirts.jcampos.dev` |
| Backend (`artifacts/api-server`, Express → Lambda via serverless-http) | AWS Lambda + API Gateway (REST, per-endpoint) | `api.shirts.jcampos.dev` |
| Uploads (images) | S3 + CloudFront | `uploads.shirts.jcampos.dev` |
| Database | Supabase Postgres (transaction pooler `:6543`) | — |
| Config | SSM `/pacific/{env}/puerto-shirts/*` | — |
| DB credentials | Secrets Manager `pacific/{env}/puerto-shirts/database` | — |
| SAM template staging | **single** bucket `puerto-shirts-sam-deployments` | — |

Region `us-east-1`. AWS profile `PACIFIC-PROD`. Hosted zone `jcampos.dev`
(resolved at deploy time). GitHub OIDC provider is account-global (already exists).

**Environments:** the scripts + `samconfig.toml` support `dev` and `prod` (pass the
env as `$1`). **Only `prod` is currently deployed** — stand up `dev` later with
`bash deploys/deploy-all.sh dev` if needed.

## The GitHub flow (full tsuru pattern)

Two workflows, path-scoped, on push to `main`:

1. **`deploy-fe.yml`** → build FE + publish to GitHub Pages (fires on `artifacts/camisas-del-puerto/**` or `lib/**`).
2. **`deploy-be.yml`** → one job, three phases like tsuru: `pipeline-build` (bundle) → `pipeline-update` (Lambda code) → `pipeline-api` (regenerate template + `sam deploy` the API Gateway). When no endpoints changed the changeset is empty and the API step passes fast. Defaults to **prod**; `workflow_dispatch` can target `dev`.

OIDC auth (no keys): repo secret `AWS_DEPLOY_ROLE_ARN_PROD` (+ `_DEV` if you use dev).

## Deploy scripts (`deploys/`, `scripts/`, `secrets/`)

| Script | Purpose |
|---|---|
| `deploys/deploy-all.sh <env>` | Full backend bootstrap in order (calls the ones below) |
| `deploys/deploy-sam-bucket.sh` | The single shared SAM staging bucket (global, once) |
| `deploys/deploy-role.sh <env>` | GitHub OIDC deploy role (IAM); prints the ARN for the repo secret |
| `deploys/deploy-s3.sh <env>` | Uploads bucket + CloudFront + cert + Route53 (slow) |
| `deploys/deploy-params.sh <env>` | SSM parameters |
| `deploys/deploy-lambda.sh <env>` | Lambda **stack + code** (function, role, bundle) |
| `deploys/deploy-api.sh <env>` | Regenerate template + deploy API Gateway (+ custom domain/cert) |
| `secrets/build-secrets.sh <env> --database …` | DB secret (CFN placeholder + real Supabase creds, never committed) |
| `scripts/pipeline-{build,update,api}.sh` | The three CI phases used by `deploy-be.yml` |

## One-time bootstrap in a fresh account (prod)

```bash
export AWS_PROFILE=PACIFIC-PROD          # your profile
cd puerto-shirts

# 0. OIDC deploy role → set the repo secret it prints
bash deploys/deploy-role.sh prod
gh secret set AWS_DEPLOY_ROLE_ARN_PROD -b "arn:aws:iam::<acct>:role/puerto-shirts-prod-github-deploy"

# 1. DB secret — real Supabase POOLER creds (transaction mode, 6543); never committed
bash secrets/build-secrets.sh prod --database \
  --db-host <ref>.pooler.supabase.com --db-port 6543 \
  --db-user postgres.<ref> --db-pass '<pass>' --db-name postgres

# 2. Everything else, in order (sam bucket → uploads → params → lambda → api gateway)
bash deploys/deploy-all.sh prod
```

Then, once:
- **GitHub → Settings → Pages:** source = **GitHub Actions**; custom domain `shirts.jcampos.dev`.
- **Route53 (`jcampos.dev`):** `CNAME shirts.jcampos.dev → chepelcr.github.io`
  (the `api.` / `uploads.` A-records are created by the SAM + s3-uploads stacks).
- **Push to `main`** (or run the workflows) → FE + BE deploy.

## Database schema

Drizzle schema in `lib/db/src/schema`; SQL in `lib/db/migrations/`. Create/refresh tables:
```bash
DATABASE_URL=postgresql://… pnpm --filter @workspace/db exec drizzle-kit push --force
```
The 9 tables (equipos, camisetas, maletas, lotes, proveedores, inventario, kardex,
ventas, venta_detalles) are already provisioned in Supabase.

## Config & DB connection (management-be pattern)

- `src/config/appConfig.ts` — SSM reader (`SSM → env → default`, 5-min cache; `SSM_BASE_PATH` wins, else `settings.cfg`).
- `src/config/secrets.ts` — `getDatabaseUrl()`: `DATABASE_URL` → SSM `aws.database` → Secrets Manager → build URL.
- `lib/db` — lazy `postgres-js` with `prepare:false` (**required** for the Supabase pooler) + `db` Proxy.
- **Local dev:** put the `DATABASE_*` fields (or `DATABASE_URL`) in `.env` (gitignored) — no AWS calls.

## Auth (later)

The API is **public** for now so it can be built and tested online. The generator is
authorizer-ready — add a Cognito user-management stack later and flip on the
`CognitoAuthorizer` (per-route `security:`) in `scripts/gen_api_template.py`.
