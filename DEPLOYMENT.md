# Deploy on a Dokploy server

This guide deploys the Payload storefront with Docker Compose on the server
that runs Dokploy. Dokploy's Traefik handles HTTPS and routing. Run
`scripts/docker-deploy.sh` over SSH because the Docker build needs a snapshot
of the persistent SQLite volume. Dokploy's normal Compose **Deploy** button
does not run that preparation step. This app is managed by Docker Compose on
the host, so use `docker compose` for deployments and logs rather than the
Dokploy Compose dashboard. See [Dokploy's Compose guide](https://docs.dokploy.com/docs/core/docker-compose)
and [manual domain routing](https://docs.dokploy.com/docs/core/docker-compose/domains).

## 1. Prepare the server and domain

1. Provision a Linux server with SSH access and [install Dokploy](https://docs.dokploy.com/docs/core/installation).
   Its standard installation creates `dokploy-network`, uses ports 80 and 443
   for Traefik, and exposes the Dokploy UI on port 3000. Docker Compose 2.17+
   is needed for the extra build context.
2. Point the domain's DNS A record, and AAAA record if used, to the server.
   Allow inbound TCP 80 and 443. The app listens on container port 4000 and
   does not publish that port on the host.
3. SSH to the server with an account that can run Docker. Confirm that
   `docker compose version` works and `docker network inspect dokploy-network`
   finds the proxy network. If your proxy uses a different network, set
   `DOCKER_PROXY_NETWORK` in `.env`.

The Dokploy Compose override adds Traefik labels for the domain, HTTPS using
the `letsencrypt` resolver, and an HTTP-to-HTTPS redirect. `APP_DOMAIN` must
be a hostname such as `shop.example.com`, without `https://`.

## 2. Put the project on the server

Clone the repository into a stable directory, for example:

```sh
git clone <your-repository-url> ~/webfather-ecommerce
cd ~/webfather-ecommerce
```

Configure Git access for the server first if the repository is private. Run
the remaining commands from the repository root.

## 3. Configure `.env`

```sh
cp .env.example .env
vi .env
```

Set these values before the first deployment:

| Variable | Value |
| --- | --- |
| `COMPOSE_FILE` | `docker-compose.yml:docker-compose.dokploy.yml` on the Linux server; adds Traefik routing. |
| `APP_DOMAIN` | Your hostname only, for example `shop.example.com`. |
| `PAYLOAD_SECRET` | A long, stable random value. Generate one with `openssl rand -hex 32` and keep it across deployments. |
| `PREVIEW_SECRET` | A separate random value for draft preview links. |
| `PAYLOAD_PUBLIC_SERVER_URL` | The public HTTPS URL, for example `https://shop.example.com`. |
| `NEXT_PUBLIC_SERVER_URL` | The same public HTTPS URL; embedded in the Next.js build. |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...` or `sk_live_...`). |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Matching Stripe publishable key (`pk_test_...` or `pk_live_...`); embedded in the build. |
| `STRIPE_WEBHOOKS_SIGNING_SECRET` | The `whsec_...` signing secret for the Stripe webhook endpoint. |

For example, the deployment-specific part of `.env` should look like this
after replacing the domain and secret placeholders:

```dotenv
COMPOSE_FILE=docker-compose.yml:docker-compose.dokploy.yml
APP_DOMAIN=shop.example.com
PAYLOAD_SECRET=replace-with-a-stable-random-value
PREVIEW_SECRET=replace-with-a-different-random-value
PAYLOAD_PUBLIC_SERVER_URL=https://shop.example.com
NEXT_PUBLIC_SERVER_URL=https://shop.example.com
STRIPE_SECRET_KEY=sk_live_replace-me
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_replace-me
STRIPE_WEBHOOKS_SIGNING_SECRET=whsec_replace-me
```

`COMPANY_NAME` and `SITE_NAME` control footer text. The example's
`DATABASE_URL` is for running outside Docker: Compose sets the container URL
to `file:/app/data/webfather-ecommerce.db`. Compose also fixes `NODE_ENV` to
`production` and `PORT` to `4000`.

Optional deployment variables are `DOCKER_PROXY_NETWORK` (default
`dokploy-network`), `SQLITE_VOLUME_NAME` (default `webfather_sqlite_data`),
and `MEDIA_VOLUME_NAME` (default `webfather_media_data`). Keep volume names
stable after deployment so future releases find the same data. The script
sets `SQLITE_SNAPSHOT_DIR` temporarily; remove any
`SQLITE_SNAPSHOT_DIR=./` line from `.env` if present. The Compose fallback
path only lets inspection commands parse the configuration; it does not
prepare a database for a direct build.

The `.env` file is excluded from Git and the normal Docker build context.
Docker supplies it to the build as a secret. Dokploy's Environment UI does
not configure this SSH-managed checkout; edit the server's `.env` file.

If accepting Stripe payments, register
`https://shop.example.com/api/payments/stripe/webhooks` in Stripe, replacing
the hostname with yours. Copy that endpoint's signing secret into `.env`.
This is the [Payload ecommerce Stripe webhook path](https://payloadcms.com/docs/ecommerce/payments).

## 4. Build and start

```sh
./scripts/docker-deploy.sh
docker compose ps
docker compose logs --tail=100 payload
```

The script creates the SQLite volume and file if needed, then takes a
consistent SQLite snapshot in a temporary host directory. The Docker builder
receives that snapshot as a read-only extra context, migrates a temporary
copy, and runs `next build` against it. This lets `generateStaticParams` read
the database. Only after the image builds does Compose start the new
container, which runs pending migrations against the persistent volume. The
script removes the temporary snapshot when it exits.

Neither the database snapshot nor `.env` is copied into the final image.
SQLite persists in `webfather_sqlite_data` at `/app/data`; uploads persist in
`webfather_media_data` at `/app/public/media`. Run one replica because SQLite
has one writer. To build without restarting the service, use
`./scripts/docker-deploy.sh --build-only`.

Once DNS and HTTPS are ready, open your domain and `/admin` to create the
first Payload admin account. The healthcheck requests `/`; `docker compose
ps` should report `healthy` after startup.

## 5. Update the application

From the same checkout on the server:

```sh
cd ~/webfather-ecommerce
git pull --ff-only
./scripts/docker-deploy.sh
```

Commit a Payload migration for each production schema change. The build
migrates only its temporary database copy; the live volume is migrated at
container startup. `generateStaticParams` runs with the snapshot taken for
each build, so rebuild after adding pages that should be generated at build
time. A failed build leaves the running container in place. A direct `docker
compose up --build` or Dokploy UI deploy does not prepare the snapshot.

## 6. Back up and restore

Back up SQLite while the app is running with SQLite's snapshot operation,
not a plain copy of the live `.db` file. This writes `payload-backup.db` to
the current host directory:

```sh
docker compose exec -T payload rm -f /tmp/payload-backup.db
docker compose exec -T payload node -e "const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync('/app/data/webfather-ecommerce.db'); db.exec(\"VACUUM INTO '/tmp/payload-backup.db'\"); db.close()"
docker compose cp payload:/tmp/payload-backup.db ./payload-backup.db
```

Back up the `webfather_media_data` volume too; database records can refer to
uploaded files there. To restore SQLite, preserve a copy of the current
volume, then stop the app, replace the file, remove old WAL/SHM sidecars,
and rebuild against the restored data:

```sh
docker compose stop payload
docker compose cp ./payload-backup.db payload:/app/data/webfather-ecommerce.db
docker compose run --rm --no-deps --user root --entrypoint sh payload -c 'rm -f /app/data/webfather-ecommerce.db-wal /app/data/webfather-ecommerce.db-shm && chown 1000:1000 /app/data/webfather-ecommerce.db'
./scripts/docker-deploy.sh
```

Keep the SQLite and media volumes when updating or recreating containers.
Do not remove them during a normal deployment.
