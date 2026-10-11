import { randomInt } from 'node:crypto';
import { hashOtp, matchesOtp, otpLifetimeMs } from './otp';

export interface PendingOtpEntry {
  hash: string
  expiresAt: number
  attempts: number
  createdAt: number
}

// In-memory pending OTP registry with independent storage
const pendingOtps = new Map<string, PendingOtpEntry>()

export function generateAndStoreOtp(phone: string): { code: string; expiresAt: number } {
  const code = String(randomInt(100000, 1000000))
  const now = Date.now()
  const expiresAt = now + otpLifetimeMs

  pendingOtps.set(phone, {
    hash: hashOtp(phone, code),
    expiresAt,
    attempts: 0,
    createdAt: now,
  })

  return { code, expiresAt }
}

export function verifyPendingOtp(phone: string, code: string): { valid: boolean; error?: string } {
  const entry = pendingOtps.get(phone)
  const now = Date.now()

  if (!entry) {
    return { valid: false, error: 'کد نامعتبر یا منقضی شده است.' }
  }

  if (now > entry.expiresAt) {
    pendingOtps.delete(phone)
    return { valid: false, error: 'کد منقضی شده است.' }
  }

  if (entry.attempts >= 5) {
    pendingOtps.delete(phone)
    return { valid: false, error: 'تعداد دفعات تلاش بیش از حد مجاز است.' }
  }

  if (!matchesOtp(phone, code, entry.hash)) {
    entry.attempts += 1
    return { valid: false, error: 'کد نامعتبر است.' }
  }

  // Valid OTP, consume it
  pendingOtps.delete(phone)
  return { valid: true }
}

export function clearPendingOtp(phone: string): void {
  pendingOtps.delete(phone)
}
