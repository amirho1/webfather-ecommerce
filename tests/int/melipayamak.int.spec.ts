import { sendOtp } from '@/lib/auth/otp'
import { generateAndStoreOtp, storePendingOtp, verifyPendingOtp } from '@/lib/auth/otpService'
import MelipayamakConsoleSmsProvider from '@/lib/auth/sms/melipayamakConsoleSmsProvider'
import {
  ConsoleSmsProvider,
  getSmsProvider,
  MelipayamakSmsProvider,
  setSmsProvider,
} from '@/lib/auth/sms/smsProvider'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import createMemoryPendingOtpStore from '../helpers/memoryPendingOtpStore'

describe('Melipayamak JWT / Console SMS Provider', () => {
  const originalEnv = process.env
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    process.env = { ...originalEnv }
    // Reset default provider in smsProvider module
    setSmsProvider(null as unknown as ConsoleSmsProvider)
  })

  afterEach(() => {
    process.env = originalEnv
    globalThis.fetch = originalFetch
    setSmsProvider(new ConsoleSmsProvider())
    vi.restoreAllMocks()
  })

  describe('MelipayamakConsoleSmsProvider unit tests', () => {
    it('throws error when JWT is not configured', async () => {
      delete process.env.MELIPAYAMAK_JWT
      const provider = new MelipayamakConsoleSmsProvider({ jwt: '' })
      await expect(provider.sendOtp('09123456789')).rejects.toThrow(
        'Melipayamak JWT is not configured',
      )
    })

    it('sends OTP request to console endpoint and returns generated code', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ code: '849201', status: 'عملیات موفق' }),
      })
      globalThis.fetch = mockFetch

      const provider = new MelipayamakConsoleSmsProvider({ jwt: 'test-token-123' })
      const result = await provider.sendOtp('09123456789', '000000')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://console.melipayamak.com/api/send/otp/test-token-123',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: '09123456789' }),
        }),
      )
      expect(result).toEqual({ code: '849201' })
    })

    it('falls back to provided code when console returns success without explicit code', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: 'عملیات موفق' }),
      })
      globalThis.fetch = mockFetch

      const provider = new MelipayamakConsoleSmsProvider({ jwt: 'test-token-123' })
      const result = await provider.sendOtp('09123456789', '654321')

      expect(result).toEqual({ code: '654321' })
    })

    it('rejects when Melipayamak returns unapproved template status', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: 'مستلزم تنظیم و تأیید مدیر' }),
      })
      globalThis.fetch = mockFetch

      const provider = new MelipayamakConsoleSmsProvider({ jwt: 'test-token-123' })
      await expect(provider.sendOtp('09123456789')).rejects.toThrow(
        'Melipayamak rejected OTP: مستلزم تنظیم و تأیید مدیر',
      )
    })

    it('rejects when Melipayamak returns invalid key error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: 'کلید کنسول معتبر نیست' }),
      })
      globalThis.fetch = mockFetch

      const provider = new MelipayamakConsoleSmsProvider({ jwt: 'bad-key' })
      await expect(provider.sendOtp('09123456789')).rejects.toThrow(
        'Melipayamak rejected OTP: کلید کنسول معتبر نیست',
      )
    })

    it('throws error on non-200 HTTP response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: async () => 'Bad Gateway',
      })
      globalThis.fetch = mockFetch

      const provider = new MelipayamakConsoleSmsProvider({ jwt: 'test-token-123' })
      await expect(provider.sendOtp('09123456789')).rejects.toThrow('Melipayamak HTTP 502')
    })
  })

  describe('Provider resolution precedence', () => {
    it('prioritizes MelipayamakConsoleSmsProvider when MELIPAYAMAK_JWT is configured', () => {
      process.env.MELIPAYAMAK_JWT = 'jwt-token-active'
      process.env.MELIPAYAMAK_USERNAME = 'legacy-user'
      process.env.MELIPAYAMAK_CREDENTIAL = 'legacy-pass'
      process.env.MELIPAYAMAK_FROM = '50001234'

      const provider = getSmsProvider()
      expect(provider).toBeInstanceOf(MelipayamakConsoleSmsProvider)
    })

    it('falls back to legacy MelipayamakSmsProvider when only legacy credentials exist', () => {
      delete process.env.MELIPAYAMAK_JWT
      process.env.MELIPAYAMAK_USERNAME = 'legacy-user'
      process.env.MELIPAYAMAK_CREDENTIAL = 'legacy-pass'
      process.env.MELIPAYAMAK_FROM = '50001234'

      const provider = getSmsProvider()
      expect(provider).toBeInstanceOf(MelipayamakSmsProvider)
    })

    it('falls back to ConsoleSmsProvider when neither is configured', () => {
      delete process.env.MELIPAYAMAK_JWT
      delete process.env.MELIPAYAMAK_USERNAME
      delete process.env.MELIPAYAMAK_CREDENTIAL
      delete process.env.MELIPAYAMAK_FROM

      const provider = getSmsProvider()
      expect(provider).toBeInstanceOf(ConsoleSmsProvider)
    })
  })

  describe('Dynamic OTP Code Workflow Integration', () => {
    it('replaces pending code with provider-generated code and successfully verifies', async () => {
      const phone = '09129876543'
      const otpStore = createMemoryPendingOtpStore()
      const { code: generatedCode } = await generateAndStoreOtp(phone, otpStore)

      // Mock provider that generates its own 6-digit code
      const remoteProvider = {
        async sendOtp() {
          return { code: '918273' }
        },
      }
      setSmsProvider(remoteProvider)

      const finalCode = await sendOtp(phone, generatedCode)
      expect(finalCode).toBe('918273')

      // Update pending registry as route handler does
      await storePendingOtp(phone, finalCode, otpStore)

      // Initial generated code should no longer be valid
      const initialVerify = await verifyPendingOtp(phone, generatedCode, otpStore)
      expect(initialVerify.valid).toBe(false)

      // Delivered remote code must verify successfully
      const finalVerify = await verifyPendingOtp(phone, '918273', otpStore)
      expect(finalVerify.valid).toBe(true)
    })

    it('interacts with live Melipayamak Console API when RUN_LIVE_SMS_TEST is enabled', async () => {
      const isLiveEnabled = process.env.RUN_LIVE_SMS_TEST === 'true'
      const liveJwt = process.env.MELIPAYAMAK_JWT
      const testPhone = process.env.TEST_PHONE_NUMBER
      if (!isLiveEnabled || !liveJwt || !testPhone) return

      // Use real unmocked fetch for live validation
      globalThis.fetch = originalFetch
      const liveProvider = new MelipayamakConsoleSmsProvider({ jwt: liveJwt })

      // Melipayamak returns 'مستلزم تنظیم و تأیید مدیر' when OTP template awaits panel approval
      await expect(liveProvider.sendOtp(testPhone)).rejects.toThrow()
    }, 20000)
  })
})
