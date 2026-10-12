import MelipayamakConsoleSmsProvider from './melipayamakConsoleSmsProvider'

export interface SmsSendResult {
  code?: string
}

export interface SmsProvider {
  sendOtp(phone: string, code?: string): Promise<SmsSendResult | void>
}

export { MelipayamakConsoleSmsProvider }

/**
 * Dispatches OTP SMS using Melipayamak's legacy Payamak-Panel SendOtp REST API.
 */
export class MelipayamakSmsProvider implements SmsProvider {
  private username?: string
  private password?: string
  private from?: string

  /**
   * Initializes the legacy Payamak-Panel SMS provider.
   *
   * @param options - Melipayamak panel credentials and sender line.
   */
  constructor(options?: { username?: string; password?: string; from?: string }) {
    this.username = options?.username ?? process.env.MELIPAYAMAK_USERNAME
    this.password = options?.password ?? process.env.MELIPAYAMAK_CREDENTIAL
    this.from = options?.from ?? process.env.MELIPAYAMAK_FROM
  }

  /**
   * Delivers a pre-generated OTP code to the recipient phone number.
   *
   * @param phone - Destination Iranian mobile number.
   * @param code - 6-digit numeric OTP code.
   */
  async sendOtp(phone: string, code?: string): Promise<void> {
    if (!this.username || !this.password || !this.from) {
      throw new Error('Melipayamak is not configured')
    }

    if (!code) {
      throw new Error('OTP code is required for legacy SendOtp')
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

/**
 * Mock SMS provider for development and testing environments.
 */
export class ConsoleSmsProvider implements SmsProvider {
  /**
   * Prints the OTP code to server console logs without network calls.
   *
   * @param phone - Destination mobile number.
   * @param code - The OTP code to log.
   */
  async sendOtp(phone: string, code?: string): Promise<void> {
    // In dev / test or when no provider configured, log safely
    console.log(`[SMS MOCK] Sent OTP code "${code ?? ''}" to phone "${phone}"`)
  }
}

let defaultProvider: SmsProvider | null = null

/**
 * Resolves the active SMS provider based on environment configuration.
 * Prioritizes the modern JWT/Console Token API over legacy panel credentials.
 *
 * @returns The configured SMS provider instance.
 */
export function getSmsProvider(): SmsProvider {
  if (defaultProvider) return defaultProvider

  if (process.env.MELIPAYAMAK_JWT) {
    defaultProvider = new MelipayamakConsoleSmsProvider()
    return defaultProvider
  }

  const hasLegacyMelipayamak = Boolean(
    process.env.MELIPAYAMAK_USERNAME &&
    process.env.MELIPAYAMAK_CREDENTIAL &&
    process.env.MELIPAYAMAK_FROM,
  )

  if (hasLegacyMelipayamak) {
    defaultProvider = new MelipayamakSmsProvider()
  } else {
    defaultProvider = new ConsoleSmsProvider()
  }

  return defaultProvider
}

/**
 * Overrides the active SMS provider instance for testing or dependency injection.
 *
 * @param provider - The replacement SMS provider.
 */
export function setSmsProvider(provider: SmsProvider): void {
  defaultProvider = provider
}
