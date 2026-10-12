# Mobile OTP Authentication Service — Moftkhar (مفت خر)

This document provides a comprehensive technical overview and reference for the **One-Time Password (OTP) Authentication Service** in Moftkhar. The service delivers secure, passwordless authentication tailored for Iranian mobile phone users across the public storefront.

---

## Table of Contents

1. [Overview & Core Specifications](#overview--core-specifications)
2. [OTP Code Length & Formatting](#otp-code-length--formatting)
3. [Architecture & Workflow](#architecture--workflow)
4. [Security & Abuse Prevention](#security--abuse-prevention)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [SMS Provider Integration](#sms-provider-integration)
7. [Environment Configuration](#environment-configuration)
8. [Testing & Verification](#testing--verification)

---

## Overview & Core Specifications

The OTP authentication system replaces traditional email/password registration for storefront customers with verified Iranian mobile phone numbers.

### Key Technical Parameters

| Property | Value | Description |
| :--- | :--- | :--- |
| **Code Length** | **6 characters (6 digits)** | Generated in the numeric range `100000` to `999999` |
| **Code Lifetime (`otpLifetimeMs`)** | **2 minutes (120,000 ms)** | Window within which the OTP must be verified |
| **Resend Cooldown (`OTP_COOLDOWN_MS`)** | **60 seconds (60,000 ms)** | Minimum time required before requesting a new code |
| **Max Verification Attempts** | **5 attempts** | Code is invalidated immediately upon 5 incorrect submissions |
| **Rate Limit (per Phone)** | **5 requests / 1 hour** | Sliding window rate limit per normalized phone number |
| **Rate Limit (per IP)** | **20 requests / 1 hour** | Sliding window rate limit per client IP address |
| **Session Lifetime** | **14 days** | Valid duration for the `moftkhar-mobile` JWT session cookie |

---

## OTP Code Length & Formatting

### 1. Code Character Length
The OTP code generated and verified by the service is **exactly 6 characters long** (consisting strictly of **6 decimal digits**).
- **Generation**: Generated via Node.js cryptographic PRNG:
  ```typescript
  // src/lib/auth/otpService.ts
  const code = String(randomInt(100000, 1000000))
  ```
- **Validation**: Enforced via regex check during verification:
  ```typescript
  // src/app/(app)/api/auth/otp/verify/route.ts
  if (!isIranianMobile(phone) || !/^[0-9]{6}$/.test(code)) {
    return NextResponse.json({ error: 'کد معتبر نیست.' }, { status: 400 })
  }
  ```

### 2. Digit Normalization (Persian & Arabic Numerals)
Iranian users frequently input digits using Persian (`۰-۹`) or Arabic-Indic (`٠-٩`) keyboards. The service automatically normalizes all inputs to standard ASCII digits (`0-9`) prior to validation:
```typescript
// src/lib/auth/mobileSession.ts
export function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
}
```

### 3. Phone Number Normalization
Mobile numbers are stripped of whitespace, dashes, and international prefixes to conform to the standard 11-digit Iranian mobile pattern (`^09[0-9]{9}$`):
```typescript
export function normalizePhone(value: string): string {
  return normalizeDigits(value).replace(/[\s-]/g, '')
}

export function isIranianMobile(value: string): boolean {
  return /^09[0-9]{9}$/.test(value)
}
```

---

## Architecture & Workflow

```
[Storefront Client]
        │
        │ 1. POST /api/auth/otp/request { phoneNumber: "09123456789" }
        ▼
[Request Route Handler]
        │
        ├──▶ Validate Iranian mobile format (09xxxxxxxxx)
        ├──▶ Extract Client IP safely (x-forwarded-for / x-real-ip)
        ├──▶ Check in-memory rate limits (60s cooldown, 5/hr phone, 20/hr IP)
        ├──▶ Generate 6-digit code and store HMAC-SHA256 hash in pending registry
        ├──▶ Log rate-limit attempt in Payload `otpEvents` collection
        └──▶ Dispatch SMS via SmsProvider (Melipayamak or Console Mock)
        │
[User Receives SMS with 6-digit code]
        │
        │ 2. POST /api/auth/otp/verify { phoneNumber: "09123456789", code: "384920" }
        ▼
[Verify Route Handler]
        │
        ├──▶ Validate code format (/^[0-9]{6}$/)
        ├──▶ Timing-safe comparison against stored HMAC hash
        ├──▶ Invalidate pending OTP immediately upon verification
        ├──▶ Find or create verified user in Payload `users` collection
        └──▶ Issue `moftkhar-mobile` HTTP-only JWT cookie
```

### Ghost User Prevention
Earlier designs created provisional records in the database `users` collection when an OTP was requested. This caused database bloat and ghost accounts from failed or automated requests.

In the current architecture:
1. Pending OTPs are stored in Redis under `otp:pending:<phone>` with a 120-second TTL.
2. Plaintext codes are **never** stored; only `hashOtp(phone, code)` (HMAC-SHA256) is persisted.
3. The database `users` record is **only created or updated after** the 6-digit code is successfully validated.

---

## Security & Abuse Prevention

### 1. Timing-Safe Cryptographic Verification
To prevent timing side-channel attacks during code verification, expected and actual hashes are compared using `node:crypto.timingSafeEqual`:
```typescript
// src/lib/auth/otp.ts
export function hashOtp(phone: string, code: string): string {
  if (!process.env.PAYLOAD_SECRET) throw new Error('PAYLOAD_SECRET is required')
  return createHmac('sha256', process.env.PAYLOAD_SECRET).update(`${phone}:${code}`).digest('hex')
}

export function matchesOtp(phone: string, code: string, expected: string): boolean {
  const actual = Buffer.from(hashOtp(phone, code), 'hex')
  const stored = Buffer.from(expected, 'hex')
  return actual.length === stored.length && timingSafeEqual(actual, stored)
}
```

### 2. Multi-Tier Rate Limiting
Rate limiting operates across two layers:
1. **Fast In-Memory Sliding Window**: Evaluated immediately before any database query or write, rejecting abusive requests with HTTP `429 Too Many Requests`.
2. **Persistent Audit Log (`otpEvents`)**: Records requests in Payload CMS for auditing and cross-process analysis.

### 3. Safe Client IP Extraction
To prevent IP spoofing and avoid shared lockout collisions behind reverse proxies (where untrusted requests might yield `'unknown'` or `'undefined'`), `extractClientIp` inspects headers safely:
- Discards empty, `'unknown'`, or `'undefined'` entries.
- Hashes client IPs with SHA-256 before persisting to `otpEvents` for privacy compliance.

### 4. Background Database Pruning
To prevent unbounded database growth, `cleanupOldOtpEvents` automatically purges `otpEvents` records older than 24 hours.

### 5. Session Invalidation on Logout
Customer sessions use a signed JWT stored in the `moftkhar-mobile` cookie. The JWT contains a `sessionVersion` (`sv`) claim:
- When a user logs out (`POST /api/auth/otp/logout`), their database `sessionVersion` is incremented.
- Any previously issued JWT tokens for that user immediately become invalid, even if the token has not yet reached its 14-day expiry.

---

## API Endpoints Reference

### 1. Request OTP
Initiates an OTP verification sequence.

- **URL**: `/api/auth/otp/request`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "phoneNumber": "09123456789"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    { "ok": true }
    ```
  - `400 Bad Request`:
    ```json
    { "error": "شماره موبایل معتبر نیست." }
    ```
  - `429 Too Many Requests` (cooldown or rate limit exceeded):
    ```json
    { "error": "لطفاً یک دقیقه صبر کنید." }
    ```
  - `503 Service Unavailable` (SMS gateway failure):
    ```json
    { "error": "ارسال پیامک ممکن نشد. بعداً دوباره تلاش کنید." }
    ```

---

### 2. Verify OTP
Verifies the 6-digit code, activates the customer account, and establishes an authenticated session.

- **URL**: `/api/auth/otp/verify`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "phoneNumber": "09123456789",
    "code": "482019"
  }
  ```
- **Responses**:
  - `200 OK` (Sets `moftkhar-mobile` HTTP-only cookie):
    ```json
    {
      "ok": true,
      "user": {
        "id": 1,
        "phoneNumber": "09123456789",
        "name": null,
        "roles": ["customer"]
      }
    }
    ```
  - `400 Bad Request` (Invalid or expired code):
    ```json
    { "error": "کد نامعتبر است." }
    ```

---

### 3. Logout
Terminates the mobile session and clears the authentication cookie.

- **URL**: `/api/auth/otp/logout`
- **Method**: `POST`
- **Credentials**: `include` (Requires `moftkhar-mobile` cookie)
- **Responses**:
  - `200 OK`:
    ```json
    { "ok": true }
    ```

---

## SMS Provider Integration

The service uses a provider abstraction (`SmsProvider` interface) defined in [`src/lib/auth/sms/smsProvider.ts`](file:///Users/amirho/Projects/moftkhar/src/lib/auth/sms/smsProvider.ts):

```typescript
export interface SmsSendResult {
  code?: string
}

export interface SmsProvider {
  sendOtp(phone: string, code?: string): Promise<SmsSendResult | void>
}
```

### Available Providers

1. **`MelipayamakConsoleSmsProvider` (Primary Production Provider)**:
   - Uses Melipayamak's modern REST API endpoint `https://console.melipayamak.com/api/send/otp/<TOKEN>`.
   - Authenticates using `MELIPAYAMAK_JWT`.
   - Supports server-delivered dynamic OTP codes, returning the code to the caller so verification hashes stay in sync.
   - For complete details, see [`docs/melipayamak.md`](file:///Users/amirho/Projects/moftkhar/docs/melipayamak.md).

2. **`MelipayamakSmsProvider` (Legacy Production Provider)**:
   - Uses Melipayamak's panel REST API endpoint `https://rest.payamak-panel.com/api/SendSMS/SendOtp`.
   - Transmits via URL-encoded form data using approved shared service lines that bypass advertising blacklists.
   - Enabled when `MELIPAYAMAK_USERNAME`, `MELIPAYAMAK_CREDENTIAL`, and `MELIPAYAMAK_FROM` are configured.

3. **`ConsoleSmsProvider` (Development & Testing Mock)**:
   - Activated automatically when no Melipayamak environment variables are set.
   - Safely prints the OTP code to server console logs:
     ```
     [SMS MOCK] Sent OTP code "482019" to phone "09123456789"
     ```

---

## Environment Configuration

Configure the following variables in your `.env` or deployment environment:

```env
# Payload Application Secret (Required for HMAC-SHA256 OTP hashing & JWT signing)
PAYLOAD_SECRET=your-32-character-random-secret

# Primary: Melipayamak Console Token / JWT
MELIPAYAMAK_JWT=your_console_token_here

# Optional: Verified test phone number for test suite
TEST_PHONE_NUMBER=09012027369

# Legacy Melipayamak Fallback (Used only when MELIPAYAMAK_JWT is omitted)
MELIPAYAMAK_USERNAME=your_username
MELIPAYAMAK_CREDENTIAL=your_password
MELIPAYAMAK_FROM=your_approved_sender_line
```

---

## Testing & Verification

The OTP service is covered by automated integration tests in [`tests/int/otp.int.spec.ts`](file:///Users/amirho/Projects/moftkhar/tests/int/otp.int.spec.ts).

Run the test suite using:
```bash
pnpm test
```

Key test scenarios covered:
- **Phone & Digit Normalization**: Confirms Persian (`۰۹۱۲...`) and Arabic digits are normalized to standard ASCII digits.
- **6-Character Code Length**: Asserts generated codes are exactly 6 digits long.
- **Ghost User Prevention**: Verifies that no user row exists in the database until code verification succeeds.
- **Rate Limiting & Cooldown**: Tests 60-second cooldown and hourly request count restrictions.
- **Invalid Code Rejection**: Ensures incorrect codes are rejected and attempts are tracked.
