import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

import dotenv from 'dotenv'

const buildEnvironment = dotenv.parse(readFileSync('/run/secrets/build_env'))

if (!buildEnvironment.PAYLOAD_SECRET) {
  throw new Error('PAYLOAD_SECRET must be set in .env for the Docker build')
}

const env = {
  ...buildEnvironment,
  ...process.env,
  DATABASE_URL: 'file:/app/data/webfather-ecommerce.db',
  PAYLOAD_SECRET: buildEnvironment.PAYLOAD_SECRET,
}

for (const [command, args] of [
  [process.execPath, ['node_modules/payload/bin.js', 'migrate']],
  ['pnpm', ['build']],
]) {
  const result = spawnSync(command, args, { env, stdio: 'inherit' })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
