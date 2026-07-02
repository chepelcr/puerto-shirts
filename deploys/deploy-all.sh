#!/bin/bash
# Full backend bootstrap for one environment, in dependency order.
# Usage: ./deploys/deploy-all.sh <dev|prod>
#
# Prereqs (run once, separately, since they need secrets/inputs):
#   - The DB secret:  ./secrets/build-secrets.sh <env> --database --db-host … (see DEPLOYMENT.md)
#   - Repo secret:    gh secret set AWS_DEPLOY_ROLE_ARN_<ENV> -b "<role-arn from deploy-role>"
set -e
ENV="${1:-prod}"
[[ "$ENV" != "dev" && "$ENV" != "prod" ]] && { echo "Usage: deploy-all.sh <dev|prod>"; exit 1; }
D="$(dirname "$0")"

echo "############ puerto-shirts bootstrap: ${ENV} ############"
bash "$D/deploy-sam-bucket.sh"          # global, idempotent
bash "$D/deploy-role.sh" "$ENV"
bash "$D/deploy-s3.sh" "$ENV"           # uploads bucket + CloudFront (slow: cert)
bash "$D/deploy-params.sh" "$ENV"
bash "$D/deploy-lambda.sh" "$ENV"       # function + code
bash "$D/deploy-api.sh" "$ENV"          # API Gateway + custom domain (slow: cert)
echo "############ ${ENV} backend ready ############"
echo "Remember: create the DB secret + set the AWS_DEPLOY_ROLE_ARN_${ENV^^} repo secret if not done."
