import { OtpForm } from '@/components/forms/OtpForm';
import { Suspense, type ReactNode } from 'react';

export interface AuthPageWrapperProps {
  title: string
  subtitle: string
  children?: ReactNode
}

export function AuthPageWrapper({ title, subtitle, children }: AuthPageWrapperProps) {
  return (
    <div className="auth-page container">
      <div className="auth-card">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <Suspense fallback={null}>
          {children || <OtpForm />}
        </Suspense>
      </div>
    </div>
  )
}
