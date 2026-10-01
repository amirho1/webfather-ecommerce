'use client'

import { Banner, useTranslation } from '@payloadcms/ui'
import React from 'react'

import { SeedButton } from './SeedButton'
import { getAdminCopy } from './copy'
import './index.scss'

const baseClass = 'before-dashboard'

export const BeforeDashboard: React.FC = () => {
  const { i18n } = useTranslation()
  const copy = getAdminCopy(i18n.language)

  return (
    <div className={baseClass} dir={i18n.language === 'fa' ? 'rtl' : 'ltr'}>
      <Banner className={`${baseClass}__banner`} type="success">
        <h4>{copy.welcome}</h4>
      </Banner>
      {copy.nextSteps}
      <ul className={`${baseClass}__instructions`}>
        <li>
          <SeedButton />
          {copy.seededIntro}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/">{copy.visitWebsite}</a>
          {copy.seededOutro}
        </li>
        <li>
          {copy.stripeIntro}
          <a href="https://dashboard.stripe.com/test/apikeys" rel="noopener noreferrer" target="_blank">
            {copy.stripeLink}
          </a>
          {copy.stripeOutro}
          <a
            href="https://github.com/payloadcms/payload/blob/3.x/templates/ecommerce/README.md#stripe"
            rel="noopener noreferrer"
            target="_blank"
          >
            {copy.readme}
          </a>
          {copy.readmeOutro}
        </li>
        <li>
          {copy.modifyIntro}
          <a href="https://payloadcms.com/docs/configuration/collections" rel="noopener noreferrer" target="_blank">
            {copy.collections}
          </a>
          {copy.andAdd}
          <a href="https://payloadcms.com/docs/fields/overview" rel="noopener noreferrer" target="_blank">
            {copy.fields}
          </a>
          {copy.asNeeded}
          <a href="https://payloadcms.com/docs/getting-started/what-is-payload" rel="noopener noreferrer" target="_blank">
            {copy.gettingStarted}
          </a>
          {copy.docs}
        </li>
      </ul>
      {copy.proTip}
      <a href="https://payloadcms.com/docs/admin/components#base-component-overrides" rel="noopener noreferrer" target="_blank">
        {copy.customComponent}
      </a>
      {copy.removeAnytime}
      <strong>{copy.config}</strong>
      {copy.configEnd}
    </div>
  )
}
