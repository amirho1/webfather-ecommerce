import { createHash } from 'node:crypto'
import type { Payload } from 'payload'

export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
export const MAX_REQUESTS_PER_PHONE = 5
export const MAX_REQUESTS_PER_IP = 20
export const OTP_COOLDOWN_MS = 60 * 1000 // 1 minute

// In-memory sliding window structures
const phoneTimestamps = new Map<string, number[]>()
const ipTimestamps = new Map<string, number[]>()
const phoneCooldowns = new Map<string, number>()

let lastCleanupAt = 0
let lastDbCleanupAt = 0
let isDbCleanupRunning = false
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000
const MEMORY_THRESHOLD_SIZE = 500 // Run immediate cleanup if any Map exceeds 500 entries

/**
 * Safely extracts client IP without allowing spoofed or 'unknown' shared bucket lockouts.
 * Returns null if no reliable IP could be extracted.
 *
 * @param request - Incoming HTTP request.
 * @returns Client IP string or null.
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

/**
 * Creates a SHA-256 hash of an IP address for privacy-compliant database logging.
 *
 * @param ip - Plain IP address string.
 * @returns Hex-encoded SHA-256 hash.
 */
export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex')
}

export interface RateLimitCheckResult {
  allowed: boolean
  error?: string
  statusCode?: number
}

/**
 * Purges expired in-memory rate limiting entries across all tracking Maps.
 * Prevents memory leaks by evicting stale phone numbers, IPs, and cooldown entries.
 *
 * @param now - Reference timestamp in milliseconds (defaults to Date.now()).
 */
export function cleanupExpiredRateLimits(now: number = Date.now()): void {
  // 1. Evict expired phone cooldowns
  for (const [phone, timestamp] of phoneCooldowns.entries()) {
    if (now - timestamp >= OTP_COOLDOWN_MS) {
      phoneCooldowns.delete(phone)
    }
  }

  // 2. Evict expired phone request timestamps
  for (const [phone, timestamps] of phoneTimestamps.entries()) {
    const valid = timestamps.filter((time) => now - time < RATE_LIMIT_WINDOW_MS)
    if (valid.length === 0) {
      phoneTimestamps.delete(phone)
    } else if (valid.length < timestamps.length) {
      phoneTimestamps.set(phone, valid)
    }
  }

  // 3. Evict expired IP request timestamps
  for (const [ip, timestamps] of ipTimestamps.entries()) {
    const valid = timestamps.filter((time) => now - time < RATE_LIMIT_WINDOW_MS)
    if (valid.length === 0) {
      ipTimestamps.delete(ip)
    } else if (valid.length < timestamps.length) {
      ipTimestamps.set(ip, valid)
    }
  }
}

/**
 * Atomically checks and reserves a rate limit slot before the caller awaits.
 *
 * @param phone - Destination mobile phone number.
 * @param clientIp - Client IP address or null.
 * @returns Rate limit evaluation result.
 */
export function checkAndReserveRateLimit(
  phone: string,
  clientIp: string | null,
): RateLimitCheckResult {
  const now = Date.now()

  // 1. Check cooldown (60s)
  const lastSent = phoneCooldowns.get(phone)
  if (lastSent) {
    if (now - lastSent < OTP_COOLDOWN_MS) {
      return {
        allowed: false,
        error: 'لطفاً یک دقیقه صبر کنید.',
        statusCode: 429,
      }
    }
    // Cooldown expired: clean up key immediately
    phoneCooldowns.delete(phone)
  }

  // 2. Check per-phone sliding window limit
  const phoneAttempts = (phoneTimestamps.get(phone) || []).filter(
    (time) => now - time < RATE_LIMIT_WINDOW_MS,
  )

  if (phoneAttempts.length === 0) {
    phoneTimestamps.delete(phone)
  } else {
    phoneTimestamps.set(phone, phoneAttempts)
  }

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

    if (ipAttempts.length === 0) {
      ipTimestamps.delete(clientIp)
    } else {
      ipTimestamps.set(clientIp, ipAttempts)
    }

    if (ipAttempts.length >= MAX_REQUESTS_PER_IP) {
      return {
        allowed: false,
        error: 'درخواست‌های زیادی از این شبکه ثبت شده است. بعداً دوباره تلاش کنید.',
        statusCode: 429,
      }
    }
  }

  phoneCooldowns.set(phone, now)
  phoneTimestamps.set(phone, [...phoneAttempts, now])
  if (clientIp) {
    ipTimestamps.set(clientIp, [...(ipTimestamps.get(clientIp) || []), now])
  }

  const isTimeForCleanup = now - lastCleanupAt >= CLEANUP_INTERVAL_MS
  const isThresholdReached =
    phoneTimestamps.size > MEMORY_THRESHOLD_SIZE ||
    ipTimestamps.size > MEMORY_THRESHOLD_SIZE ||
    phoneCooldowns.size > MEMORY_THRESHOLD_SIZE
  if (isTimeForCleanup || isThresholdReached) {
    lastCleanupAt = now
    cleanupExpiredRateLimits(now)
  }

  return { allowed: true }
}

/**
 * Persists an already reserved attempt in Payload otpEvents.
 *
 * @param payload - Payload CMS instance.
 * @param phone - Destination phone number.
 * @param clientIp - Client IP address or null.
 */
export async function logOtpAttemptToDb(
  payload: Payload,
  phone: string,
  clientIp: string | null,
): Promise<void> {
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

  const now = Date.now()
  if (!isDbCleanupRunning && now - lastDbCleanupAt >= CLEANUP_INTERVAL_MS) {
    isDbCleanupRunning = true
    lastDbCleanupAt = now
    void cleanupOldOtpEvents(payload).finally(() => {
      isDbCleanupRunning = false
    })
  }
}

/**
 * Background retention/pruning policy for database records.
 * Deletes otpEvents older than 24 hours to prevent unbounded table growth.
 *
 * @param payload - Payload CMS instance.
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

/**
 * Returns diagnostic size counts for in-memory rate limiting structures.
 *
 * @returns Map size counts for phone timestamps, IP timestamps, and cooldowns.
 */
export function getRateLimiterMemoryStats(): {
  phones: number
  ips: number
  cooldowns: number
} {
  return {
    phones: phoneTimestamps.size,
    ips: ipTimestamps.size,
    cooldowns: phoneCooldowns.size,
  }
}

/**
 * Resets all in-memory rate limiter structures. Useful for test isolation.
 */
export function resetRateLimiterMemory(): void {
  phoneTimestamps.clear()
  ipTimestamps.clear()
  phoneCooldowns.clear()
  lastCleanupAt = 0
  lastDbCleanupAt = 0
}
