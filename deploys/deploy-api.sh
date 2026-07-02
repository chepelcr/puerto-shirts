#!/bin/bash
# Deploy the API Gateway for one environment: regenerate the template from the
# swagger spec, then deploy. Uses `aws cloudformation deploy` with the shared
# SAM staging bucket (no local SAM CLI needed). When no endpoints changed the
# changeset is empty and this passes fast.
# Usage: ./deploys/deploy-api.sh <dev|prod>
set -e
ENV="${1:-prod}"
[[ "$ENV" != "dev" && "$ENV" != "prod" ]] && { echo "Usage: deploy-api.sh <dev|prod>"; exit 1; }
PROFILE="${AWS_PROFILE:-PACIFIC-PROD}"; REGION="${REGION:-us-east-1}"
ROOT_DOMAIN="jcampos.dev"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"

if [ "$ENV" = "prod" ]; then DOMAIN="api.shirts.jcampos.dev"; else DOMAIN="api-dev.shirts.jcampos.dev"; fi

HZ=$(aws route53 list-hosted-zones-by-name --query "HostedZones[?Name=='${ROOT_DOMAIN}.'].Id" \
  --output text --profile "$PROFILE" | cut -d'/' -f3)
[ -n "$HZ" ] || { echo "ERROR: hosted zone for $ROOT_DOMAIN not found"; exit 1; }

echo "=== Regenerating API template from swagger ==="
node scripts/generate-swagger-spec.cjs
python scripts/gen_api_template.py

echo "=== Deploying puerto-shirts-${ENV}-api-gateway (${DOMAIN}) ==="
aws cloudformation deploy \
  --template-file api-gateway/template.yml \
  --stack-name "puerto-shirts-${ENV}-api-gateway" \
  --s3-bucket puerto-shirts-sam-deployments --s3-prefix "puerto-shirts-${ENV}-api-gateway" \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --no-fail-on-empty-changeset \
  --parameter-overrides Environment="$ENV" DomainName="$DOMAIN" HostedZoneId="$HZ" \
  --region "$REGION" --profile "$PROFILE"
echo "✓ API Gateway deployed: https://${DOMAIN}"
