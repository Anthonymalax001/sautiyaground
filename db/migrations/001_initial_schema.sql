CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'KES' CHECK (currency = 'KES'),
  participation_fee_minor INTEGER NOT NULL DEFAULT 1700 CHECK (participation_fee_minor = 1700),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS polls_one_active_idx ON polls (is_active) WHERE is_active;

CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  position SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, code),
  UNIQUE (poll_id, position),
  UNIQUE (poll_id, id)
);

CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE RESTRICT,
  email TEXT NOT NULL,
  phone_e164 TEXT NOT NULL,
  voted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, phone_e164),
  UNIQUE (id, poll_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL,
  participant_id UUID NOT NULL,
  idempotency_key UUID NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'paystack' CHECK (provider = 'paystack'),
  provider_reference TEXT NOT NULL UNIQUE,
  amount_minor INTEGER NOT NULL CHECK (amount_minor = 1700),
  currency CHAR(3) NOT NULL CHECK (currency = 'KES'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'expired')),
  access_token_hash BYTEA NOT NULL,
  provider_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  verified_at TIMESTAMPTZ,
  FOREIGN KEY (participant_id, poll_id) REFERENCES participants(id, poll_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_one_live_per_participant_poll_idx
  ON payments (participant_id, poll_id)
  WHERE status IN ('pending', 'success');
CREATE INDEX IF NOT EXISTS payments_poll_status_idx ON payments (poll_id, status);

CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE RESTRICT,
  option_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (poll_id, option_id) REFERENCES poll_options(poll_id, id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS votes_poll_option_idx ON votes (poll_id, option_id);

CREATE TABLE IF NOT EXISTS payment_callbacks (
  event_key CHAR(64) PRIMARY KEY,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  provider_reference TEXT,
  payload_sha256 CHAR(64) NOT NULL,
  processing_result TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_callbacks_payment_idx ON payment_callbacks (payment_id);
