#!/bin/bash
# Deploy the GitHub OIDC deploy-role stack for one environment (creates IAM).
# Usage: ./deploys/deploy-role.sh <dev|prod>
set -e
ENV="${1:-prod}"
[[ "$ENV" != "dev" && "$ENV" != "prod" ]] && { echo "Usage: deploy-role.sh <dev|prod>"; exit 1; }
PROFILE="${AWS_PROFILE:-PACIFIC-PROD}"; REGION="${REGION:-us-east-1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

aws cloudformation deploy \
  --template-file "$ROOT/cloudformation/deploy-role.yml" \
  --stack-name "puerto-shirts-${ENV}-deploy-role" \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides Environment="$ENV" \
  --region "$REGION" --profile "$PROFILE"

ARN=$(aws cloudformation describe-stacks --stack-name "puerto-shirts-${ENV}-deploy-role" \
  --query "Stacks[0].Outputs[?OutputKey=='DeployRoleArn'].OutputValue" --output text --profile "$PROFILE")
echo "✓ Deploy role: $ARN"
echo "  Set repo secret: gh secret set AWS_DEPLOY_ROLE_ARN_${ENV^^} -b \"$ARN\""
