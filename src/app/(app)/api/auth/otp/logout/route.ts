import {
  authenticateMobileSession,
  mobileCookieName,
  mobileCookieOptions,
} from '@/lib/auth/mobileSession'
import config from '@payload-config'
import { NextResponse, type NextRequest } from 'next/server'
import { getPayload } from 'payload'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const payload = await getPayload({ config })
  const user = await authenticateMobileSession(payload, request.headers)

  if (user)
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { sessionVersion: (user.sessionVersion ?? 0) + 1 },
      overrideAccess: true,
    })
  const response = NextResponse.json({ ok: true })
  response.cookies.set(mobileCookieName, '', { ...mobileCookieOptions(request), maxAge: 0 })
  return response
}
