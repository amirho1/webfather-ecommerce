import type { Media } from '@/payload-types';
import Image from 'next/image';
import Link from 'next/link';

export function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <Link href="/" className={`brand ${footer ? 'brand-footer' : ''}`}>
      <Image src="/images/moftkhar.svg" alt="" width="76" height="57" />
      <span>
        <strong>
          مفت خر<span className="brand-dot">.</span>
        </strong>
        <small>هوشمند بخر، مفت خر باش!</small>
      </span>
    </Link>
  )
}

export function ProductLogo({
  media,
  name,
  className = '',
}: {
  media?: Media | number | null
  name: string
  className?: string
}) {
  const image = media && typeof media === 'object' ? media : null
  return (
    <span className={`product-logo ${className}`} aria-hidden="true">
      {image?.url ? (
        <Image src={image.url} alt="" width="40" height="40" loading="lazy" />
      ) : (
        <span className="logo-fallback">{name.substring(0, 1)}</span>
      )}
    </span>
  )
}
