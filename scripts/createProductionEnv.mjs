import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Creates a private production environment file without replacing existing secrets. */
function createProductionEnv(outputPath) {
  const environment = `# Production environment for https://moftkhar.ir
NODE_ENV=production
PORT=4000
PAYLOAD_PUBLIC_SERVER_URL=https://moftkhar.ir
NEXT_PUBLIC_SERVER_URL=https://moftkhar.ir
PAYLOAD_SECRET=${randomBytes(48).toString('base64url')}
PREVIEW_SECRET=${randomBytes(48).toString('base64url')}

COMPANY_NAME="مفت خر"
SITE_NAME="مفت خر"

# Docker Compose overrides these with its internal service addresses.
DATABASE_URL=file:/app/data/webfather-ecommerce.db
REDIS_URL=redis://redis:6379

# Add your Melipayamak token before enabling live OTP delivery.
MELIPAYAMAK_JWT=
MELIPAYAMAK_USERNAME=
MELIPAYAMAK_CREDENTIAL=
MELIPAYAMAK_FROM=

SQLITE_VOLUME_NAME=webfather_sqlite_data
MEDIA_VOLUME_NAME=webfather_media_data
REDIS_VOLUME_NAME=webfather_redis_data
DOCKER_PROXY_NETWORK=dokploy-network
DOCKER_PROXY_NETWORK_EXTERNAL=true
`

  writeFileSync(outputPath, environment, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
  process.stdout.write(`Created ${outputPath}\n`)
}

createProductionEnv(resolve(process.cwd(), process.argv[2] ?? '.env'))
