#!/bin/bash
# Runs on every boot of the Container-Optimized OS VM (see deploy.sh). Idempotent:
#  1. formats the data disk ONLY if it has no filesystem yet (never on a disk that holds data),
#  2. mounts it, 3. pulls the image named in instance metadata, 4. (re)starts the container.
set -euo pipefail
# stdout/stderr already reach the serial console + journal; also keep a copy on disk.
exec > >(tee -a /var/log/hai-startup.log) 2>&1

MD="http://metadata.google.internal/computeMetadata/v1/instance"
meta() { curl -fsS -H "Metadata-Flavor: Google" "$MD/$1"; }

IMAGE="$(meta attributes/image)"
REGISTRY_HOST="${IMAGE%%/*}"
DEV=/dev/disk/by-id/google-hai-data
MNT=/mnt/disks/hai-data

echo "image=$IMAGE"

[ -b "$DEV" ] || { echo "data disk $DEV is not attached - refusing to continue" >&2; exit 1; }
mkdir -p "$MNT"
if ! blkid "$DEV" >/dev/null 2>&1; then
  echo "no filesystem on $DEV - formatting (first boot only)"
  mkfs.ext4 -m 0 -F -E lazy_itable_init=0,lazy_journal_init=0,discard "$DEV"
fi
mountpoint -q "$MNT" || mount -o discard,defaults "$DEV" "$MNT"

# uid 1000 is the unprivileged `node` user inside the image.
mkdir -p "$MNT/data" "$MNT/storage"
chown -R 1000:1000 "$MNT/data" "$MNT/storage"

# Log in to Artifact Registry with the VM service account's token. HOME is pointed at a writable
# location because COS's default root home is read-only.
export HOME=/var/lib/hai-home
mkdir -p "$HOME"
TOKEN="$(meta service-accounts/default/token | sed -E 's/.*"access_token":"([^"]+)".*/\1/')"
echo "$TOKEN" | docker login -u oauth2accesstoken --password-stdin "https://$REGISTRY_HOST" >/dev/null

docker pull "$IMAGE"
docker rm -f hai >/dev/null 2>&1 || true
docker run -d --name hai --restart=always \
  -p 3000:3000 \
  -v "$MNT/data:/app/data" \
  -v "$MNT/storage:/app/storage" \
  "$IMAGE"

echo "started container hai from $IMAGE"
