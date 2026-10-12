import { createHmac, timingSafeEqual } from 'node:crypto'
import { getSmsProvider } from './sms/smsProvider'

export const otpLifetimeMs = 120 * 1000
export const otpCooldownMs = 60 * 1000

/**
 * Computes an HMAC-SHA256 signature for an OTP code bound to a specific phone number.
 *
 * @param phone - The recipient phone number.
 * @param code - The OTP code to sign.
 * @returns Hex-encoded HMAC hash.
 */
export function hashOtp(phone: string, code: string): string {
  if (!process.env.PAYLOAD_SECRET) throw new Error('PAYLOAD_SECRET is required')
  return createHmac('sha256', process.env.PAYLOAD_SECRET).update(`${phone}:${code}`).digest('hex')
}

/**
 * Validates an OTP code against an expected hash using timing-safe comparison.
 *
 * @param phone - The recipient phone number.
 * @param code - The submitted candidate code.
 * @param expected - The stored expected HMAC hash.
 * @returns True if the candidate code matches the expected hash.
 */
export function matchesOtp(phone: string, code: string, expected: string): boolean {
  const actual = Buffer.from(hashOtp(phone, code), 'hex')
  const stored = Buffer.from(expected, 'hex')
  return actual.length === stored.length && timingSafeEqual(actual, stored)
}

/**
 * Dispatches an OTP to the given phone number via the active SMS provider.
 * Returns the final delivered OTP code (either provider-generated or initial fallback).
 *
 * @param phone - Destination Iranian mobile phone number.
 * @param code - Pre-generated candidate OTP code.
 * @returns The final delivered OTP code.
 */
export async function sendOtp(phone: string, code: string): Promise<string> {
  const provider = getSmsProvider()
  const result = await provider.sendOtp(phone, code)
  return result?.code ?? code
}
