# SAUTI YAGROUND backend

Express serves the existing Vite build and the JSON API. Local Vite development proxies `/api` to `http://localhost:3000`; run the API with `npm start` in one terminal and `npm run dev` in another.

## Development database

Create/select a dedicated Neon development branch/database named `sauti-dev`. Set its pooled URL in `DATABASE_URL` and direct URL in `DATABASE_URL_UNPOOLED`. Do not use the production connection for migration or testing. The migration runner refuses to run unless `NEON_BRANCH=sauti-dev`, requires a direct connection, and only loads `.env.development.local`. The local API also loads only `.env.development.local`; production deployments must inject their environment variables through the host.

Copy `.env.example` to `.env.development.local`, fill in development-only values, then run:

```sh
npm run db:migrate
```

This applies `db/migrations/001_initial_schema.sql` and the deterministic initial poll seed in `db/seeds/001_initial_poll.sql`. The seed creates the initial `WANTAM` and `TUTAM` poll. The SQL migration is the schema source of truth.

For the application, set `DATABASE_URL`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET`, and a random `PAYMENT_TOKEN_SECRET` (at least 32 characters) in the deployment's server environment. Keep all secrets out of `VITE_*` variables and Git. Use Paystack test credentials for development and configure the webhook URL as `POST /api/payments/callback`. The API supports the legacy `x-paystack-signature` HMAC and the current `Paystack-Signature` format, including its five-minute timestamp window. The raw request body is signed and compared before processing.

Paystack's Kenya mobile-money flow uses its hosted checkout with the `mobile_money` channel; the customer completes the Safaricom prompt there. Configure `PAYSTACK_CALLBACK_URL` as the public URL to return to after checkout (for this hash-routed frontend, end it in `#/review`). The frontend keeps the payment status token and flow details in session storage so it can poll payment status after the redirect. A webhook event is not trusted by itself: the server fetches the transaction from Paystack and checks reference, successful status, KES currency, and exactly KES 17 before recording a vote.

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

Accepts `{ "pollId": "uuid", "optionId": "uuid", "phoneNumber": "0712345678" }`. The phone is normalized to E.164. The server checks the active poll and option, rejects a participant who already voted or has a pending payment, creates a pending payment for exactly 1700 minor units, and initializes Paystack checkout with KES and only the `mobile_money` channel.

Success (`201`): `{ "paymentId": "uuid", "statusToken": "opaque-secret", "status": "pending", "authorizationUrl": "https://checkout.paystack.com/...", "reference": "sg-..." }`. The frontend must keep `statusToken` private and send it only to the status endpoint. Redirect the user to `authorizationUrl`. A successful response does not mean payment has completed.

### `POST /api/payments/callback`

Paystack webhook. The route validates the signature on the exact raw body, accepts `charge.success`, de-duplicates the event by a stable SHA-256 key, verifies the reference using Paystack's verify API, and records payment success and at most one vote in a database transaction. Duplicate deliveries return `200` without a second vote. Configure this URL in Paystack; do not call it from the browser.

### `GET /api/payments/:paymentId/status`

Send `X-Payment-Token: <statusToken>`. Returns `{ "paymentId": "uuid", "status": "pending|success|failed|expired" }`. The token is generated per payment and only its keyed hash is stored. Unknown IDs or invalid tokens return `404`.

### `GET /api/polls/:pollId/results`

Returns counts of verified votes only:

```json
{ "poll": { "id": "uuid", "title": "Featured poll", "question": "..." }, "results": [{ "id": "uuid", "code": "WANTAM", "label": "WANTAM", "votes": 0 }] }
```

## Tables and privacy

`polls` and `poll_options` hold poll configuration; `participants` and `payments` hold eligibility and payment identity/status; `votes` holds poll and option selections; `payment_callbacks` stores webhook event hashes and deduplication results. A transaction atomically marks a participant as voted only when `voted_at IS NULL`, then inserts a vote without a participant or payment reference. This keeps phone and payment identity out of voting rows. The selected option code is passed as non-PII Paystack transaction metadata and read back only from Paystack's verified transaction response. Never put PII in metadata or application logs.
