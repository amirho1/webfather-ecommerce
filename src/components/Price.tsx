'use client'

import React from 'react'
import { formatToman } from '@/lib/formatToman'

type Props = {
  className?: string
  currencyCode?: string
  currencyCodeClassName?: string
  as?: 'span' | 'p'
} & ({ amount: number; highestAmount?: never; lowestAmount?: never } | { amount?: never; highestAmount: number; lowestAmount: number })

export const Price = ({ amount, className, highestAmount, lowestAmount, as = 'p' }: Props & React.ComponentProps<'p'>) => {
  const Element = as
  if (typeof amount === 'number') return <Element className={className}>{formatToman(amount)}</Element>
  if (typeof lowestAmount === 'number') {
    const label = highestAmount !== lowestAmount
      ? `${formatToman(lowestAmount)} تا ${formatToman(highestAmount)}`
      : formatToman(lowestAmount)
    return <Element className={className}>{label}</Element>
  }
  return null
}
