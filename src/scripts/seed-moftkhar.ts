import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Payload, PayloadRequest } from 'payload'

const categories = [
  { slug: 'ai', title: 'هوش مصنوعی', subtitle: 'باهوش‌تر کار کن', iconKey: 'sparkles' },
  {
    slug: 'design',
    title: 'طراحی و تولید محتوا',
    subtitle: 'خلاقیتت رو آزاد کن',
    iconKey: 'palette',
  },
  { slug: 'dev', title: 'برنامه‌نویسی و توسعه', subtitle: 'ایده‌هات رو بساز', iconKey: 'code' },
  { slug: 'work', title: 'بهره‌وری و مدیریت', subtitle: 'منظم‌تر پیش برو', iconKey: 'grid' },
  {
    slug: 'learn',
    title: 'آموزش و یادگیری',
    subtitle: 'هر روز یه قدم جلوتر',
    iconKey: 'graduation',
  },
] as const

const products = [
  {
    slug: 'gemini-ai-pro',
    title: 'Gemini AI Pro',
    category: 'ai',
    description: 'یک همراه هوشمند برای ایده‌ها و کارهای روزمره‌ات',
    price: 390000,
    logo: 'google-gemini',
    color: '#f1f4ff',
    featured: true,
  },
  {
    slug: 'lovable-lite',
    title: 'Lovable Lite',
    category: 'ai',
    description: 'ایده‌ات رو با کمک هوش مصنوعی به یک اپ تبدیل کن',
    price: 490000,
    logo: 'lovable',
    color: '#fff0ec',
    featured: true,
  },
  {
    slug: 'capcut-pro',
    title: 'CapCut Pro',
    category: 'design',
    description: 'ویدیوهای خلاقانه بساز و متفاوت دیده شو',
    price: 290000,
    logo: 'capcut',
    color: '#f3f3f3',
    featured: true,
  },
  {
    slug: 'replit-core',
    title: 'Replit Core',
    category: 'dev',
    description: 'از اولین خط کد تا اجرای ایده، توی یک محیط',
    price: 590000,
    logo: 'replit',
    color: '#fff1e9',
    featured: false,
  },
  {
    slug: 'manus-pro',
    title: 'Manus Pro',
    category: 'ai',
    description: 'کارهای پیچیده رو به دستیار هوشمندت بسپار',
    price: 690000,
    logo: 'manus',
    color: '#f5f3ee',
    featured: false,
  },
  {
    slug: 'n8n-starter',
    title: 'n8n Starter',
    category: 'ai',
    description: 'ابزارها رو به هم وصل کن و کارهای تکراری رو کم کن',
    price: 450000,
    logo: 'n8n',
    color: '#fff0f1',
    featured: false,
  },
  {
    slug: 'warp-build',
    title: 'Warp Build',
    category: 'dev',
    description: 'تجربه‌ای تازه از توسعه در یک ترمینال هوشمند',
    price: 390000,
    logo: 'warp',
    color: '#ecf5fc',
    featured: false,
  },
  {
    slug: 'railway-hobby',
    title: 'Railway Hobby',
    category: 'dev',
    description: 'یک خانه برای پروژه‌ها و سرویس‌های بعدی تو',
    price: 250000,
    logo: 'railway',
    color: '#f3effb',
    featured: false,
  },
  {
    slug: 'framer-pro',
    title: 'Framer Pro',
    category: 'dev',
    description: 'وب‌سایت‌های زیبا بساز و ایده‌هات رو منتشر کن',
    price: 590000,
    logo: 'framer',
    color: '#f0f2ff',
    featured: false,
  },
  {
    slug: 'adobe-express',
    title: 'Adobe Express',
    category: 'design',
    description: 'از پست تا پوستر؛ جایی برای ایده‌های خلاق تو',
    price: 290000,
    logo: 'adobe',
    color: '#fff0f0',
    featured: false,
  },
  {
    slug: 'mobbin',
    title: 'Mobbin',
    category: 'design',
    description: 'برای پروژه بعدی‌ات از طراحی‌های خوب الهام بگیر',
    price: 350000,
    logo: null,
    color: '#f2f2f2',
    featured: false,
  },
  {
    slug: 'duolingo-super',
    title: 'Duolingo Super',
    category: 'learn',
    description: 'یادگیری یک زبان تازه رو به عادت هر روزت تبدیل کن',
    price: 190000,
    logo: 'duolingo',
    color: '#f0f9e8',
    featured: true,
  },
  {
    slug: 'notion-business',
    title: 'Notion Business',
    category: 'work',
    description: 'یادداشت‌ها، پروژه‌ها و کارهای تیمی؛ همه کنار هم',
    price: 490000,
    logo: 'notion',
    color: '#f4f3ef',
    featured: false,
  },
  {
    slug: 'granola-business',
    title: 'Granola Business',
    category: 'work',
    description: 'یک دفترچه هوشمند برای گفت‌وگوها و جلسه‌ها',
    price: 450000,
    logo: 'granola',
    color: '#edf7ef',
    featured: false,
  },
] as const

export async function seedMoftkhar(payload: Payload, req?: PayloadRequest) {
  const categoryIds = new Map<string, number>()
  for (const category of categories) {
    const found = await payload.find({
      collection: 'categories',
      where: { slug: { equals: category.slug } },
      limit: 1,
      draft: true,
      overrideAccess: true,
      req,
    })
    const doc =
      found.docs[0] ||
      (await payload.create({
        collection: 'categories',
        draft: true,
        overrideAccess: true,
        data: { ...category, _status: 'draft' },
        req,
      }))
    categoryIds.set(category.slug, doc.id)
  }

  const logoIds = new Map<string, number>()
  for (const logo of new Set(
    products
      .map((product) => product.logo)
      .filter((value): value is Exclude<typeof value, null> => value !== null),
  )) {
    const filename = `${logo}.svg`
    const alt = `${logo} logo`
    const found = await payload.find({
      collection: 'media',
      where: { alt: { equals: alt } },
      limit: 1,
      overrideAccess: true,
      req,
    })
    if (found.docs[0]) {
      logoIds.set(logo, found.docs[0].id)
      continue
    }
    const data = await readFile(
      path.resolve(process.cwd(), 'src/endpoints/seed/moftkhar-logos', filename),
    )
    const media = await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: { alt },
      file: { data, name: filename, mimetype: 'image/svg+xml', size: data.length },
      req,
    })
    logoIds.set(logo, media.id)
  }

  for (const product of products) {
    const found = await payload.find({
      collection: 'products',
      where: { slug: { equals: product.slug } },
      limit: 1,
      draft: true,
      overrideAccess: true,
      req,
    })
    if (found.docs[0]) continue
    await payload.create({
      collection: 'products',
      draft: true,
      overrideAccess: true,
      data: {
        slug: product.slug,
        title: product.title,
        shortDescription: product.description,
        categories: [categoryIds.get(product.category)!],
        priceInTOMANEnabled: true,
        priceInTOMAN: product.price,
        inventory: 10,
        enableVariants: false,
        featured: product.featured,
        badgeColor: product.color,
        brandLogo: product.logo ? logoIds.get(product.logo) : undefined,
        _status: 'draft',
      },
      req,
    })
  }
  payload.logger.info('Moftkhar draft catalog is ready.')
}
