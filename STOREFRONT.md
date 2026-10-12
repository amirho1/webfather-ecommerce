# Moftkhar storefront release

This release supports public browsing, mobile OTP accounts, and persistent carts. Ordering and payment are disabled. `/checkout` is informational, and the ecommerce plugin has no payment methods configured.

## Database and sample catalog

Set `DATABASE_URL` and `PAYLOAD_SECRET`, then run:

```sh
pnpm payload migrate
pnpm seed:moftkhar
pnpm generate:types
pnpm typecheck
pnpm build
```

`seed:moftkhar` imports five categories, 14 products, and their brand logos into Payload Media. It checks existing slugs and logo markers before creating records, so rerunning it does not overwrite existing content. Categories and products are drafts. Review their prices, descriptions, and availability in `/admin`, then publish only the items ready for public display. The storefront's public queries exclude drafts. Admin preview uses Payload draft mode.

The migration preserves the existing users and old ecommerce records. It is forward only; restore a database backup if rollback is required. Before migrating an existing database created with Payload's development schema push, take a backup and confirm the baseline schema before marking the initial migration as applied. The local project database has already been migrated and seeded.

Existing USD amounts are retained in their legacy database columns. They are not converted into Toman automatically; review and enter Toman prices before publishing any older products.

## Mobile OTP

Set the following server environment variables for live SMS delivery:

- `MELIPAYAMAK_USERNAME`
- `MELIPAYAMAK_CREDENTIAL` (password or API key accepted by the panel)
- `MELIPAYAMAK_FROM` (approved sender line)

The app generates a 6-character (6-digit) OTP code and calls Melipayamak `SendOtp` from the server. Codes are stored as HMAC-SHA256 hashes in an in-memory pending registry (preventing ghost users in the database), expire after five minutes, and can be verified once. Requests have a one-minute resend cooldown and hourly phone/IP limits; verification permits five attempts per code. Verified sessions use HTTP-only cookies and are revoked on logout. Admin email/password access remains available through `/admin`; public user creation is disabled.

For comprehensive architectural details and provider specs, see:
- [docs/OTP_SERVICE.md](./docs/OTP_SERVICE.md) — Architecture, security, endpoints, and 6-digit code specifications.
- [docs/melipayamak.md](./docs/melipayamak.md) — Melipayamak SMS provider integration guide and error codes.

No SMS delivery test was run for this release. Test with a designated number after configuring the panel variables.
