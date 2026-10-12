'use client'
import { useAuth } from '@/providers/Auth';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export const LogoutPage = () => {
  const { logout } = useAuth()
  const [done, setDone] = useState(false)
  useEffect(() => {
    void logout().finally(() => setDone(true))
  }, [logout])
  return (
    <div className="auth-page container">
      <div className="auth-card">
        <h1>{done ? 'از حساب خارج شدی.' : 'در حال خروج…'}</h1>
        {done && (
          <Link className="action primary" href="/shop">
            بازگشت به فروشگاه
          </Link>
        )}
      </div>
    </div>
  )
}
