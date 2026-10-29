#!/usr/bin/env bash
# Opens http://localhost:${LOCAL_PORT:-3000} -> the private VM, through Google's Identity-Aware
# Proxy. Only Google accounts with IAM access to the project can do this; the VM has no public IP.
# Leave this running while you use the app; Ctrl+C closes the tunnel.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID}"
ZONE="${ZONE:-europe-west1-b}"
VM="${VM:-hai-cmd}"
LOCAL_PORT="${LOCAL_PORT:-3000}"

echo "Tunnelling ${VM} -> http://localhost:${LOCAL_PORT}  (Ctrl+C to stop)"
exec gcloud --project "$PROJECT_ID" compute start-iap-tunnel "$VM" 3000 \
  --local-host-port="localhost:${LOCAL_PORT}" --zone "$ZONE"
