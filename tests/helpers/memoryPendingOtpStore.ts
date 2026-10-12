import { otpLifetimeMs } from '@/lib/auth/otp';
import type { OtpVerification, PendingOtpStore } from '@/lib/auth/pendingOtpStore';

/** Provides the Redis OTP contract for deterministic integration tests. */
export default function createMemoryPendingOtpStore() {
  const entries = new Map<string, { hash: string; attempts: number; expiresAt: number }>()
  const store: PendingOtpStore & {
    count: () => number
    expire: (phone: string) => void
  } = {
    async save(phone, hash) {
      entries.set(phone, { hash, attempts: 0, expiresAt: Date.now() + otpLifetimeMs })
    },
    async verify(phone, expectedHash): Promise<OtpVerification> {
      const entry = entries.get(phone)
      if (!entry || entry.expiresAt <= Date.now()) {
        entries.delete(phone)
        return 'missing'
      }
      if (entry.attempts >= 5) {
        entries.delete(phone)
        return 'tooMany'
      }
      if (entry.hash !== expectedHash) {
        entry.attempts += 1
        return 'invalid'
      }
      entries.delete(phone)
      return 'valid'
    },
    async clear(phone) {
      entries.delete(phone)
    },
    count() {
      return entries.size
    },
    expire(phone) {
      const entry = entries.get(phone)
      if (entry) entry.expiresAt = 0
    },
  }
  return store
}
