import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { seedMoftkhar } from './seed-moftkhar'

async function main() {
  const payload = await getPayload({ config })
  await seedMoftkhar(payload)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
