# Melipayamak SMS Gateway Integration Guide

This document provides a technical guide to integrating and operating **Melipayamak** (ملی پیامک) SMS gateway services within the Moftkhar e-commerce application.

---

## Table of Contents

1. [Overview](#overview)
2. [OTP Code Length & Generation](#otp-code-length--generation)
3. [Method 1: Console Token / JWT API (Modern & Primary Implementation)](#method-1-console-token--jwt-api-modern--primary-implementation)
4. [Method 2: Payamak-Panel REST API (Legacy Alternative)](#method-2-payamak-panel-rest-api-legacy-alternative)
5. [Carrier Blacklist Bypassing](#carrier-blacklist-bypassing)
6. [Melipayamak Error Codes & Status Reference](#melipayamak-error-codes--status-reference)
7. [Environment Configuration & Mocking](#environment-configuration--mocking)

---

## Overview

[Melipayamak](https://www.melipayamak.com) is an Iranian SMS delivery provider. In Moftkhar, Melipayamak delivers one-time verification passwords (OTP) to customer mobile phones during storefront login and registration.

The service provides two primary integration models:
1. **Console Token / JWT API (`send/otp/<TOKEN>`)**: A modern, token-authenticated REST API where Melipayamak sends the OTP code via pre-approved service patterns. **This is the primary method used by Moftkhar's [`MelipayamakConsoleSmsProvider`](file:///Users/amirho/Projects/moftkhar/src/lib/auth/sms/melipayamakConsoleSmsProvider.ts), configured via `MELIPAYAMAK_JWT`.**
2. **Payamak-Panel REST API (`SendOtp`)**: The server generates the OTP code and forwards it to Melipayamak's legacy panel endpoint using username and password credentials. Supported by [`MelipayamakSmsProvider`](file:///Users/amirho/Projects/moftkhar/src/lib/auth/sms/smsProvider.ts).

---

## OTP Code Length & Generation

In the Moftkhar application:
- **Code Length**: The OTP code is **4 to 8 digits long** (default generated code is **6 digits** in the range `100000` to `999999`).
- **Dynamic Delivery**: When using the modern Console Token API, Melipayamak may generate the code according to the panel's template settings and return it in the API response (`{ "code": "...", "status": "..." }`). Moftkhar dynamically updates the in-memory HMAC registry with the delivered code so verification succeeds seamlessly.
- **Timing-Safe Verification**: Submitted OTP codes are verified against the HMAC-SHA256 signature using `node:crypto.timingSafeEqual`.

---

## Method 1: Console Token / JWT API (Modern & Primary Implementation)

The Moftkhar backend calls Melipayamak's modern Console Token REST endpoint via [`MelipayamakConsoleSmsProvider`](file:///Users/amirho/Projects/moftkhar/src/lib/auth/sms/melipayamakConsoleSmsProvider.ts).

### Endpoint Specification

- **URL**: `https://console.melipayamak.com/api/send/otp/<TOKEN>`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Timeout**: 10 seconds (`AbortSignal.timeout(10000)`)
- **Authentication**: `MELIPAYAMAK_JWT` embedded directly in the URL path.

### Request Body

```json
{
  "to": "09123456789"
}
```

### Response Body

#### Success Response
```json
{
  "code": "849201",
  "status": "عملیات موفق"
}
```

#### Pending Panel Approval Response
```json
{
  "status": "مستلزم تنظیم و تأیید مدیر"
}
```
> [!WARNING]
> If Melipayamak returns `مستلزم تنظیم و تأیید مدیر`, the OTP application / pattern in your [Melipayamak Console](https://console.melipayamak.com/apps/otp) must be configured and approved by Melipayamak administration before live dispatch is enabled.

#### Invalid Token Response
```json
{
  "status": "کلید کنسول معتبر نیست"
}
```

### Production Implementation (TypeScript / Next.js)

```typescript
// src/lib/auth/sms/melipayamakConsoleSmsProvider.ts
export default class MelipayamakConsoleSmsProvider implements SmsProvider {
  private readonly jwt?: string
  private readonly endpoint: string

  constructor(options?: MelipayamakConsoleOptions) {
    this.jwt = options?.jwt ?? options?.token ?? process.env.MELIPAYAMAK_JWT
    this.endpoint = options?.endpoint ?? 'https://console.melipayamak.com/api/send/otp'
  }

  async sendOtp(phone: string, code?: string): Promise<SmsSendResult> {
    if (!this.jwt) throw new Error('Melipayamak JWT is not configured')

    const url = `${this.endpoint.replace(/\/+$/, '')}/${encodeURIComponent(this.jwt.trim())}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phone }),
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })

    const raw = await response.text()
    const record = JSON.parse(raw)
    const statusStr = typeof record?.status === 'string' ? record.status.trim() : ''

    if (!response.ok || /(معتبر نیست|مستلزم|ارسال نشده|خطا)/i.test(statusStr)) {
      throw new Error(`Melipayamak rejected OTP: ${statusStr}`)
    }

    return { code: record.code ? String(record.code).trim() : code }
  }
}
```

---

## Method 2: Payamak-Panel REST API (Legacy Alternative)

The Moftkhar backend also maintains backward compatibility with Melipayamak's legacy `SendOtp` REST endpoint from [`src/lib/auth/sms/smsProvider.ts`](file:///Users/amirho/Projects/moftkhar/src/lib/auth/sms/smsProvider.ts).

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
| `code` | String | Yes | The numeric OTP code to deliver (e.g. `384920`) |

---

## Carrier Blacklist Bypassing

A large portion of Iranian mobile subscribers disable promotional SMS messages (known as Telecom Blacklist 8989 / لیست سیاه مخابراتی).

Standard promotional lines (e.g. `1000`, `2000`, `5000`) cannot deliver messages to blacklisted subscribers. Melipayamak resolves this via **Service Lines (خطوط خدماتی اشتراکی)**:
- Melipayamak's `SendOtp` and Console OTP routes traffic through shared service numbers registered exclusively for verification codes.
- These messages are **exempt from the advertising blacklist** and are guaranteed delivery within seconds.

---

## Melipayamak Error Codes & Status Reference

### Console Token API Statuses

| Status Message | Description | Resolution |
| :--- | :--- | :--- |
| **`عملیات موفق`** | Message successfully accepted and queued for delivery. | Normal operation. |
| **`مستلزم تنظیم و تأیید مدیر`** | OTP pattern/application requires approval by panel administrator. | Visit [Melipayamak Console](https://console.melipayamak.com/apps/otp) and contact support to approve the OTP template. |
| **`کلید کنسول معتبر نیست`** | The provided JWT/API Token is invalid or expired. | Verify `MELIPAYAMAK_JWT` in your `.env` configuration. |
| **`ارسال نشده`** | Transmission could not be completed by carrier. | Verify mobile number or account balance. |

### Legacy Payamak-Panel Return Codes

When calling `https://rest.payamak-panel.com/api/SendSMS/SendOtp`, any numeric return value **<= 111** represents an error:

| Return Code | Meaning (English) | Description |
| :---: | :--- | :--- |
| **0** | Invalid Credentials | Username or password / credential is incorrect. |
| **2** | Insufficient Credit | The account credit balance is insufficient to send messages. |
| **3** | Daily Limit Exceeded | Account has exceeded its daily transmission quota. |
| **4** | Volume Limit Exceeded | Account has exceeded its maximum message volume limit. |
| **5** | Invalid Sender Line | The `from` line is invalid or not registered to this account. |
| **10** | Invalid Recipient Number | Destination mobile number format is invalid. |
| **> 111** | **Success** | Valid message reference ID (`recId`). SMS accepted for dispatch. |

---

## Environment Configuration & Mocking

### Required Variables

Add these to your `.env` or deployment environment:

```env
# Primary: Melipayamak Console Token / JWT
MELIPAYAMAK_JWT=your_console_token_here

# Optional: Verified test phone number for local test suite
TEST_PHONE_NUMBER=09012027369

# Legacy Fallback: Only used if MELIPAYAMAK_JWT is omitted
MELIPAYAMAK_USERNAME=your_username
MELIPAYAMAK_CREDENTIAL=your_password
MELIPAYAMAK_FROM=your_sender_line
```

### Provider Resolution Precedence

`getSmsProvider()` checks variables in order:
1. If `MELIPAYAMAK_JWT` is set: uses **`MelipayamakConsoleSmsProvider`**.
2. Else if `MELIPAYAMAK_USERNAME && MELIPAYAMAK_CREDENTIAL && MELIPAYAMAK_FROM`: uses **`MelipayamakSmsProvider`**.
3. Otherwise: uses **`ConsoleSmsProvider`** (mock logging to stdout).