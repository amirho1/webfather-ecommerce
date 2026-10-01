import { slugField } from 'payload'
import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: () => true,
    update: adminOnly,
  },
  admin: {
    useAsTitle: 'title',
    group: { en: 'Content', fa: 'محتوا' },
  },
  labels: {
    singular: { en: 'Category', fa: 'دسته‌بندی' },
    plural: { en: 'Categories', fa: 'دسته‌بندی‌ها' },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: { en: 'Title', fa: 'عنوان' },
      required: true,
    },
    slugField({
      position: undefined,
      overrides: (field) => ({
        ...field,
        fields: field.fields.map((subField) =>
          'name' in subField && subField.name === 'slug'
            ? { ...subField, label: { en: 'Slug', fa: 'شناسهٔ یکتا' } }
            : subField,
        ),
      }),
    }),
  ],
}
