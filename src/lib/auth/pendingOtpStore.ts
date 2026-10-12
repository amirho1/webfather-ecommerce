import { createClient } from 'redis'
import { otpLifetimeMs } from './otp'

export type OtpVerification = 'missing' | 'valid' | 'invalid' | 'tooMany'

export interface PendingOtpStore {
  save: (phone: string, hash: string) => Promise<void>
  verify: (phone: string, expectedHash: string) => Promise<OtpVerification>
  clear: (phone: string) => Promise<void>
}

const VERIFY_OTP_SCRIPT = `
local hash = redis.call('HGET', KEYS[1], 'hash')
if not hash then return 0 end
local attempts = tonumber(redis.call('HGET', KEYS[1], 'attempts') or '0')
if attempts >= 5 then
  redis.call('DEL', KEYS[1])
  return 3
end
if hash ~= ARGV[1] then
  redis.call('HINCRBY', KEYS[1], 'attempts', 1)
  return 2
end
redis.call('DEL', KEYS[1])
return 1
`

let clientPromise: Promise<ReturnType<typeof createClient>> | null = null

/** Connects lazily so builds and unrelated routes do not require Redis. */
async function getRedisClient(): Promise<ReturnType<typeof createClient>> {
  if (!clientPromise) {
    const url = process.env.REDIS_URL
    if (!url) throw new Error('REDIS_URL is required for OTP storage')
    const client = createClient({ url })
    client.on('error', (error) => console.error('Redis OTP connection error', error))
    clientPromise = client
      .connect()
      .then(() => client)
      .catch((error) => {
        clientPromise = null
        throw error
      })
  }
  return clientPromise
}

/** Builds the Redis key for a normalized phone number. */
function pendingOtpKey(phone: string): string {
  return `otp:pending:${phone}`
}

const pendingOtpStore: PendingOtpStore = {
  async save(phone, hash) {
    const client = await getRedisClient()
    await client
      .multi()
      .hSet(pendingOtpKey(phone), { hash, attempts: '0' })
      .expire(pendingOtpKey(phone), otpLifetimeMs / 1000)
      .exec()
  },
  async verify(phone, expectedHash) {
    const client = await getRedisClient()
    const result = await client.eval(VERIFY_OTP_SCRIPT, {
      keys: [pendingOtpKey(phone)],
      arguments: [expectedHash],
    })
    if (result === 1) return 'valid'
    if (result === 2) return 'invalid'
    if (result === 3) return 'tooMany'
    return 'missing'
  },
  async clear(phone) {
    const client = await getRedisClient()
    await client.del(pendingOtpKey(phone))
  },
}

/** Returns the shared Redis-backed pending OTP store. */
export default function getPendingOtpStore(): PendingOtpStore {
  return pendingOtpStore
}
