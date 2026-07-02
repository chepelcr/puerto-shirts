#!/bin/bash
# Phase 1 — build lambda-package.zip (esbuild bundle + bundled swagger spec).
# Run from the repo root.
set -euo pipefail

ENVIRONMENT="${ENVIRONMENT:-prod}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== puerto-shirts Lambda Build ==="
echo "  Environment : ${ENVIRONMENT}"

# 1. Bundle the Lambda (esbuild → artifacts/api-server/dist/lambda.mjs + pino workers).
#    build:lambda wipes dist first, so it must run BEFORE the swagger spec is written.
echo "Building Lambda bundle..."
pnpm --filter @workspace/api-server run build:lambda

# 2. Generate the runtime swagger spec INTO the built dist dir (served at /api-docs).
echo "Generating bundled swagger spec..."
node scripts/generate-swagger-spec.cjs --dist

# 3. Zip the whole dist dir — the esbuild-plugin-pino sidecar workers
#    (pino-worker.mjs, thread-stream-worker.mjs, …) must ship alongside lambda.mjs.
echo "Packaging lambda-package.zip..."
rm -f "$ROOT/lambda-package.zip"
( cd artifacts/api-server/dist && zip -r -q "$ROOT/lambda-package.zip" . )

[ -f "$ROOT/lambda-package.zip" ] || { echo "ERROR: lambda-package.zip not created"; exit 1; }
echo "lambda-package.zip → $(du -h "$ROOT/lambda-package.zip" | cut -f1)"
echo "Build complete."
