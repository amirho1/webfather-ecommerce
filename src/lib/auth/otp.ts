import { createHmac, timingSafeEqual } from 'node:crypto';
import { getSmsProvider } from './sms/smsProvider';

export const otpLifetimeMs = 5 * 60 * 1000
export const otpCooldownMs = 60 * 1000

export function hashOtp(phone: string, code: string): string {
  if (!process.env.PAYLOAD_SECRET) throw new Error('PAYLOAD_SECRET is required')
  return createHmac('sha256', process.env.PAYLOAD_SECRET).update(`${phone}:${code}`).digest('hex')
}

export function matchesOtp(phone: string, code: string, expected: string): boolean {
  const actual = Buffer.from(hashOtp(phone, code), 'hex')
  const stored = Buffer.from(expected, 'hex')
  return actual.length === stored.length && timingSafeEqual(actual, stored)
}

export async function sendOtp(phone: string, code: string): Promise<void> {
  const provider = getSmsProvider()
  await provider.sendOtp(phone, code)
}
