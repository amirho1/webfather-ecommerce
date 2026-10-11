import {
    createMobileSession,
    isIranianMobile,
    mobileCookieName,
    mobileCookieOptions,
    normalizeDigits,
    normalizePhone,
} from '@/lib/auth/mobileSession';
import { verifyPendingOtp } from '@/lib/auth/otpService';
import { findOrCreateVerifiedMobileUser } from '@/lib/auth/userService';
import config from '@payload-config';
import { NextResponse, type NextRequest } from 'next/server';
import { getPayload } from 'payload';

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const data = await request.json().catch(() => null)
  const phone = normalizePhone(typeof data?.phoneNumber === 'string' ? data.phoneNumber : '')
  const code = normalizeDigits(typeof data?.code === 'string' ? data.code : '')

  if (!isIranianMobile(phone) || !/^[0-9]{6}$/.test(code)) {
    return NextResponse.json({ error: 'کد معتبر نیست.' }, { status: 400 })
  }

  // 1. Verify OTP against independent pending registry
  const verification = verifyPendingOtp(phone, code)
  if (!verification.valid) {
    return NextResponse.json(
      { error: verification.error || 'کد نامعتبر یا منقضی شده است.' },
      { status: 400 },
    )
  }

  const payload = await getPayload({ config })

  // 2. Only now find or create the verified user in the database (no ghost users!)
  const verifiedUser = await findOrCreateVerifiedMobileUser(payload, phone)

  // 3. Set mobile session cookie and return verified user
  const response = NextResponse.json({
    ok: true,
    user: {
      id: verifiedUser.id,
      phoneNumber: verifiedUser.phoneNumber,
      name: verifiedUser.name,
      roles: verifiedUser.roles,
    },
  })

  response.cookies.set(
    mobileCookieName,
    createMobileSession(verifiedUser.id, verifiedUser.sessionVersion ?? 0),
    mobileCookieOptions(request),
  )

  return response
}
