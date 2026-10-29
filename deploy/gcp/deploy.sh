#!/usr/bin/env bash
# Deploys the h.ai Setup Command Center to a PRIVATE Compute Engine VM (no public IP, no open
# internet ports; reach it with ./deploy/gcp/tunnel.sh). Re-running builds a new image and restarts
# the container. The data disk (database + uploaded files) is never recreated or wiped.
#
#   PROJECT_ID=my-project REGION=europe-west1 ./deploy/gcp/deploy.sh
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID, e.g. PROJECT_ID=my-project ./deploy/gcp/deploy.sh}"
REGION="${REGION:-europe-west1}"
ZONE="${ZONE:-${REGION}-b}"
VM="${VM:-hai-cmd}"
DISK="${DISK:-hai-cmd-data}"
DISK_GB="${DISK_GB:-10}"
MACHINE="${MACHINE:-e2-small}"
REPO="${REPO:-hai}"
VM_SA_NAME="hai-cmd-vm"
TAG="${TAG:-$(date +%Y%m%d-%H%M%S)}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/cmd:${TAG}"

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
VM_SA="${VM_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

g() { gcloud --project "$PROJECT_ID" "$@"; }
step() { printf '\n==> %s\n' "$*"; }

step "Enabling required APIs"
g services enable compute.googleapis.com artifactregistry.googleapis.com \
  cloudbuild.googleapis.com iap.googleapis.com

step "Artifact Registry repository '$REPO' ($REGION)"
g artifacts repositories describe "$REPO" --location "$REGION" >/dev/null 2>&1 ||
  g artifacts repositories create "$REPO" --repository-format=docker --location "$REGION" \
    --description="h.ai Setup Command Center images"

# New projects no longer give the default Compute service account (which Cloud Build runs as)
# any access, so grant it exactly what a build needs and nothing broader.
step "Cloud Build identity (least privilege: read staging bucket, push to this repo, write logs)"
PROJECT_NUMBER="$(g projects describe "$PROJECT_ID" --format='value(projectNumber)')"
BUILD_SA="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
STAGING_BUCKET="gs://${PROJECT_ID}_cloudbuild"
g storage buckets describe "$STAGING_BUCKET" >/dev/null 2>&1 ||
  g storage buckets create "$STAGING_BUCKET" --location "$REGION" --uniform-bucket-level-access
g storage buckets add-iam-policy-binding "$STAGING_BUCKET" --member "$BUILD_SA"   --role roles/storage.objectViewer >/dev/null
g artifacts repositories add-iam-policy-binding "$REPO" --location "$REGION"   --member "$BUILD_SA" --role roles/artifactregistry.writer >/dev/null
g projects add-iam-policy-binding "$PROJECT_ID" --member "$BUILD_SA"   --role roles/logging.logWriter --condition=None >/dev/null

if [ -n "${SKIP_BUILD:-}" ]; then
  step "SKIP_BUILD set - reusing existing image $IMAGE"
else
  step "Building image $IMAGE with Cloud Build"
  g builds submit "$ROOT" --tag "$IMAGE"
fi

step "Network: private Google access + IAP-only firewall"
g compute networks subnets update default --region "$REGION" --enable-private-ip-google-access
g compute firewall-rules describe hai-allow-iap >/dev/null 2>&1 ||
  g compute firewall-rules create hai-allow-iap --network default --direction INGRESS \
    --allow tcp:22,tcp:3000 --source-ranges 35.235.240.0/20 --target-tags hai-cmd \
    --description="IAP TCP forwarding only (no public access) for the h.ai command center"

step "VM service account $VM_SA (read images + write logs only)"
g iam service-accounts describe "$VM_SA" >/dev/null 2>&1 ||
  g iam service-accounts create "$VM_SA_NAME" --display-name="h.ai command center VM"
g artifacts repositories add-iam-policy-binding "$REPO" --location "$REGION" \
  --member "serviceAccount:$VM_SA" --role roles/artifactregistry.reader >/dev/null
g projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:$VM_SA" --role roles/logging.logWriter --condition=None >/dev/null

step "Persistent data disk $DISK (${DISK_GB}GB) + daily snapshots"
g compute disks describe "$DISK" --zone "$ZONE" >/dev/null 2>&1 ||
  g compute disks create "$DISK" --zone "$ZONE" --size "${DISK_GB}GB" --type pd-balanced
g compute resource-policies describe hai-cmd-daily --region "$REGION" >/dev/null 2>&1 ||
  g compute resource-policies create snapshot-schedule hai-cmd-daily --region "$REGION" \
    --max-retention-days 14 --daily-schedule --start-time 03:00
g compute disks add-resource-policies "$DISK" --zone "$ZONE" --resource-policies hai-cmd-daily 2>/dev/null || true

step "VM $VM"
if g compute instances describe "$VM" --zone "$ZONE" >/dev/null 2>&1; then
  echo "VM exists - pointing it at the new image and restarting"
  g compute instances add-metadata "$VM" --zone "$ZONE" --metadata "image=$IMAGE" \
    --metadata-from-file "startup-script=$HERE/vm-startup.sh"
  g compute instances reset "$VM" --zone "$ZONE"
else
  g compute instances create "$VM" --zone "$ZONE" --machine-type "$MACHINE" \
    --image-family cos-stable --image-project cos-cloud \
    --no-address --subnet default --tags hai-cmd \
    --service-account "$VM_SA" --scopes cloud-platform \
    --disk "name=$DISK,device-name=hai-data,mode=rw,boot=no" \
    --metadata "image=$IMAGE" --metadata-from-file "startup-script=$HERE/vm-startup.sh"
fi

cat <<EOF

Deployed $IMAGE
First start takes a minute or two (pull + migrations + seed). Then open the private tunnel:

  PROJECT_ID=$PROJECT_ID ZONE=$ZONE ./deploy/gcp/tunnel.sh
  -> http://localhost:3000

EOF
