export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<void>
}

export class MelipayamakSmsProvider implements SmsProvider {
  private username?: string
  private password?: string
  private from?: string

  constructor(options?: { username?: string; password?: string; from?: string }) {
    this.username = options?.username ?? process.env.MELIPAYAMAK_USERNAME
    this.password = options?.password ?? process.env.MELIPAYAMAK_CREDENTIAL
    this.from = options?.from ?? process.env.MELIPAYAMAK_FROM
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    if (!this.username || !this.password || !this.from) {
      throw new Error('Melipayamak is not configured')
    }

    const body = new URLSearchParams({
      username: this.username,
      password: this.password,
      from: this.from,
      to: phone,
      code,
    })

    const response = await fetch('https://rest.payamak-panel.com/api/SendSMS/SendOtp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Melipayamak HTTP ${response.status}`)
    }

    const raw = await response.text()
    let result: unknown = raw
    try {
      result = JSON.parse(raw)
    } catch {
      // Melipayamak can return a plain numeric ID
    }

    const record = result && typeof result === 'object' ? (result as Record<string, unknown>) : null
    const value = record
      ? (record.ReturnValue ?? record.returnValue ?? record.Value ?? record.value)
      : result
    const recId = Number(value)

    if (!Number.isFinite(recId) || recId <= 111) {
      throw new Error(`Melipayamak rejected OTP: ${String(value).slice(0, 32)}`)
    }
  }
}

export class ConsoleSmsProvider implements SmsProvider {
  async sendOtp(phone: string, code: string): Promise<void> {
    // In dev / test or when no provider configured, log safely
    console.log(`[SMS MOCK] Sent OTP code "${code}" to phone "${phone}"`)
  }
}

let defaultProvider: SmsProvider | null = null

export function getSmsProvider(): SmsProvider {
  if (defaultProvider) return defaultProvider

  const hasMelipayamak = Boolean(
    process.env.MELIPAYAMAK_USERNAME &&
    process.env.MELIPAYAMAK_CREDENTIAL &&
    process.env.MELIPAYAMAK_FROM,
  )

  if (hasMelipayamak) {
    defaultProvider = new MelipayamakSmsProvider()
  } else {
    defaultProvider = new ConsoleSmsProvider()
  }

  return defaultProvider
}

export function setSmsProvider(provider: SmsProvider): void {
  defaultProvider = provider
}
