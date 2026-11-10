# SAUTI YAGROUND backend

Express serves the existing Vite build and the JSON API. Local Vite development proxies `/api` to `http://localhost:3000`; run the API with `npm start` in one terminal and `npm run dev` in another.

## Development database

Create/select a dedicated Neon development branch/database named `sauti-dev`. Set its pooled URL in `DATABASE_URL` and direct URL in `DATABASE_URL_UNPOOLED`. Do not use the production connection for migration or testing. The migration runner refuses to run unless `NEON_BRANCH=sauti-dev`, requires a direct connection, and only loads `.env.development.local`. The local API loads `.env` first and uses `.env.development.local` as a fallback; `.env.local` is never loaded. Production deployments must inject their environment variables through the host.

Copy `.env.example` to `.env.development.local`, fill in development-only values, then run:

```sh
npm run db:migrate
```

This applies `db/migrations/001_initial_schema.sql` and the deterministic initial poll seed in `db/seeds/001_initial_poll.sql`. The seed creates the initial `WANTAM` and `TUTAM` poll. The SQL migration is the schema source of truth.

For Render, set `DATABASE_URL`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET`, a random `PAYMENT_TOKEN_SECRET` (at least 32 characters), and `FRONTEND_URL` in the service environment. Render supplies `RENDER_EXTERNAL_URL` for the backend service. Keep secrets out of `VITE_*` variables and Git. Configure the webhook URL as `POST https://<render-service>/api/payments/callback`. The API supports the legacy `x-paystack-signature` HMAC and the current `Paystack-Signature` format, including its five-minute timestamp window. The raw request body is signed and compared before processing.

Paystack's Kenya mobile-money flow uses its hosted checkout with the `mobile_money` channel; the customer completes the Safaricom prompt there. On Render, the transaction callback URL is built from `RENDER_EXTERNAL_URL` and points to `/api/payments/return`. That browser return verifies the transaction with Paystack, records the vote through the same guarded logic, then redirects to `${FRONTEND_URL}/success?reference=REFERENCE`. The webhook route remains server-to-server, verifies its signature and transaction, records the vote idempotently, then returns `200` to Paystack. Both flows share duplicate-vote protection.

## API

All JSON error responses have `{ "error": "..." }`.

### `GET /api/polls/active`

Returns the current active poll with options.

```json
{
  "poll": {
    "id": "00000000-0000-4000-8000-000000000001",
    "slug": "sautiya-main-poll",
    "title": "Featured poll",
    "question": "Which perspective do you support?",
    "currency": "KES",
    "participation_fee_minor": 1700,
    "options": [
      { "id": "00000000-0000-4000-8000-000000000011", "code": "WANTAM", "label": "WANTAM", "position": 1 },
      { "id": "00000000-0000-4000-8000-000000000012", "code": "TUTAM", "label": "TUTAM", "position": 2 }
    ]
  }
}
```

### `POST /api/payments/initiate`

Accepts `{ "phone": "0712345678", "optionLabel": "WANTAM", "email": "optional@example.com" }` where `optionLabel` is `WANTAM` or `TUTAM`. `email` is optional; when omitted, the server derives a placeholder from the normalized phone number. The server selects the active poll, looks up that label in its options, normalizes the phone to E.164, rejects a participant who already voted or has a pending payment, creates a pending payment for exactly 1700 minor units, and initializes Paystack checkout with KES and only the `mobile_money` channel.

Success (`201`): `{ "paymentId": "uuid", "statusToken": "opaque-secret", "status": "pending", "authorizationUrl": "https://checkout.paystack.com/...", "reference": "sg-..." }`. The frontend must keep `statusToken` private and send it only to the status endpoint. Redirect the user to `authorizationUrl`. A successful response does not mean payment has completed.

### `POST /api/payments/callback`

Paystack webhook. The route validates the signature on the exact raw body, accepts `charge.success`, de-duplicates the event by a stable SHA-256 key, verifies the reference using Paystack's verify API, and records payment success and at most one vote in a database transaction. Duplicate deliveries return `200` without a second vote. Configure this URL in Paystack; do not call it from the browser.

### `GET /api/payments/return?reference=sg-...`

Browser return URL supplied to Paystack checkout on Render. The server verifies the reference directly with Paystack and runs the same guarded vote recording logic before redirecting to `${FRONTEND_URL}/success?reference=REFERENCE`. The success redirect is used only after a vote was recorded for this payment or a prior processing attempt already recorded it. A participant who has already voted does not receive a success redirect for a new payment. It is separate from the signed webhook route, which must continue returning `200` to Paystack.

### `GET /api/payments/:paymentId/status`

Send `X-Payment-Token: <statusToken>`. Returns `{ "paymentId": "uuid", "status": "pending|success|failed|expired" }`. `success` is set only in the same transaction that records the vote. The token is generated per payment and only its keyed hash is stored. Unknown IDs or invalid tokens return `404`.

### `GET /api/polls/:pollId/results`

Returns counts of verified votes only:

```json
{ "poll": { "id": "uuid", "title": "Featured poll", "question": "..." }, "results": [{ "id": "uuid", "code": "WANTAM", "label": "WANTAM", "votes": 0 }] }
```

## Tables and privacy

`polls` and `poll_options` hold poll configuration; `participants` and `payments` hold eligibility and payment identity/status; `votes` holds poll and option selections; `payment_callbacks` stores webhook event hashes and deduplication results. A transaction atomically marks a participant as voted only when `voted_at IS NULL`, then inserts a vote without a participant or payment reference. This keeps phone and payment identity out of voting rows. The selected option code is passed as non-PII Paystack transaction metadata and read back only from Paystack's verified transaction response. Never put PII in metadata or application logs.
