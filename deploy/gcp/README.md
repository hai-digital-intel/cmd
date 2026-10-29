# Deploying to Google Cloud (private VM)

This runs the command center on **one small Compute Engine VM with a persistent disk**, with **no
public IP**. The app has no login by design and holds sensitive company documents, so it is never
exposed to the internet. You reach it through Google's Identity-Aware Proxy (IAP): only Google
accounts with IAM access to the project can open a tunnel to it.

```
your browser ──http://localhost:3000──▶ IAP tunnel (Google sign-in) ──▶ VM (private IP only)
                                                                         └─ Docker container
                                                                             ├─ /app/data     ─┐ persistent disk
                                                                             └─ /app/storage  ─┘ (DB, backups, uploads)
```

## What gets created

| Resource | Purpose |
| --- | --- |
| Artifact Registry repo `hai` | Holds the app's container image (built by Cloud Build) |
| VM `hai-cmd` (e2-small, Container-Optimized OS, no external IP) | Runs the container |
| Disk `hai-cmd-data` (10 GB) + daily snapshots, 14-day retention | SQLite database, backups, uploaded files |
| Firewall rule `hai-allow-iap` | Allows only Google's IAP range (35.235.240.0/20) to ports 22 and 3000 |
| Service account `hai-cmd-vm` | Lets the VM pull images and write logs; nothing else |
| IAM grants for builds | The default Compute service account may read the build staging bucket, push to the `hai` repo, and write logs; nothing broader |

Rough cost: about **$15-20 USD/month** (e2-small + 10 GB disk + snapshots). That is an estimate;
check Google's pricing page for your region.

## Deploy

1. Install the Google Cloud CLI and sign in: `gcloud auth login`.
2. From the repo root, in a bash shell (Git Bash on Windows):

   ```bash
   PROJECT_ID=your-project REGION=me-central1 ZONE=me-central1-b ./deploy/gcp/deploy.sh
   ```

   `REGION`/`ZONE` default to `europe-west1`/`europe-west1-b`. Your database and documents are
   stored in the region you pick.
3. Wait 1-2 minutes for first boot (image pull, database migration, seed), then:

   ```bash
   PROJECT_ID=your-project ZONE=me-central1-b ./deploy/gcp/tunnel.sh
   ```

   Open http://localhost:3000. Keep the tunnel running while you use the app (Ctrl+C closes it).

On first boot the app seeds the same starting plan as a local install. To bring your existing
data over, use **Export JSON backup** in Settings locally, then **Restore from backup** in the
cloud copy. The JSON backup contains records only, not uploaded files, so any documents you have
already uploaded need to be re-uploaded (or copied to the disk separately).

## Updating

Run `deploy.sh` again. It builds a new image and restarts the container. The data disk is never
recreated or wiped.

## Backups

- **Daily disk snapshots** (14 days) are taken automatically.
- **In-app backups** (the automatic pre-restore copies in `data/backups`) are written to the same disk, so they do not protect you against
  losing the disk. Export one and keep a copy somewhere else too.

## Who can open it

Anyone with `roles/iap.tunnelResourceAccessor` on the project (project owners already have it).
To give a co-founder access:

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=user:their@email --role=roles/iap.tunnelResourceAccessor
```

Everyone who opens a tunnel sees and can edit **everything**; there are no per-user permissions
in the app.

## Troubleshooting

- **`deploy.sh` fails during the build with a 403 / `storage.objects.get` error**: Cloud Build runs
  as the project's default Compute service account, which new projects no longer give any
  access. `deploy.sh` grants it the minimum (read the staging bucket, push to the `hai` repo, write
  logs). If your organisation blocks IAM changes from the script, have an admin grant those three
  roles to `PROJECT_NUMBER-compute@developer.gserviceaccount.com` and re-run.
- **Resuming after a failure without rebuilding**: `SKIP_BUILD=1 TAG=<existing-tag> ./deploy/gcp/deploy.sh`.
- **Tunnel connects but the page doesn't load**: the container is probably still starting.
  Check the VM's serial output:
  `gcloud compute instances get-serial-port-output hai-cmd --zone ZONE | tail -40`.
- **See container logs**: `gcloud compute ssh hai-cmd --zone ZONE --tunnel-through-iap --command "docker logs hai"`.

## Tearing it down

Deleting the **disk** permanently deletes your database and uploaded documents. Export a backup
first.

```bash
gcloud compute instances delete hai-cmd --zone ZONE
gcloud compute disks delete hai-cmd-data --zone ZONE        # DATA LOSS
gcloud compute firewall-rules delete hai-allow-iap
gcloud artifacts repositories delete hai --location REGION
gcloud compute resource-policies delete hai-cmd-daily --region REGION
```
