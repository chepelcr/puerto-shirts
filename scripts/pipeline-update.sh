#!/bin/bash
# Phase 2 — update the Lambda function code from lambda-package.zip.
set -euo pipefail

ENVIRONMENT="${ENVIRONMENT:-prod}"
REGION="${REGION:-us-east-1}"
FUNCTION_NAME="puerto-shirts-${ENVIRONMENT}-api-handler"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ZIP_PATH="${ROOT}/lambda-package.zip"

echo "=== puerto-shirts Lambda Update ==="
echo "  Function : ${FUNCTION_NAME}"
echo "  Region   : ${REGION}"

[ -f "$ZIP_PATH" ] || { echo "ERROR: $ZIP_PATH not found — run pipeline-build.sh first"; exit 1; }

if ! aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" &>/dev/null; then
  echo "[SKIP] $FUNCTION_NAME does not exist yet — deploy cloudformation/lambda.yml first"
  exit 0
fi

UPDATED=false
for attempt in 1 2 3; do
  echo "Attempt ${attempt}: updating ${FUNCTION_NAME}..."
  if aws lambda update-function-code \
      --function-name "$FUNCTION_NAME" \
      --zip-file "fileb://$ZIP_PATH" \
      --region "$REGION" \
      --output text --query 'FunctionArn'; then
    UPDATED=true; break
  fi
  echo "  Retrying in 10s..."; sleep 10
done

[ "$UPDATED" = true ] || { echo "ERROR: failed to update ${FUNCTION_NAME} after 3 attempts"; exit 1; }
echo "Updated: ${FUNCTION_NAME}"
