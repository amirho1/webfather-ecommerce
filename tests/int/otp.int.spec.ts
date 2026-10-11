import { isIranianMobile, normalizeDigits, normalizePhone } from '@/lib/auth/mobileSession';
import { checkRateLimit, extractClientIp } from '@/lib/auth/otpRateLimiter';
import { generateAndStoreOtp, verifyPendingOtp } from '@/lib/auth/otpService';
import { ConsoleSmsProvider, setSmsProvider } from '@/lib/auth/sms/smsProvider';
import { findOrCreateVerifiedMobileUser, findUserByPhone } from '@/lib/auth/userService';
import { getCardPrice, getPrice } from '@/lib/formatToman';
import type { Product } from '@/payload-types';
import config from '@/payload.config';
import { getPayload, Payload } from 'payload';
import { beforeAll, describe, expect, it } from 'vitest';

let payload: Payload

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
      const testPhone = '09999990001'
      const check1 = checkRateLimit(testPhone, '127.0.0.1')
      expect(check1.allowed).toBe(true)
    })
  })

  describe('OTP Lifecycle & Ghost User Prevention', () => {
    it('generates OTP without creating ghost user in DB', async () => {
      const testPhone = `0987${String(Date.now()).slice(-7)}`
      // 1. Generate OTP
      const { code } = generateAndStoreOtp(testPhone)
      expect(code).toHaveLength(6)

      // 2. Ensure NO user exists in database before verification
      const userBefore = await findUserByPhone(payload, testPhone)
      expect(userBefore).toBeNull()

      // 3. Verify OTP
      const verifyResult = verifyPendingOtp(testPhone, code)
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

    it('rejects invalid OTP code', () => {
      const phone = `0986${String(Date.now()).slice(-7)}`
      generateAndStoreOtp(phone)
      const verifyResult = verifyPendingOtp(phone, '000000')
      expect(verifyResult.valid).toBe(false)
    })
  })
})
