#!/bin/bash
# MANUAL step — refresh swagger, regenerate the API Gateway template, then
# `sam build` + `sam deploy`. Not part of the automatic push flow: the API
# contract (per-endpoint methods, custom domain, cert) changes here, so it is
# run deliberately (workflow_dispatch or locally) after the Lambda code is live.
set -euo pipefail

ENVIRONMENT="${ENVIRONMENT:-dev}"
REGION="${REGION:-us-east-1}"
ROOT_DOMAIN="${ROOT_DOMAIN:-jcampos.dev}"
if [ "$ENVIRONMENT" = "prod" ]; then
  API_DOMAIN="${API_DOMAIN:-api.shirts.jcampos.dev}"
else
  API_DOMAIN="${API_DOMAIN:-api-dev.shirts.jcampos.dev}"
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== puerto-shirts API Gateway deploy (MANUAL) ==="
echo "  Environment : $ENVIRONMENT"
echo "  API Domain  : $API_DOMAIN"

# Resolve the hosted zone (same approach as store-be/deploy-s3.sh)
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --query "HostedZones[?Name=='${ROOT_DOMAIN}.'].Id" --output text | sed 's|/hostedzone/||')
[ -n "$HOSTED_ZONE_ID" ] || { echo "ERROR: could not resolve hosted zone for $ROOT_DOMAIN"; exit 1; }
echo "  Hosted Zone : $HOSTED_ZONE_ID"

# 1. Refresh swagger spec + regenerate the SAM template from it
echo "Generating swagger spec..."
node scripts/generate-swagger-spec.cjs
echo "Generating api-gateway/template.yml..."
python3 scripts/gen_api_template.py

# 2. SAM build + deploy (run from api-gateway/ so samconfig.toml is discovered)
cd api-gateway
echo "sam build..."
sam build
echo "sam deploy..."
sam deploy \
  --config-env "$ENVIRONMENT" \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --region "$REGION" \
  --parameter-overrides \
    "Environment=$ENVIRONMENT" \
    "DomainName=$API_DOMAIN" \
    "HostedZoneId=$HOSTED_ZONE_ID"

echo "API Gateway deploy complete."
