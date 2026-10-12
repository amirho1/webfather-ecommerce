import { seedMoftkhar } from '@/scripts/seed-moftkhar'
import type { Payload, PayloadRequest } from 'payload'

export const seed = async ({
  payload,
  req,
}: {
  payload: Payload
  req?: PayloadRequest
}): Promise<void> => {
  await seedMoftkhar(payload, req)
}
