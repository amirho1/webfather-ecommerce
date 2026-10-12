import { isIranianMobile, normalizeDigits, normalizePhone } from '@/lib/auth/mobileSession'
import {
  checkAndReserveRateLimit,
  cleanupExpiredRateLimits,
  extractClientIp,
  getRateLimiterMemoryStats,
  logOtpAttemptToDb,
  resetRateLimiterMemory,
} from '@/lib/auth/otpRateLimiter'
import { generateAndStoreOtp, verifyPendingOtp } from '@/lib/auth/otpService'
import createMemoryPendingOtpStore from '../helpers/memoryPendingOtpStore'
import { ConsoleSmsProvider, setSmsProvider } from '@/lib/auth/sms/smsProvider'
import { findOrCreateVerifiedMobileUser, findUserByPhone } from '@/lib/auth/userService'
import { getCardPrice, getPrice } from '@/lib/formatToman'
import type { Product } from '@/payload-types'
import config from '@/payload.config'
import { getPayload, Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

let payload: Payload
const otpStore = createMemoryPendingOtpStore()

describe('Storefront & Auth Core Tests', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
    setSmsProvider(new ConsoleSmsProvider())
  })

  describe('Phone Normalization & Validation (DRY)', () => {
    it('normalizes Persian and Arabic digits and punctuation', () => {
      expect(normalizeDigits('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789')
      expect(normalizeDigits('٠٩١٢٣٤٥٦٧٨٩')).toBe('09123456789')
      expect(normalizePhone('۰۹۱۲-۳۴۵ ۶۷۸۹')).toBe('09123456789')
    })

    it('validates Iranian mobile numbers', () => {
      expect(isIranianMobile('09123456789')).toBe(true)
      expect(isIranianMobile('09351234567')).toBe(true)
      expect(isIranianMobile('08123456789')).toBe(false)
      expect(isIranianMobile('0912345678')).toBe(false)
      expect(isIranianMobile('091234567890')).toBe(false)
      expect(isIranianMobile('abcd')).toBe(false)
    })
  })

  describe('Price Resolution (DRY & Variant Sorting)', () => {
    it('resolves price from product or variant', () => {
      const simpleProduct = { priceInTOMAN: 250000 } as Partial<Product>
      expect(getPrice(simpleProduct)).toBe(250000)

      const variant = { priceInTOMAN: 180000 }
      expect(getPrice(simpleProduct, variant)).toBe(180000)
    })

    it('computes card price from minimum variant price', () => {
      const productWithVariants = {
        enableVariants: true,
        priceInTOMAN: null,
        variants: {
          docs: [
            { id: 1, priceInTOMAN: 350000, _status: 'published' },
            { id: 2, priceInTOMAN: 200000, _status: 'published' },
            { id: 3, priceInTOMAN: 500000, _status: 'published' },
          ],
        },
      } as unknown as Partial<Product>

      expect(getCardPrice(productWithVariants)).toBe(200000)
    })
  })

  describe('Rate Limiter & Safe IP Extraction', () => {
    it('extracts client IP safely without shared unknown bucket', () => {
      const reqWithForwarded = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '198.51.100.1, 10.0.0.1' },
      })
      expect(extractClientIp(reqWithForwarded)).toBe('198.51.100.1')

      const reqWithRealIp = new Request('http://localhost', {
        headers: { 'x-real-ip': '203.0.113.195' },
      })
      expect(extractClientIp(reqWithRealIp)).toBe('203.0.113.195')

      const reqUnknown = new Request('http://localhost', {
        headers: { 'x-real-ip': 'unknown' },
      })
      expect(extractClientIp(reqUnknown)).toBeNull()
    })

    it('enforces cooldown and request count', () => {
      resetRateLimiterMemory()
      const testPhone = '09999990001'
      const check1 = checkAndReserveRateLimit(testPhone, '127.0.0.1')
      expect(check1.allowed).toBe(true)
      expect(checkAndReserveRateLimit(testPhone, '127.0.0.1').allowed).toBe(false)
    })

    it('purges expired in-memory rate limiting maps to prevent memory leaks', async () => {
      resetRateLimiterMemory()
      const phoneA = '09121112233'
      const ipA = '198.51.100.50'

      checkAndReserveRateLimit(phoneA, ipA)
      await logOtpAttemptToDb(payload, phoneA, ipA)
      const statsBefore = getRateLimiterMemoryStats()
      expect(statsBefore.phones).toBe(1)
      expect(statsBefore.ips).toBe(1)
      expect(statsBefore.cooldowns).toBe(1)

      // Simulate time jumping 2 hours into the future (past 60s cooldown and 1h sliding window)
      const futureTime = Date.now() + 2 * 60 * 60 * 1000
      cleanupExpiredRateLimits(futureTime)

      const statsAfter = getRateLimiterMemoryStats()
      expect(statsAfter.phones).toBe(0)
      expect(statsAfter.ips).toBe(0)
      expect(statsAfter.cooldowns).toBe(0)
    })
  })

  describe('OTP Lifecycle & Ghost User Prevention', () => {
    it('generates OTP without creating ghost user in DB', async () => {
      const testPhone = `0987${String(Date.now()).slice(-7)}`
      // 1. Generate OTP
      const { code } = await generateAndStoreOtp(testPhone, otpStore)
      expect(code).toHaveLength(6)

      // 2. Ensure NO user exists in database before verification
      const userBefore = await findUserByPhone(payload, testPhone)
      expect(userBefore).toBeNull()

      // 3. Verify OTP
      const verifyResult = await verifyPendingOtp(testPhone, code, otpStore)
      expect(verifyResult.valid).toBe(true)

      // 4. Create verified user only after code is verified
      const userAfter = await findOrCreateVerifiedMobileUser(payload, testPhone)
      expect(userAfter).toBeDefined()
      expect(userAfter.phoneNumber).toBe(testPhone)
      expect(userAfter.phoneVerified).toBe(true)

      // Cleanup
      await payload.delete({
        collection: 'users',
        where: { phoneNumber: { equals: testPhone } },
      })
    })

    it('rejects invalid OTP code', async () => {
      const phone = `0986${String(Date.now()).slice(-7)}`
      await generateAndStoreOtp(phone, otpStore)
      const verifyResult = await verifyPendingOtp(phone, '000000', otpStore)
      expect(verifyResult.valid).toBe(false)
    })

    it('cleans up abandoned expired pending OTPs from storage', async () => {
      const abandonedPhone = '09120009988'
      await generateAndStoreOtp(abandonedPhone, otpStore)
      expect(otpStore.count()).toBeGreaterThan(0)

      otpStore.expire(abandonedPhone)

      // Verifying after expiration should report expired/invalid and not exist
      const verifyResult = await verifyPendingOtp(abandonedPhone, '123456', otpStore)
      expect(verifyResult.valid).toBe(false)
    })
  })
})
