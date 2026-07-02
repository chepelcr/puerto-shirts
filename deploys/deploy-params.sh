#!/bin/bash
# Deploy the SSM parameters stack for one environment.
# Usage: ./deploys/deploy-params.sh <dev|prod>
set -e
ENV="${1:-prod}"
[[ "$ENV" != "dev" && "$ENV" != "prod" ]] && { echo "Usage: deploy-params.sh <dev|prod>"; exit 1; }
PROFILE="${AWS_PROFILE:-PACIFIC-PROD}"; REGION="${REGION:-us-east-1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ "$ENV" = "prod" ]; then
  API="https://api.shirts.jcampos.dev"; UPL="https://uploads.shirts.jcampos.dev"
else
  API="https://api-dev.shirts.jcampos.dev"; UPL="https://uploads-dev.shirts.jcampos.dev"
fi

aws cloudformation deploy \
  --template-file "$ROOT/cloudformation/params.yml" \
  --stack-name "puerto-shirts-${ENV}-params" \
  --parameter-overrides Environment="$ENV" ApiUrl="$API" \
    FrontendUrl="https://shirts.jcampos.dev" UploadsUrl="$UPL" \
    UploadsBucket="puerto-shirts-${ENV}-uploads" DbSecretName="pacific/${ENV}/puerto-shirts/database" \
  --region "$REGION" --profile "$PROFILE"
echo "✓ SSM params: /pacific/${ENV}/puerto-shirts/*"
