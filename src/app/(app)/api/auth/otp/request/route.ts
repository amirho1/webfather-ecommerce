import { isIranianMobile, normalizePhone } from '@/lib/auth/mobileSession'
import { sendOtp } from '@/lib/auth/otp'
import {
  checkAndReserveRateLimit,
  extractClientIp,
  logOtpAttemptToDb,
} from '@/lib/auth/otpRateLimiter'
import { clearPendingOtp, generateAndStoreOtp, storePendingOtp } from '@/lib/auth/otpService'
import config from '@payload-config'
import { NextResponse, type NextRequest } from 'next/server'
import { getPayload } from 'payload'

export const runtime = 'nodejs'

/**
 * Handles OTP dispatch requests for verified Iranian mobile phone numbers.
 *
 * @param request - Incoming Next.js HTTP request containing mobile phone number.
 * @returns JSON response with ok status or localized error message.
 */
export async function POST(request: NextRequest) {
  const data = await request.json().catch(() => null)
  const phone = normalizePhone(typeof data?.phoneNumber === 'string' ? data.phoneNumber : '')

  if (!isIranianMobile(phone)) {
    return NextResponse.json({ error: 'شماره موبایل معتبر نیست.' }, { status: 400 })
  }

  // Extract client IP safely (no global shared unknown-IP lock)
  const clientIp = extractClientIp(request)

  // 1. Fast in-memory rate limit and cooldown check (zero database table bloat from spammers)
  const rateLimitResult = checkAndReserveRateLimit(phone, clientIp)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: rateLimitResult.error || 'درخواست‌های زیادی ثبت شده است.' },
      { status: rateLimitResult.statusCode || 429 },
    )
  }

  const payload = await getPayload({ config })

  // 2. Generate and store OTP in dedicated verification registry (no ghost user creation in DB!)
  const { code } = await generateAndStoreOtp(phone)

  // 3. Record attempt in rate limiter and DB audit log
  await logOtpAttemptToDb(payload, phone, clientIp)

  // 4. Dispatch SMS via SMS provider (updates pending hash if provider generates its own code)
  try {
    const finalCode = await sendOtp(phone, code)
    if (finalCode !== code) {
      await storePendingOtp(phone, finalCode)
    }
  } catch (error) {
    payload.logger.error({ err: error }, 'OTP delivery failed')
    await clearPendingOtp(phone)
    return NextResponse.json(
      { error: 'ارسال پیامک ممکن نشد. بعداً دوباره تلاش کنید.' },
      { status: 503 },
    )
  }

  return NextResponse.json({ ok: true })
}
