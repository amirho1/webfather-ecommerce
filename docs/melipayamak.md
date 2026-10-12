# Melipayamak SMS Gateway Integration Guide

This document provides a technical guide to integrating and operating **Melipayamak** (ملی پیامک) SMS gateway services within the Moftkhar e-commerce application.

---

## Table of Contents

1. [Overview](#overview)
2. [OTP Code Length & Generation](#otp-code-length--generation)
3. [Method 1: Payamak-Panel REST API (Primary Implementation)](#method-1-payamak-panel-rest-api-primary-implementation)
4. [Method 2: Console Token API (Alternative)](#method-2-console-token-api-alternative)
5. [Carrier Blacklist Bypassing](#carrier-blacklist-bypassing)
6. [Melipayamak Error Codes Reference](#melipayamak-error-codes-reference)
7. [Environment Configuration & Mocking](#environment-configuration--mocking)

---

## Overview

[Melipayamak](https://www.melipayamak.com) is an Iranian SMS delivery provider. In Moftkhar, Melipayamak delivers one-time verification passwords (OTP) to customer mobile phones during storefront login and registration.

The service provides two primary integration models:
1. **Payamak-Panel REST API (`SendOtp`)**: The server generates the OTP code and forwards it to Melipayamak for immediate delivery via high-priority service lines. **This is the active method used by Moftkhar's [`MelipayamakSmsProvider`](file:///Users/amirho/Projects/moftkhar/src/lib/auth/sms/smsProvider.ts).**
2. **Console Token API (`send/otp/<TOKEN>`)**: A token-authenticated API where Melipayamak generates the code and returns it in the API response.

---

## OTP Code Length & Generation

In the Moftkhar application:
- **Code Length**: The OTP code is **exactly 6 characters long** (6 decimal digits).
- **Format**: Numeric string in the range `100000` to `999999` matching `/^[0-9]{6}$/`.
- **Generation**: Generated on the application server using Node.js cryptographically secure random integers (`randomInt(100000, 1000000)`).
- **Delivery**: The 6-digit code is passed directly to Melipayamak's `SendOtp` endpoint.

---

## Method 1: Payamak-Panel REST API (Primary Implementation)

The Moftkhar backend calls Melipayamak's `SendOtp` REST endpoint from [`src/lib/auth/sms/smsProvider.ts`](file:///Users/amirho/Projects/moftkhar/src/lib/auth/sms/smsProvider.ts).

### Endpoint Specification

- **URL**: `https://rest.payamak-panel.com/api/SendSMS/SendOtp`
- **Method**: `POST`
- **Content-Type**: `application/x-www-form-urlencoded`
- **Timeout**: 10 seconds (`AbortSignal.timeout(10000)`)

### Request Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `username` | String | Yes | Melipayamak account username (`MELIPAYAMAK_USERNAME`) |
| `password` | String | Yes | Account password or panel credential (`MELIPAYAMAK_CREDENTIAL`) |
| `from` | String | Yes | Approved sender service line number (`MELIPAYAMAK_FROM`) |
| `to` | String | Yes | Destination Iranian mobile number (e.g. `09123456789`) |
| `code` | String | Yes | The **6-character numeric OTP code** to deliver (e.g. `384920`) |

### Response Format

Melipayamak returns a response representing either a delivery tracking ID or a status code:

- **Success**: Returns a unique numeric Message ID (`recId`) greater than 111 (e.g., `1234567890`), either as a raw string/number or JSON:
  ```json
  {
    "Value": "1234567890",
    "RetStatus": 1,
    "StrRetStatus": "Ok"
  }
  ```
- **Error / Rejection**: Returns an error integer less than or equal to `111` (e.g., `0`, `2`, `10`).

### Production Implementation (TypeScript / Next.js)

```typescript
// src/lib/auth/sms/smsProvider.ts
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
      code, // Exactly 6 digits
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
      // Melipayamak may return a plain numeric ID string
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
```

### cURL Example

```bash
curl -X POST "https://rest.payamak-panel.com/api/SendSMS/SendOtp" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=YOUR_USERNAME" \
  -d "password=YOUR_PASSWORD" \
  -d "from=YOUR_SENDER_LINE" \
  -d "to=09123456789" \
  -d "code=384920"
```

---

## Method 2: Console Token API (Alternative)

Melipayamak also offers a token-based endpoint through its modern console API (`console.melipayamak.com`). In this variant, authentication occurs via an API token in the URL path, and the OTP code is generated by Melipayamak.

### Endpoint Specification

- **URL**: `https://console.melipayamak.com/api/send/otp/<TOKEN>`
- **Method**: `POST`
- **Content-Type**: `application/json`

### Request Body

```json
{
  "to": "09123456789"
}
```

### Response Body

```json
{
  "code": "3741437414",
  "status": "Success description or error message"
}
```

### Code Example (Modern Fetch)

```javascript
async function sendConsoleOtp(token, recipientPhone) {
  const response = await fetch(`https://console.melipayamak.com/api/send/otp/${token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: recipientPhone,
    }),
  })

  const data = await response.json()
  return data
}
```

### Code Example (Node.js `https` module)

```javascript
const https = require('node:https')

const data = JSON.stringify({
  to: '09123456789',
})

const options = {
  hostname: 'console.melipayamak.com',
  port: 443,
  path: '/api/send/otp/YOUR_TOKEN_HERE',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
}

const req = https.request(options, (res) => {
  let responseBody = ''

  res.on('data', (chunk) => {
    responseBody += chunk
  })

  res.on('end', () => {
    console.log('Status code:', res.statusCode)
    console.log('Response body:', responseBody)
  })
})

req.on('error', (err) => {
  console.error('Request error:', err)
})

req.write(data)
req.end()
```

---

## Carrier Blacklist Bypassing

A large portion of Iranian mobile subscribers disable promotional SMS messages (known as Telecom Blacklist 8989 / لیست سیاه مخابراتی).

Standard promotional lines (e.g. `1000`, `2000`, `5000`) cannot deliver messages to blacklisted subscribers. Melipayamak resolves this via **Service Lines (خطوط خدماتی اشتراکی)**:
- Melipayamak's `SendOtp` routes OTP traffic through shared service numbers registered exclusively for verification codes.
- These messages are **exempt from the advertising blacklist** and are guaranteed delivery within seconds.
- No promotional or marketing text may be included; only the verification code and essential brand identification are transmitted.

---

## Melipayamak Error Codes Reference

When calling `https://rest.payamak-panel.com/api/SendSMS/SendOtp`, any numeric return value **<= 111** represents an error:

| Return Code | Meaning (English) | Description |
| :---: | :--- | :--- |
| **0** | Invalid Credentials | Username or password / credential is incorrect. |
| **2** | Insufficient Credit | The account credit balance is insufficient to send messages. |
| **3** | Daily Limit Exceeded | Account has exceeded its daily transmission quota. |
| **4** | Volume Limit Exceeded | Account has exceeded its maximum message volume limit. |
| **5** | Invalid Sender Line | The `from` line is invalid or not registered to this account. |
| **6** | Maintenance | The SMS gateway system is currently undergoing scheduled maintenance. |
| **7** | Filtered Content | Message content contains prohibited or filtered words. |
| **8** | Telco Transmission Failed | Failed to transmit the message to telecommunication operators. |
| **10** | Invalid Recipient Number | Destination mobile number format is invalid. |
| **11** | Recipient Blacklisted | Destination number has blocked SMS delivery (not applicable to approved service lines). |
| **12** | Recipient Unreachable | Telecommunication operator unable to route to recipient. |
| **35** | Unauthorized Line | The sender line does not belong to the authenticated user. |
| **> 111** | **Success** | Valid message reference ID (`recId`). SMS accepted for immediate dispatch. |

---

## Environment Configuration & Mocking

### Required Variables

Add these to your `.env` or deployment environment:

```env
# Melipayamak account username
MELIPAYAMAK_USERNAME=your_username

# Melipayamak account password or API token
MELIPAYAMAK_CREDENTIAL=your_password_or_token

# Approved service line number (provided by Melipayamak)
MELIPAYAMAK_FROM=your_sender_line
```

### Local Development & Testing Mock

If any of the three Melipayamak environment variables are omitted, the application automatically switches to `ConsoleSmsProvider`.

In this mode:
- No HTTP requests are made to Melipayamak.
- The 6-digit code is logged directly to the server terminal:
  ```
  [SMS MOCK] Sent OTP code "482019" to phone "09123456789"
  ```
- This allows full local end-to-end testing of customer login and registration without consuming SMS credits or requiring active internet connectivity.