#!/bin/bash
# Deploy the single shared SAM staging bucket (global — run once, not per env).
# Usage: ./deploys/deploy-sam-bucket.sh
set -e
PROFILE="${AWS_PROFILE:-PACIFIC-PROD}"; REGION="${REGION:-us-east-1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

aws cloudformation deploy \
  --template-file "$ROOT/cloudformation/sam-bucket.yml" \
  --stack-name "puerto-shirts-sam-bucket" \
  --region "$REGION" --profile "$PROFILE"
echo "✓ SAM bucket: puerto-shirts-sam-deployments"
