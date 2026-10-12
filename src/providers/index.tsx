import { AuthProvider } from '@/providers/Auth'
import { EcommerceProvider } from '@payloadcms/plugin-ecommerce/client/react'
import React from 'react'

import { HeaderThemeProvider } from './HeaderTheme'
import { SonnerProvider } from '@/providers/Sonner'

export const Providers: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  return (
    <AuthProvider>
      <HeaderThemeProvider>
        <SonnerProvider />
        <EcommerceProvider
          enableVariants={true}
          currenciesConfig={{
            supportedCurrencies: [
              { code: 'TOMAN', decimals: 0, label: 'Iranian Toman', symbol: 'تومان' },
            ],
            defaultCurrency: 'TOMAN',
          }}
          api={{
            cartsFetchQuery: {
              depth: 2,
              populate: {
                products: {
                  slug: true,
                  title: true,
                  gallery: true,
                  inventory: true,
                  priceInTOMAN: true,
                  brandLogo: true,
                  badgeColor: true,
                },
                variants: {
                  title: true,
                  inventory: true,
                  priceInTOMAN: true,
                },
              },
            },
          }}
          paymentMethods={[]}
        >
          {children}
        </EcommerceProvider>
      </HeaderThemeProvider>
    </AuthProvider>
  )
}
