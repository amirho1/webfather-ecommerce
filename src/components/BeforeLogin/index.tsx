'use client'

import { useTranslation } from '@payloadcms/ui'
import React from 'react'

import { getAdminCopy } from '../BeforeDashboard/copy'

export const BeforeLogin: React.FC = () => {
  const { i18n } = useTranslation()
  const copy = getAdminCopy(i18n.language)

  return (
    <div dir={i18n.language === 'fa' ? 'rtl' : 'ltr'}>
      <p>
        <b>{copy.loginWelcome}</b>
        {copy.loginDescription}
        <a href={`${process.env.PAYLOAD_PUBLIC_SERVER_URL}/login`}>{copy.customerLogin}</a>
        {copy.loginOutro}
      </p>
    </div>
  )
}
