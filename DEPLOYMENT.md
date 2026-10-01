# Deploy with Dokploy

Deploy this application as a Git-backed **Docker Compose** service in Dokploy.
The image builds against an empty, temporary SQLite database. At container
startup, Payload applies pending migrations to the persistent database. No
server-side build script or database snapshot is needed.

## Set up the Compose service

1. Create a Compose service in Dokploy, choose **Docker Compose** (not Docker
   Stack), connect this repository, and set the Compose path to
   `./docker-compose.yml`. Docker Stack does not support the `build` section.
2. In the **Environment** tab, set the variables below. Dokploy writes them to
   `.env` beside the Compose file; this service loads that file with `env_file`.
3. In the **Domains** tab, add the public hostname and route it to container
   port **4000**. Enable HTTPS for the domain. Dokploy adds the routing labels
   for the Compose service.
4. Click **Deploy**. Enable AutoDeploy or the Git webhook if you want pushes to
   trigger subsequent deployments. Use the deployment logs and service health
   status to check the result.

See Dokploy's [Compose guide](https://docs.dokploy.com/docs/core/docker-compose)
and [Domains guide](https://docs.dokploy.com/docs/core/docker-compose/domains)
for the current UI steps.

## Environment

Set these values in Dokploy before the first deployment:

| Variable | Value |
| --- | --- |
| `PAYLOAD_SECRET` | A long, stable random value; keep it unchanged across deployments. |
| `PREVIEW_SECRET` | A separate value for draft preview links. |
| `PAYLOAD_PUBLIC_SERVER_URL` | Public HTTPS URL, such as `https://shop.example.com`. |
| `NEXT_PUBLIC_SERVER_URL` | The same public HTTPS URL; embedded in the client build. |
| `STRIPE_SECRET_KEY` | Stripe secret key. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Matching Stripe publishable key; embedded in the client build. |
| `STRIPE_WEBHOOKS_SIGNING_SECRET` | Signing secret for the Stripe webhook endpoint. |

For example, replace every placeholder before deploying:

```dotenv
PAYLOAD_SECRET=replace-with-a-stable-random-value
PREVIEW_SECRET=replace-with-a-different-random-value
PAYLOAD_PUBLIC_SERVER_URL=https://shop.example.com
NEXT_PUBLIC_SERVER_URL=https://shop.example.com
STRIPE_SECRET_KEY=sk_live_replace-me
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_replace-me
STRIPE_WEBHOOKS_SIGNING_SECRET=whsec_replace-me
```

Compose sets `DATABASE_URL` inside the container to
`file:/app/data/webfather-ecommerce.db`. The `DATABASE_URL` in `.env.example`
is for running the app outside Docker. `COMPANY_NAME`, `SITE_NAME`, and the
social variables may also be set in Dokploy. Register
`https://shop.example.com/api/payments/stripe/webhooks` in Stripe with your
actual domain.

The image build uses a dummy Payload secret and an empty database. It does not
read production secrets or data. The two `NEXT_PUBLIC_*` build arguments have
defaults so the Dockerfile can build without them, but production must set the
real public URL and Stripe key in Dokploy because client code embeds their
build-time values.

## Volumes and network

SQLite data persists in the named volume `webfather_sqlite_data` at
`/app/data`; uploads persist in `webfather_media_data` at
`/app/public/media`. Docker creates either volume on first deployment and
reuses it on updates. If an existing deployment used different names, set
`SQLITE_VOLUME_NAME` and `MEDIA_VOLUME_NAME` to those exact names **before**
deploying. Keep the names and `PAYLOAD_SECRET` stable. Do not remove volumes
when updating the service, and run only one replica because SQLite has one
writer.

The service joins the existing `dokploy-network` by default. If Dokploy uses
another proxy network, set `DOCKER_PROXY_NETWORK` to its name. For local
Compose use without Dokploy, set both `DOCKER_PROXY_NETWORK=webfather-local`
and `DOCKER_PROXY_NETWORK_EXTERNAL=false`; Compose will create that network.

## Updates

Commit a Payload migration for each production schema change, then push the
commit or click **Deploy** in Dokploy. The image build migrates only its
temporary database. The container applies new migrations to the persistent
SQLite volume before starting the server. The home page reads the live
database, so published content does not depend on what existed at build time.

Check the deployment logs if migration fails; the server will not start until
the migration succeeds. Keep a backup before deploying schema changes.

## Backups and restore

Configure [Dokploy Volume Backups](https://docs.dokploy.com/docs/core/volume-backups)
for **both** named volumes. For the SQLite volume, enable **Turn off
Container** during backup so the database and its WAL files are captured
consistently. Back up the media volume as well because database records can
refer to uploaded files.

Before restoring, stop the service and preserve the current volumes. Restore
both backups using their original volume names, then deploy the same or a
compatible application revision. Dokploy's volume restore requires a target
volume that is not in use; follow its restore instructions for replacing an
existing volume.
