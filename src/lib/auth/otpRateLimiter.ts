import { createHash } from 'node:crypto';
import type { Payload } from 'payload';

export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
export const MAX_REQUESTS_PER_PHONE = 5
export const MAX_REQUESTS_PER_IP = 20
export const OTP_COOLDOWN_MS = 60 * 1000 // 1 minute

// In-memory sliding window structures
const phoneTimestamps = new Map<string, number[]>()
const ipTimestamps = new Map<string, number[]>()
const phoneCooldowns = new Map<string, number>()

let lastCleanupAt = 0
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000 // Prune DB at most once per hour

/**
 * Safely extracts client IP without allowing spoofed or 'unknown' shared bucket lockouts.
 * Returns null if no reliable IP could be extracted.
 */
export function extractClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first && first !== 'unknown' && first !== 'undefined') {
      return first
    }
  }

  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp && realIp !== 'unknown' && realIp !== 'undefined') {
    return realIp
  }

  return null
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex')
}

export interface RateLimitCheckResult {
  allowed: boolean
  error?: string
  statusCode?: number
}

/**
 * Fast in-memory rate limit and cooldown check.
 * This runs BEFORE any database writes or expensive queries.
 */
export function checkRateLimit(phone: string, clientIp: string | null): RateLimitCheckResult {
  const now = Date.now()

  // 1. Check cooldown (60s)
  const lastSent = phoneCooldowns.get(phone)
  if (lastSent && now - lastSent < OTP_COOLDOWN_MS) {
    return {
      allowed: false,
      error: 'لطفاً یک دقیقه صبر کنید.',
      statusCode: 429,
    }
  }

  // 2. Check per-phone sliding window limit
  const phoneAttempts = (phoneTimestamps.get(phone) || []).filter(
    (time) => now - time < RATE_LIMIT_WINDOW_MS,
  )
  phoneTimestamps.set(phone, phoneAttempts)

  if (phoneAttempts.length >= MAX_REQUESTS_PER_PHONE) {
    return {
      allowed: false,
      error: 'درخواست‌های زیادی برای این شماره ثبت شده است. بعداً دوباره تلاش کنید.',
      statusCode: 429,
    }
  }

  // 3. Check per-IP sliding window limit only if clientIp is known
  if (clientIp) {
    const ipAttempts = (ipTimestamps.get(clientIp) || []).filter(
      (time) => now - time < RATE_LIMIT_WINDOW_MS,
    )
    ipTimestamps.set(clientIp, ipAttempts)

    if (ipAttempts.length >= MAX_REQUESTS_PER_IP) {
      return {
        allowed: false,
        error: 'درخواست‌های زیادی از این شبکه ثبت شده است. بعداً دوباره تلاش کنید.',
        statusCode: 429,
      }
    }
  }

  return { allowed: true }
}

/**
 * Records a successful rate-limited attempt in memory and asynchronously in Payload otpEvents.
 */
export async function recordOtpAttempt(
  payload: Payload,
  phone: string,
  clientIp: string | null,
): Promise<void> {
  const now = Date.now()

  // Update in-memory trackers
  phoneCooldowns.set(phone, now)

  const pAttempts = phoneTimestamps.get(phone) || []
  pAttempts.push(now)
  phoneTimestamps.set(phone, pAttempts)

  if (clientIp) {
    const iAttempts = ipTimestamps.get(clientIp) || []
    iAttempts.push(now)
    ipTimestamps.set(clientIp, iAttempts)
  }

  // Persist event to DB for multi-instance auditing
  const ipHash = clientIp ? hashIp(clientIp) : 'anonymous'
  try {
    await payload.create({
      collection: 'otpEvents',
      data: {
        phoneNumber: phone,
        ipHash,
      },
      overrideAccess: true,
    })
  } catch (err) {
    payload.logger.warn({ err }, 'Failed to persist otpEvent')
  }

  // Lazily run background cleanup if interval passed
  if (now - lastCleanupAt > CLEANUP_INTERVAL_MS) {
    lastCleanupAt = now
    void cleanupOldOtpEvents(payload)
  }
}

/**
 * Background retention/pruning policy.
 * Deletes otpEvents older than 24 hours to prevent unbounded table growth.
 */
export async function cleanupOldOtpEvents(payload: Payload): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    await payload.delete({
      collection: 'otpEvents',
      where: {
        createdAt: {
          less_than: cutoff,
        },
      },
      overrideAccess: true,
    })
  } catch (err) {
    payload.logger.warn({ err }, 'Failed to clean up old otpEvents')
  }
}
