import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { adminOrSelf } from '@/access/adminOrSelf'
import { checkRole } from '@/access/utilities'
import { isIranianMobile } from '@/lib/auth/mobileSession'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: ({ req: { user } }) => checkRole(['admin'], user),
    create: adminOnly,
    delete: adminOnly,
    read: adminOrSelf,
    unlock: adminOnly,
    update: adminOrSelf,
  },
  admin: {
    group: { en: 'Users', fa: 'کاربران' },
    defaultColumns: ['name', 'email', 'roles'],
    useAsTitle: 'name',
  },
  labels: {
    singular: { en: 'User', fa: 'کاربر' },
    plural: { en: 'Users', fa: 'کاربران' },
  },
  auth: {
    tokenExpiration: 1209600,
    loginWithUsername: { allowEmailLogin: true, requireEmail: false },
    strategies: [
      {
        name: 'moftkhar-mobile-session',
        authenticate: async ({ payload, headers }) => {
          const { authenticateMobileSession } = await import('@/lib/auth/mobileSession')
          return { user: await authenticateMobileSession(payload, headers) }
        },
      },
    ],
  },
  fields: [
    {
      name: 'phoneNumber',
      type: 'text',
      unique: true,
      index: true,
      label: { en: 'Mobile number', fa: 'شماره موبایل' },
      validate: (value: unknown) =>
        !value ||
        (typeof value === 'string' && isIranianMobile(value)) ||
        'Enter an Iranian mobile number (09xxxxxxxxx).',
      access: { update: adminOnlyFieldAccess },
    },
    {
      name: 'phoneVerified',
      type: 'checkbox',
      defaultValue: false,
      access: { create: adminOnlyFieldAccess, update: adminOnlyFieldAccess },
    },
    {
      name: 'otp',
      type: 'text',
      hidden: true,
      access: {
        read: adminOnlyFieldAccess,
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
    },
    {
      name: 'otpExpiresAt',
      type: 'date',
      hidden: true,
      access: {
        read: adminOnlyFieldAccess,
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
    },
    {
      name: 'otpAttempts',
      type: 'number',
      defaultValue: 0,
      hidden: true,
      access: {
        read: adminOnlyFieldAccess,
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
    },
    {
      name: 'otpLastSentAt',
      type: 'date',
      hidden: true,
      access: {
        read: adminOnlyFieldAccess,
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
    },
    {
      name: 'sessionVersion',
      type: 'number',
      defaultValue: 0,
      hidden: true,
      access: {
        read: adminOnlyFieldAccess,
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
    },
    {
      name: 'name',
      type: 'text',
      label: { en: 'Name', fa: 'نام' },
    },
    {
      name: 'roles',
      type: 'select',
      access: {
        create: adminOnlyFieldAccess,
        read: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      defaultValue: ['customer'],
      hasMany: true,
      options: [
        {
          label: { en: 'Administrator', fa: 'مدیر' },
          value: 'admin',
        },
        {
          label: { en: 'Customer', fa: 'مشتری' },
          value: 'customer',
        },
      ],
    },
    {
      name: 'orders',
      type: 'join',
      collection: 'orders',
      on: 'customer',
      admin: {
        allowCreate: false,
        defaultColumns: ['id', 'createdAt', 'total', 'currency', 'items'],
      },
    },
    {
      name: 'cart',
      type: 'join',
      collection: 'carts',
      on: 'customer',
      admin: {
        allowCreate: false,
        defaultColumns: ['id', 'createdAt', 'total', 'currency', 'items'],
      },
    },
    {
      name: 'addresses',
      type: 'join',
      collection: 'addresses',
      on: 'customer',
      admin: {
        allowCreate: false,
        defaultColumns: ['id'],
      },
    },
  ],
}
