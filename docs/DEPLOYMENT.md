# Production Deployment Guide — Moftkhar (مفت خر)

This guide provides end-to-end instructions for deploying, updating, and maintaining **Moftkhar** in production. The application is built on **Next.js 16** (standalone output) and **Payload CMS 3.x** using **SQLite** with Write-Ahead Logging (WAL) and **Melipayamak SMS OTP** authentication.

The primary and recommended deployment target is **Dokploy** (Git-backed Docker Compose service with Traefik reverse proxy and automated Let's Encrypt SSL/TLS). Standalone VPS deployments with standard Docker Compose are also supported.

---

## Table of Contents

1. [Architecture & Design Decisions](#architecture--design-decisions)
2. [Prerequisites & System Requirements](#prerequisites--system-requirements)
3. [Environment Variables Reference](#environment-variables-reference)
4. [Deploying with Dokploy (Recommended)](#deploying-with-dokploy-recommended)
5. [Deploying on a Standalone VPS (Docker Compose)](#deploying-on-a-standalone-vps-docker-compose)
6. [Initial Setup & Catalog Seeding](#initial-setup--catalog-seeding)
7. [Updates & Database Migrations](#updates--database-migrations)
8. [Backups & Disaster Recovery](#backups--disaster-recovery)
9. [Health Monitoring & Logs](#health-monitoring--logs)
10. [Troubleshooting & FAQ](#troubleshooting--faq)

---

## Architecture & Design Decisions

### 1. Single-Replica Constraint (SQLite)
SQLite is an embedded, file-based database. While SQLite in WAL mode supports concurrent readers, it enforces a **single writer**.
- **Important**: Run strictly **1 replica** of the container (`replicas: 1`). Never scale horizontally or run multiple container instances pointing to the same SQLite database file. Scaling must be done vertically (CPU and RAM).

### 2. State Isolation via Docker Volumes
The application separates stateless application code from stateful persistent data:
- **Database Volume (`webfather_sqlite_data`)**: Mounted at `/app/data`. Contains `webfather-ecommerce.db`, `webfather-ecommerce.db-wal`, and `webfather-ecommerce.db-shm`.
- **Media Volume (`webfather_media_data`)**: Mounted at `/app/public/media`. Contains uploaded product images, icons, and CMS media assets.

### 3. Self-Contained Docker Build
The Docker build utilizes a multi-stage process:
- **Build stage**: Migrates against an isolated, temporary SQLite database (`file:/tmp/build.db` in `tmpfs`) to allow Next.js static page generation and schema inspection to succeed cleanly without requiring access to production secrets or production data.
- **Runtime stage**: The container image boots under a non-root `node` user and runs `node node_modules/payload/bin.js migrate && node server.js`, automatically applying any pending database migrations to the persistent volume before launching the HTTP server.

---

## Prerequisites & System Requirements

### Server Sizing
- **CPU**: Minimum 1 vCPU (2+ vCPUs recommended).
- **RAM**: Minimum 2 GB RAM + 2 GB Swap (4 GB+ RAM recommended for smooth Next.js builds).
- **Storage**: Minimum 20 GB SSD / NVMe.
- **Operating System**: Linux (Ubuntu 22.04 / 24.04 LTS or Debian 12 recommended).
- **Docker**: Docker Engine 24+ and Docker Compose v2+.

### External Accounts & Setup
- **Domain Name**: Configured with DNS `A` or `AAAA` record pointing to your server's public IP.
- **Melipayamak Account** (Optional for local/mock, required for live OTP):
  - Account username (`MELIPAYAMAK_USERNAME`)
  - Password / API credential (`MELIPAYAMAK_CREDENTIAL`)
  - Approved sender line number (`MELIPAYAMAK_FROM`)
  *(If credentials are not provided, the server falls back to console logging OTP codes for development/testing).*

---

## Environment Variables Reference

Configure these environment variables in your deployment environment:

| Variable | Required | Description | Example |
| --- | :---: | --- | --- |
| `PAYLOAD_SECRET` | **Yes** | Cryptographic secret for signing JWTs and Payload tokens. Keep stable across all deployments. | `openssl rand -base64 32` |
| `PREVIEW_SECRET` | **Yes** | Secret used to authenticate draft preview requests from Payload Admin. | `openssl rand -base64 32` |
| `PAYLOAD_PUBLIC_SERVER_URL` | **Yes** | Fully qualified public HTTPS URL of your site (no trailing slash). | `https://moftkhar.com` |
| `NEXT_PUBLIC_SERVER_URL` | **Yes** | Must match `PAYLOAD_PUBLIC_SERVER_URL`. Embedded into client build bundles. | `https://moftkhar.com` |
| `MELIPAYAMAK_JWT` | Production | Modern Console Token / JWT for Melipayamak REST OTP delivery (preferred). | `your_console_token` |
| `MELIPAYAMAK_USERNAME` | Legacy | Legacy panel username for Melipayamak (fallback if JWT not set). | `your_panel_username` |
| `MELIPAYAMAK_CREDENTIAL` | Legacy | Password or API key for Melipayamak legacy panel. | `your_secret_credential` |
| `MELIPAYAMAK_FROM` | Legacy | Dedicated sender line number approved in your panel. | `5000...` |
| `REDIS_URL` | Local development | Redis connection for OTP storage. Compose sets this automatically to `redis://redis:6379`. | `redis://localhost:6379` |
| `COMPANY_NAME` | No | Company brand name used in metadata and footers (default: `مفت خر`). | `"مفت خر"` |
| `SITE_NAME` | No | Site title displayed in headers and browser tabs (default: `مفت خر`). | `"مفت خر"` |
| `SQLITE_VOLUME_NAME` | No | Custom Docker volume name for the database (default: `webfather_sqlite_data`). | `webfather_sqlite_data` |
| `MEDIA_VOLUME_NAME` | No | Custom Docker volume name for uploaded files (default: `webfather_media_data`). | `webfather_media_data` |
| `REDIS_VOLUME_NAME` | No | Custom Docker volume name for Redis append-only data (default: `webfather_redis_data`). | `webfather_redis_data` |
| `DOCKER_PROXY_NETWORK` | No | Docker network connecting the app to the reverse proxy (default: `dokploy-network`). | `dokploy-network` |
| `DOCKER_PROXY_NETWORK_EXTERNAL` | No | Set to `false` if running Compose locally without an external proxy network. | `true` |

> [!NOTE]
> `DATABASE_URL` is configured automatically inside `docker-compose.yml` to point to `file:/app/data/webfather-ecommerce.db`. Do not override it in your production `.env` unless you are intentionally changing the internal container path.

Compose starts an internal Redis service and sets `REDIS_URL` for the app. For local development outside Compose, start Redis and set `REDIS_URL` in `.env`.

### Generating Secure Secrets
Run the following commands on your local machine or server to generate random secrets:
```bash
# Generate PAYLOAD_SECRET
openssl rand -base64 32

# Generate PREVIEW_SECRET
openssl rand -base64 32
```

### Production `.env` Template
Run `pnpm env:production` to create a private `.env` file with fresh secrets and `https://moftkhar.ir` URLs for Docker Compose. The script refuses to overwrite an existing file. Add your Melipayamak credentials before enabling live OTP delivery. Pass another output path if you want to generate a separate file.

```dotenv
PAYLOAD_SECRET=YOUR_GENERATED_PAYLOAD_SECRET_HERE
PREVIEW_SECRET=YOUR_GENERATED_PREVIEW_SECRET_HERE

PAYLOAD_PUBLIC_SERVER_URL=https://shop.example.com
NEXT_PUBLIC_SERVER_URL=https://shop.example.com

COMPANY_NAME="مفت خر"
SITE_NAME="مفت خر"

# Mobile OTP via Melipayamak (Server-side)
MELIPAYAMAK_USERNAME=your_username
MELIPAYAMAK_CREDENTIAL=your_password
MELIPAYAMAK_FROM=5000xxxxxx

# Volume and Network names (Defaults shown)
SQLITE_VOLUME_NAME=webfather_sqlite_data
MEDIA_VOLUME_NAME=webfather_media_data
DOCKER_PROXY_NETWORK=dokploy-network
DOCKER_PROXY_NETWORK_EXTERNAL=true
```

---

## Deploying with Dokploy (Recommended)

Dokploy handles Git cloning, container builds, volume persistence, reverse proxying (Traefik), and automatic Let's Encrypt SSL/TLS certificates.

### Step 1: Create a Compose Service
1. Log in to your Dokploy control panel.
2. Navigate to your **Project** and select or create an **Environment**.
3. Click **Add Service** and choose **Compose**.
4. Select **Docker Compose** (do **NOT** select Docker Stack, as Docker Stack does not support build contexts).
5. Name your service (e.g., `moftkhar`).

### Step 2: Configure Git Source
1. In the **General** / **Source** tab, choose **Git**.
2. Connect your Git repository provider (GitHub, GitLab, or custom Git).
3. Select the repository and set the branch to `main`.
4. Set the **Compose Path** to `./docker-compose.yml`.

### Step 3: Configure Environment Variables
1. Go to the **Environment** tab.
2. Paste the environment variables (using the template above, populated with your actual production secrets and domain).
3. Click **Save**. Dokploy writes these values to `.env` next to `docker-compose.yml`.

### Step 4: Configure Domain & SSL
1. Go to the **Domains** tab in the Compose service.
2. Click **Create Domain**.
3. Fill in:
   - **Host**: Your domain name (e.g., `shop.example.com` or `moftkhar.com`).
   - **Path**: `/`
   - **Container Port**: `4000`
   - **HTTPS**: Enabled (Check "Certificate: Let's Encrypt").
4. Click **Create**. Dokploy automatically applies Traefik reverse proxy labels to route external HTTPS traffic to port `4000` inside your container.

### Step 5: Deploy
1. Click **Deploy** at the top right of the Dokploy service dashboard.
2. Navigate to the **Deployments** / **Logs** tab to view the live build progress.
3. Once the build finishes and the container starts, the container healthcheck will verify that the server responds at `http://127.0.0.1:4000/`.
4. When the status turns green (**Healthy**), navigate to your public domain in your browser.

### Step 6: Enable Auto-Deploy (Continuous Deployment)
1. In Dokploy, go to the **Webhooks** or **AutoDeploy** section of your service.
2. Enable **AutoDeploy** (or copy the Webhook URL into your GitHub repository settings under **Webhooks**).
3. Subsequent pushes to the `main` branch will automatically trigger builds and deployments.

---

## Deploying on a Standalone VPS (Docker Compose)

If you are deploying directly on a Linux VPS without Dokploy, follow this workflow with an external reverse proxy (Caddy or Nginx).

### Step 1: Clone Repository & Prepare Directory
```bash
git clone https://github.com/your-org/moftkhar.git /opt/moftkhar
cd /opt/moftkhar
```

### Step 2: Configure `.env`
Create `/opt/moftkhar/.env`:
```dotenv
PAYLOAD_SECRET=YOUR_PAYLOAD_SECRET
PREVIEW_SECRET=YOUR_PREVIEW_SECRET

PAYLOAD_PUBLIC_SERVER_URL=https://shop.example.com
NEXT_PUBLIC_SERVER_URL=https://shop.example.com

MELIPAYAMAK_USERNAME=your_username
MELIPAYAMAK_CREDENTIAL=your_password
MELIPAYAMAK_FROM=5000xxxxxx

# Local Docker network (since Dokploy network is absent)
DOCKER_PROXY_NETWORK=webfather-local
DOCKER_PROXY_NETWORK_EXTERNAL=false
```

### Step 3: Expose or Proxy Port 4000
To expose port 4000 locally to your host reverse proxy, update or override `docker-compose.yml` with a `docker-compose.override.yml`:
```yaml
services:
  payload:
    ports:
      - "127.0.0.1:4000:4000"
```

### Step 4: Configure Reverse Proxy

#### Option A: Caddy (Recommended for simplicity and auto-SSL)
In `/etc/caddy/Caddyfile`:
```caddy
shop.example.com {
    reverse_proxy 127.0.0.1:4000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
    }
}
```

#### Option B: Nginx
In `/etc/nginx/sites-available/shop.example.com`:
```nginx
server {
    server_name shop.example.com;

    client_max_body_size 50M; # Required for media file uploads

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 5: Start the Container Stack
```bash
docker compose up -d --build
```
Verify the container status:
```bash
docker compose ps
docker compose logs -f payload
```

---

## Initial Setup & Catalog Seeding

### 1. Create the First Admin Account
1. Open `https://your-domain.com/admin` in your web browser.
2. The initial boot screen will prompt you to create the first administrative user (Email and Password).
3. Once registered, you have full access to the Payload CMS admin interface.

### 2. Seed the Moftkhar Catalog (Optional)
To populate sample categories, products, and brand SVG logos:
```bash
# In Dokploy: open the Terminal tab in your Compose service, or run:
docker compose exec payload pnpm seed:moftkhar
```

**What the seed script does:**
- Seeds 5 categories and 14 digital/subscription products.
- Uploads official brand SVG logos (e.g., Notion, Framer, CapCut, Duolingo, Lovable, Manus) to the `Media` collection.
- Idempotent: Checks slugs and logo markers before creating records; running it multiple times will not duplicate items.
- **Draft Status**: All seeded categories and products are initially saved as **drafts**.

### 3. Review and Publish Products
1. Navigate to `/admin/collections/categories` and `/admin/collections/products`.
2. Review descriptions, variants, and prices in Iranian Toman (`TOMAN`).
3. Set the status of items ready for the public to **Published**.
4. The storefront's public queries filter out drafts; only published items appear on the public website.

### 4. Verify Mobile OTP Authentication
1. Open the storefront in an incognito window.
2. Click on the Login / Account icon.
3. Enter an Iranian mobile number (`09xxxxxxxxx`).
4. If Melipayamak is configured, an SMS containing the 5-digit OTP code will arrive.
5. If running in mock mode, check the server logs (`docker compose logs payload`) for:
   ```txt
   [SMS MOCK] Sent OTP code "12345" to phone "09123456789"
   ```
6. Enter the OTP code to log in. Check `/admin/collections/otp-events` to verify event auditing.

---

## Updates & Database Migrations

### Migration Workflow
1. When you add or modify Payload collections or schema locally, generate a migration:
   ```bash
   pnpm payload migrate:create
   ```
2. Test the migration locally:
   ```bash
   pnpm payload migrate
   ```
3. Commit both the migration TypeScript file and the JSON snapshot in `src/migrations/` to your Git repository:
   ```bash
   git add src/migrations/
   git commit -m "feat: add schema migration"
   git push origin main
   ```
4. Trigger a deployment in Dokploy (or push to Git if AutoDeploy is enabled).
5. **How it executes in production**:
   - The Docker build tests the migration on a temporary build database.
   - Upon container boot, `CMD ["sh", "-c", "node node_modules/payload/bin.js migrate && node server.js"]` automatically executes any unapplied migrations against `/app/data/webfather-ecommerce.db`.
   - If a migration fails, the container stops and does not boot `server.js`, preventing data corruption.

> [!WARNING]
> Migrations are forward-only. Always take a volume backup before deploying schema migrations to production.

---

## Backups & Disaster Recovery

### Understanding SQLite WAL Backups
In WAL mode, SQLite maintains changes across three files:
- `webfather-ecommerce.db` (main database)
- `webfather-ecommerce.db-wal` (write-ahead log)
- `webfather-ecommerce.db-shm` (shared-memory index)

> [!CAUTION]
> Copying `webfather-ecommerce.db` while active writes are taking place can create an inconsistent or corrupted snapshot. You must ensure writes are paused or use an atomic backup tool.

### 1. Dokploy Automated Volume Backups (Recommended)
Configure [Dokploy Volume Backups](https://docs.dokploy.com/docs/core/volume-backups) for **both** persistent volumes:
1. In Dokploy, go to **Volume Backups**.
2. **Database Backup**:
   - Select volume: `webfather_sqlite_data`
   - Destination: S3, Cloudflare R2, or remote SFTP storage.
   - Schedule: Daily or every 6 hours (`0 */6 * * *`).
   - **Crucial Setting**: Enable **Turn off Container** during backup. Dokploy pauses the container for a few seconds to capture a 100% consistent point-in-time snapshot of the database and its WAL files.
3. **Media Backup**:
   - Select volume: `webfather_media_data`
   - Schedule: Daily (`0 2 * * *`).

### 2. Manual CLI Backup
To take an immediate backup without downtime using the SQLite online backup API:
```bash
# Execute online backup directly inside the container
docker compose exec payload node -e "
  const db = require('better-sqlite3')('/app/data/webfather-ecommerce.db');
  db.backup('/app/data/backup-' + Date.now() + '.db')
    .then(() => console.log('Backup completed successfully.'))
    .catch(err => { console.error('Backup failed:', err); process.exit(1); });
"
```
Or stop the container briefly and copy the volume directory:
```bash
docker compose stop payload
docker run --rm -v webfather_sqlite_data:/data -v $(pwd)/backups:/backup alpine \
  tar czf /backup/sqlite-backup-$(date +%Y%m%d%H%M%S).tar.gz -C /data .
docker run --rm -v webfather_media_data:/media -v $(pwd)/backups:/backup alpine \
  tar czf /backup/media-backup-$(date +%Y%m%d%H%M%S).tar.gz -C /media .
docker compose start payload
```

### 3. Disaster Recovery / Restore Procedure
If restoring after hardware failure or database corruption:
1. Stop the running service:
   ```bash
   docker compose down
   ```
2. Restore the volume contents from your backup archive into the target volumes:
   ```bash
   # Restore SQLite volume
   docker run --rm -v webfather_sqlite_data:/data -v /path/to/backup:/backup alpine \
     sh -c "rm -rf /data/* && tar xzf /backup/sqlite-backup-latest.tar.gz -C /data"

   # Restore Media volume
   docker run --rm -v webfather_media_data:/media -v /path/to/backup:/backup alpine \
     sh -c "rm -rf /media/* && tar xzf /backup/media-backup-latest.tar.gz -C /media"
   ```
3. Ensure file ownership belongs to the container's `node` user (`UID: 1000`):
   ```bash
   docker run --rm -v webfather_sqlite_data:/data -v webfather_media_data:/media alpine \
     chown -R 1000:1000 /data /media
   ```
4. Start the service:
   ```bash
   docker compose up -d
   ```
5. Check logs to confirm the database opens cleanly:
   ```bash
   docker compose logs -f payload
   ```

---

## Health Monitoring & Logs

### Container Healthcheck
The container includes a built-in healthcheck configured in `docker-compose.yml`:
```yaml
healthcheck:
  test:
    - CMD
    - node
    - -e
    - "fetch('http://127.0.0.1:4000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
  interval: 30s
  timeout: 5s
  retries: 5
  start_period: 120s
```
- **start_period**: Set to `120s` to allow pending schema migrations and Next.js cold start to complete before flagging failure.
- **timeout**: `5s` per ping.

### Logging
Log retention is capped at 30 MB total using Docker's `json-file` log rotation:
```yaml
logging:
  driver: json-file
  options:
    max-size: '10m'
    max-file: '3'
```

To tail live application logs:
```bash
# In Dokploy: View the Logs tab
# On CLI:
docker compose logs -f --tail=200 payload
```

---

## Troubleshooting & FAQ

### 1. `database is locked` or `SQLITE_BUSY`
- **Cause**: Multiple processes trying to write concurrently, or an old container process holding a lock file.
- **Remedy**:
  - Verify that only **one replica** is running (`docker compose ps`).
  - The Payload SQLite adapter is configured with `busyTimeout: 5000` and `wal: true`. Ensure clean container stops so `stop_grace_period: 30s` can flush locks.
  - If a crash leaves orphan locks, restart the container: `docker compose restart payload`.

### 2. Container in restart loop / `unhealthy` status
- **Cause**: Migration failed or database permissions issue.
- **Remedy**:
  - Inspect the container logs: `docker compose logs payload`.
  - If the migration failed, review the migration SQL error.
  - Check volume permissions:
    ```bash
    docker run --rm -v webfather_sqlite_data:/data alpine ls -la /data
    ```
    Ensure files are owned by `1000:1000`.

### 3. SMS OTP is not being delivered
- **Cause**: Missing or incorrect Melipayamak credentials, insufficient credit balance, or unapproved sender line.
- **Remedy**:
  - Verify that `MELIPAYAMAK_USERNAME`, `MELIPAYAMAK_CREDENTIAL`, and `MELIPAYAMAK_FROM` are set in the Dokploy environment.
  - Test sending an OTP directly via the Melipayamak panel to verify credit and line approval.
  - If any of the three variables are missing, the server automatically routes OTPs to `ConsoleSmsProvider` (visible in container logs as `[SMS MOCK]`).

### 4. Uploaded media files return 404 or fail to upload
- **Cause**: Media volume mount issue or reverse proxy request size limit.
- **Remedy**:
  - In Nginx / Traefik, ensure `client_max_body_size` is at least `50M`.
  - Check that `/app/public/media` is writable by UID 1000:
    ```bash
    docker compose exec payload touch /app/public/media/test.txt && docker compose exec payload rm /app/public/media/test.txt
    ```

### 5. Client navigation or preview errors with wrong URL
- **Cause**: Mismatch between `PAYLOAD_PUBLIC_SERVER_URL` and `NEXT_PUBLIC_SERVER_URL`.
- **Remedy**:
  - Ensure both environment variables match your public HTTPS domain exactly (e.g., `https://moftkhar.com` without a trailing slash).
  - Because `NEXT_PUBLIC_SERVER_URL` is baked into the Next.js client-side bundle at build time, trigger a rebuild if you change this variable.
