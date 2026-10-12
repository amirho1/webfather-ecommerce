import { generateAndStoreOtp, verifyPendingOtp } from '@/lib/auth/otpService'
import { createClient } from 'redis'
import { describe, expect, it } from 'vitest'

describe('Redis OTP persistence', () => {
  it.skipIf(!process.env.REDIS_URL)(
    'stores a hash with a TTL and consumes a valid code',
    async () => {
      const phone = `0999${String(Date.now()).slice(-7)}`
      const client = createClient({ url: process.env.REDIS_URL })
      await client.connect()
      try {
        const { code } = await generateAndStoreOtp(phone)
        const key = `otp:pending:${phone}`
        expect(await client.hGet(key, 'hash')).toMatch(/^[a-f0-9]{64}$/)
        expect(await client.ttl(key)).toBeGreaterThan(0)
        expect(await client.ttl(key)).toBeLessThanOrEqual(120)
        expect((await verifyPendingOtp(phone, '000000')).valid).toBe(false)
        expect((await verifyPendingOtp(phone, code)).valid).toBe(true)
        expect(await client.exists(key)).toBe(0)
        const second = await generateAndStoreOtp(phone)
        const simultaneous = await Promise.all([
          verifyPendingOtp(phone, second.code),
          verifyPendingOtp(phone, second.code),
        ])
        expect(simultaneous.filter((result) => result.valid)).toHaveLength(1)
      } finally {
        await client.del(`otp:pending:${phone}`)
        await client.quit()
      }
    },
  )
})
