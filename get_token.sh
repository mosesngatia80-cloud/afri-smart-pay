#!/usr/bin/env bash

set -e

# Load secrets
if [ ! -f .env.mpesa ]; then
  echo "❌ .env.mpesa file not found"
  exit 1
fi

export $(grep -v '^#' .env.mpesa | xargs)

# Validate variables
if [ -z "$CONSUMER_KEY" ] || [ -z "$CONSUMER_SECRET" ]; then
  echo "❌ Missing CONSUMER_KEY or CONSUMER_SECRET"
  exit 1
fi

# Generate Base64 auth
AUTH=$(echo -n "$CONSUMER_KEY:$CONSUMER_SECRET" | base64)

# Request token
curl -i -X GET "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials" \
  -H "Authorization: Basic $AUTH"
