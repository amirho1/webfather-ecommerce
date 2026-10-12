import type { User } from '@/payload-types'
import { randomBytes } from 'node:crypto'
import type { Payload } from 'payload'

export async function findUserByPhone(payload: Payload, phone: string): Promise<User | null> {
  const result = await payload.find({
    collection: 'users',
    where: { phoneNumber: { equals: phone } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })
  return (result.docs[0] as User) || null
}

export async function findOrCreateVerifiedMobileUser(
  payload: Payload,
  phone: string,
): Promise<User> {
  const existing = await findUserByPhone(payload, phone)
  if (existing) {
    if (!existing.phoneVerified) {
      const updated = await payload.update({
        collection: 'users',
        id: existing.id,
        data: {
          phoneVerified: true,
        },
        overrideAccess: true,
      })
      return updated as User
    }
    return existing
  }

  // Create new customer user with verified mobile
  const newUser = await payload.create({
    collection: 'users',
    data: {
      username: phone,
      email: `${phone}@mobile.moftkhar.invalid`,
      phoneNumber: phone,
      password: randomBytes(32).toString('hex'),
      roles: ['customer'],
      phoneVerified: true,
    },
    overrideAccess: true,
  })

  return newUser as User
}
