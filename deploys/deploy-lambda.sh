#!/bin/bash
# Deploy the Lambda for one environment: the CloudFormation stack (function +
# role) AND the function code (esbuild bundle + swagger spec).
# Usage: ./deploys/deploy-lambda.sh <dev|prod>
set -e
ENV="${1:-prod}"
[[ "$ENV" != "dev" && "$ENV" != "prod" ]] && { echo "Usage: deploy-lambda.sh <dev|prod>"; exit 1; }
PROFILE="${AWS_PROFILE:-PACIFIC-PROD}"; REGION="${REGION:-us-east-1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ "$ENV" = "prod" ]; then UPL="https://uploads.shirts.jcampos.dev"; else UPL="https://uploads-dev.shirts.jcampos.dev"; fi

# 1. Function + execution role
echo "=== Lambda stack (puerto-shirts-${ENV}-lambda) ==="
aws cloudformation deploy \
  --template-file cloudformation/lambda.yml \
  --stack-name "puerto-shirts-${ENV}-lambda" \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides Environment="$ENV" DbSecretName="pacific/${ENV}/puerto-shirts/database" \
    UploadsBucketName="puerto-shirts-${ENV}-uploads" PublicAssetBaseUrl="$UPL" \
  --region "$REGION" --profile "$PROFILE"

# 2. Function code (build + update)
echo "=== Lambda code ==="
ENVIRONMENT="$ENV" bash scripts/pipeline-build.sh
ENVIRONMENT="$ENV" REGION="$REGION" AWS_PROFILE="$PROFILE" bash scripts/pipeline-update.sh
echo "✓ Lambda deployed: puerto-shirts-${ENV}-api-handler"
