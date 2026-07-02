#!/bin/bash
# Deploy the puerto-shirts uploads bucket + CloudFront + ACM + Route53
# (cloudformation/s3-uploads.yaml). Run once per environment.
set -e

ENVIRONMENT="${1:-dev}"
[[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]] && { echo "Usage: ./deploys/deploy-s3.sh <dev|prod>"; exit 1; }

PROFILE="${AWS_PROFILE:-PACIFIC-PROD}"
REGION="${REGION:-us-east-1}"
ROOT_DOMAIN="jcampos.dev"

if [ "$ENVIRONMENT" = "prod" ]; then
  DOMAIN="uploads.shirts.jcampos.dev"
else
  DOMAIN="uploads-dev.shirts.jcampos.dev"
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔍 Resolving hosted zone for ${ROOT_DOMAIN}..."
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --query "HostedZones[?Name=='${ROOT_DOMAIN}.'].Id" --output text --profile "$PROFILE" | cut -d'/' -f3)
[ -n "$HOSTED_ZONE_ID" ] || { echo "❌ Could not find hosted zone for ${ROOT_DOMAIN}"; exit 1; }
echo "✅ Hosted Zone: $HOSTED_ZONE_ID"

echo "🚀 Deploying puerto-shirts-${ENVIRONMENT}-s3-uploads (${DOMAIN})..."
aws cloudformation deploy \
  --template-file "$ROOT/cloudformation/s3-uploads.yaml" \
  --stack-name "puerto-shirts-${ENVIRONMENT}-s3-uploads" \
  --parameter-overrides \
    Environment="$ENVIRONMENT" \
    DomainName="$DOMAIN" \
    FrontEndDomainName="shirts.jcampos.dev" \
    HostedZoneId="$HOSTED_ZONE_ID" \
  --region "$REGION" \
  --profile "$PROFILE"

echo "✅ Uploads stack deployed: https://${DOMAIN}"
