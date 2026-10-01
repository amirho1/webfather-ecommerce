# Production Docker deployment

The production stack runs one Payload/Next.js process on port `4000`. Attach the
reverse proxy to the external Docker network named `dokploy-network`, or set
`DOCKER_PROXY_NETWORK` to the name of the network already used by the proxy.
The app does not publish a host port.

Copy `.env.example` to `.env` and set production values before building. In
particular, use a strong `PAYLOAD_SECRET`, the public HTTPS site URL for both
server URL variables, and live Stripe credentials when accepting payments.
`DATABASE_URL` in the app container is fixed to the persistent SQLite file at
`/app/data/webfather-ecommerce.db`.

Start or update the service with:

```sh
./scripts/docker-deploy.sh
```

The script creates the SQLite volume if needed, takes a consistent snapshot of
its database, and supplies that snapshot to the Docker build. The builder runs
Payload migrations against a temporary copy before `generateStaticParams`
queries it. Neither the snapshot nor `.env` is copied into the final image.
The running database is migrated when the new container starts. Use
`./scripts/docker-deploy.sh --build-only` to build without replacing the running
service. Run the script for each deployment; a direct `docker compose up --build`
does not prepare the required build snapshot.

The named volumes are `webfather_sqlite_data` (mounted at `/app/data`) and
`webfather_media_data` (mounted at `/app/public/media`). Payload's media
collection writes there; product gallery images reference that collection.
The SQLite directory also holds SQLite WAL/SHM sidecars.

## SQLite backup and restore

For a consistent online backup, use SQLite's backup API through the running
container rather than copying the live database file. This command writes a
backup to the host's current directory:

```sh
docker compose exec -T payload node -e "const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync('/app/data/webfather-ecommerce.db'); db.exec(\"VACUUM INTO '/tmp/payload-backup.db'\"); db.close()" \
  && docker compose cp payload:/tmp/payload-backup.db ./payload-backup.db
```

Restore from a backup with the service stopped. Keep a copy of the current
volume before replacing its database:

```sh
docker compose stop payload
docker compose cp ./payload-backup.db payload:/app/data/webfather-ecommerce.db
docker compose run --rm --no-deps --user root --entrypoint sh payload -c 'chown node:node /app/data/webfather-ecommerce.db'
docker compose up -d --no-build payload
```

`VACUUM INTO` produces a consistent database snapshot and does not copy
potentially mismatched WAL/SHM files. Media backups should be made from the
`webfather_media_data` volume as well.

The service invokes `payload migrate` before starting Next.js. The initial
schema migration is checked in under `src/migrations`; create and commit a new
Payload migration for each production schema change so the container applies
it before serving requests. Keep the service at one replica because all
instances would share a single SQLite writer.
