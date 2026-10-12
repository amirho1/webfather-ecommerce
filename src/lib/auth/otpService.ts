import { randomInt } from 'node:crypto'
import { hashOtp, otpLifetimeMs } from './otp'
import getPendingOtpStore, { type PendingOtpStore } from './pendingOtpStore'

/** Persists only a phone-bound OTP hash with a 120-second Redis TTL. */
export async function storePendingOtp(
  phone: string,
  code: string,
  store: PendingOtpStore = getPendingOtpStore(),
): Promise<{ code: string; expiresAt: number }> {
  const expiresAt = Date.now() + otpLifetimeMs
  await store.save(phone, hashOtp(phone, code))
  return { code, expiresAt }
}

/** Generates and persists a six-digit code for the recipient. */
export async function generateAndStoreOtp(
  phone: string,
  store: PendingOtpStore = getPendingOtpStore(),
): Promise<{ code: string; expiresAt: number }> {
  return storePendingOtp(phone, String(randomInt(100000, 1000000)), store)
}

/** Atomically checks a code, tracks failures, and consumes successful codes. */
export async function verifyPendingOtp(
  phone: string,
  code: string,
  store: PendingOtpStore = getPendingOtpStore(),
): Promise<{ valid: boolean; error?: string }> {
  const result = await store.verify(phone, hashOtp(phone, code))
  if (result === 'valid') return { valid: true }
  if (result === 'tooMany') return { valid: false, error: 'تعداد دفعات تلاش بیش از حد مجاز است.' }
  if (result === 'invalid') return { valid: false, error: 'کد نامعتبر است.' }
  return { valid: false, error: 'کد نامعتبر یا منقضی شده است.' }
}

/** Removes an undelivered code after SMS dispatch fails. */
export async function clearPendingOtp(
  phone: string,
  store: PendingOtpStore = getPendingOtpStore(),
): Promise<void> {
  await store.clear(phone)
}
