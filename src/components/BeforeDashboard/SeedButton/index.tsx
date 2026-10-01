'use client'

import React, { Fragment, useCallback, useState, MouseEvent } from 'react'
import { toast, useTranslation } from '@payloadcms/ui'

import { getAdminCopy } from '../copy'

import './index.scss'

export const SeedButton: React.FC = () => {
  const { i18n } = useTranslation()
  const copy = getAdminCopy(i18n.language)
  const [loading, setLoading] = useState(false)
  const [seeded, setSeeded] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const handleClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()

      if (seeded) {
        toast.info(copy.alreadySeeded)
        return
      }
      if (loading) {
        toast.info(copy.alreadySeeding)
        return
      }
      if (error) {
        toast.error(copy.seedError)
        return
      }

      setLoading(true)

      try {
        toast.promise(
          new Promise((resolve, reject) => {
            try {
              fetch('/next/seed', { method: 'POST', credentials: 'include' })
                .then((res) => {
                  if (res.ok) {
                    resolve(true)
                    setSeeded(true)
                  } else {
                    reject(copy.seedFailed)
                  }
                })
                .catch((error) => {
                  reject(error)
                })
            } catch (error) {
              reject(error)
            }
          }),
          {
            loading: copy.seedLoading,
            success: (
              <div>
                {copy.seedSuccess}
                <a target="_blank" href="/">
                  {copy.visitWebsite}
                </a>
              </div>
            ),
            error: copy.seedFailed,
          },
        )
      } catch (err) {
        setError(err)
      }
    },
    [loading, seeded, error, copy],
  )

  let message = ''
  if (loading) message = copy.loadingSuffix
  if (seeded) message = copy.doneSuffix
  if (error) message = copy.errorSuffix.replace('{{error}}', String(error))

  return (
    <Fragment>
      <button className="seedButton" dir={i18n.language === 'fa' ? 'rtl' : 'ltr'} onClick={handleClick}>
        {copy.seedButton}
      </button>
      {message}
    </Fragment>
  )
}
