import type { CollectionConfig } from 'payload'

export const OtpEvents: CollectionConfig = {
  slug: 'otpEvents',
  admin: { hidden: true },
  access: {
    create: () => false,
    read: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'phoneNumber', type: 'text', required: true, index: true },
    { name: 'ipHash', type: 'text', required: true, index: true },
  ],
}
