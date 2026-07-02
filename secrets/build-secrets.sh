#!/bin/bash
# Deploy the puerto-shirts database secret (tsuru Infrastructure/secrets pattern).
# The CloudFormation stack creates a placeholder secret; the REAL Supabase
# credentials are written afterwards via put-secret-value (never stored in code).
set -e

show_usage() {
  cat << EOF
Usage: ./secrets/build-secrets.sh <environment> --database \\
         --db-host <host> [--db-port 6543] --db-user <user> --db-pass <pass> --db-name <name>

Environments: dev | prod
Use the Supabase connection POOLER host/port (transaction mode, 6543).

Example:
  ./secrets/build-secrets.sh dev --database \\
    --db-host aws-0-us-east-1.pooler.supabase.com --db-port 6543 \\
    --db-user postgres.abcdefgh --db-pass 'secret' --db-name postgres
EOF
  exit 1
}

[ -z "$1" ] && { echo "ERROR: environment required"; show_usage; }
ENVIRONMENT="$1"; shift
[[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]] && { echo "ERROR: environment must be dev or prod"; exit 1; }

PROFILE="${AWS_PROFILE:-PACIFIC-PROD}"
REGION="${REGION:-us-east-1}"
DEPLOY_DATABASE=false
DB_HOST=""; DB_PORT="6543"; DB_USER=""; DB_PASS=""; DB_NAME="postgres"

while [[ $# -gt 0 ]]; do
  case $1 in
    --database) DEPLOY_DATABASE=true; shift ;;
    --db-host) DB_HOST="$2"; shift 2 ;;
    --db-port) DB_PORT="$2"; shift 2 ;;
    --db-user) DB_USER="$2"; shift 2 ;;
    --db-pass) DB_PASS="$2"; shift 2 ;;
    --db-name) DB_NAME="$2"; shift 2 ;;
    --help|-h) show_usage ;;
    *) echo "ERROR: unknown argument: $1"; show_usage ;;
  esac
done

[ "$DEPLOY_DATABASE" != true ] && { echo "ERROR: pass --database"; show_usage; }
[[ -z "$DB_HOST" || -z "$DB_USER" || -z "$DB_PASS" || -z "$DB_NAME" ]] && \
  { echo "ERROR: --db-host, --db-user, --db-pass, --db-name are required"; exit 1; }

if ! aws sts get-caller-identity --profile "$PROFILE" > /dev/null 2>&1; then
  echo "ERROR: AWS credentials invalid for profile $PROFILE (aws sso login --profile $PROFILE)"; exit 1
fi

SECRET_NAME="pacific/${ENVIRONMENT}/puerto-shirts/database"
STACK_NAME="puerto-shirts-${ENVIRONMENT}-db-secret"
TEMPLATE="$(dirname "$0")/../cloudformation/database-secret.yml"

# Clean up a failed create so `deploy` can proceed
STATUS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --profile "$PROFILE" \
  --query "Stacks[0].StackStatus" --output text 2>/dev/null || echo "DOES_NOT_EXIST")
if [ "$STATUS" == "ROLLBACK_COMPLETE" ]; then
  echo "Deleting ROLLBACK_COMPLETE stack $STACK_NAME..."
  aws cloudformation delete-stack --stack-name "$STACK_NAME" --profile "$PROFILE"
  aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" --profile "$PROFILE"
fi

echo "=== Deploying $STACK_NAME ==="
aws cloudformation deploy \
  --stack-name "$STACK_NAME" \
  --template-file "$TEMPLATE" \
  --parameter-overrides Environment="$ENVIRONMENT" \
  --region "$REGION" \
  --profile "$PROFILE"

SECRET_VALUE=$(printf '{"host":"%s","port":"%s","username":"%s","password":"%s","dbname":"%s"}' \
  "$DB_HOST" "$DB_PORT" "$DB_USER" "$DB_PASS" "$DB_NAME")

echo "=== Writing credentials into $SECRET_NAME ==="
aws secretsmanager put-secret-value \
  --secret-id "$SECRET_NAME" \
  --secret-string "$SECRET_VALUE" \
  --region "$REGION" \
  --profile "$PROFILE" > /dev/null

echo "✓ Database secret deployed: $SECRET_NAME"
