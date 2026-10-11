import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { Payload } from 'payload';

export const mobileCookieName = 'moftkhar-mobile'
export const mobileSessionAge = 60 * 60 * 24 * 14

export function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
}

export function normalizePhone(value: string): string {
  return normalizeDigits(value).replace(/[\s-]/g, '')
}

export function isIranianMobile(value: string): boolean {
  return /^09[0-9]{9}$/.test(value)
}

function getCookie(headers: Headers, name: string): string | undefined {
  return headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}

export function createMobileSession(userId: number | string, sessionVersion: number): string {
  if (!process.env.PAYLOAD_SECRET) throw new Error('PAYLOAD_SECRET is required')
  return jwt.sign(
    { sub: String(userId), sv: sessionVersion, kind: 'mobile' },
    process.env.PAYLOAD_SECRET,
    {
      expiresIn: mobileSessionAge,
      issuer: 'moftkhar',
    },
  )
}

export async function authenticateMobileSession(payload: Payload, headers: Headers) {
  const token = getCookie(headers, mobileCookieName)
  if (!token || !process.env.PAYLOAD_SECRET) return null

  try {
    const claims = jwt.verify(token, process.env.PAYLOAD_SECRET, {
      issuer: 'moftkhar',
    }) as JwtPayload
    if (claims.kind !== 'mobile' || !claims.sub) return null
    const user = await payload.findByID({
      collection: 'users',
      id: claims.sub,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
    })
    if (!user?.phoneVerified) return null
    if ((user.sessionVersion ?? 0) !== claims.sv) return null
    return { ...user, collection: 'users' as const }
  } catch {
    return null
  }
}

export function mobileCookieOptions(request: Request) {
  const secure =
    request.headers.get('x-forwarded-proto') === 'https' ||
    new URL(request.url).protocol === 'https:'
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: mobileSessionAge,
  }
}
