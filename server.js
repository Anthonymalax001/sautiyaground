import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import dotenv from 'dotenv'
import express from 'express'
import pg from 'pg'

const root = path.dirname(fileURLToPath(import.meta.url))
const inheritedEnvironment = { ...process.env }
dotenv.config({ path: path.join(root, '.env') })
dotenv.config({ path: path.join(root, '.env.development.local'), override: true })
Object.assign(process.env, inheritedEnvironment)

const { Pool } = pg
const app = express()
const port = Number(process.env.PORT) || 3000
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, ssl: { rejectUnauthorized: false } })
const feeMinor = 1700

const allowedOrigins = new Set(['http://localhost:5173', process.env.FRONTEND_URL].filter(Boolean))
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Vary', 'Origin')
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Content-Type, Authorization')
    return res.sendStatus(204)
  }
  next()
})

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.')
if (!process.env.PAYSTACK_SECRET_KEY) throw new Error('PAYSTACK_SECRET_KEY is required.')
if (!process.env.PAYSTACK_WEBHOOK_SECRET) throw new Error('PAYSTACK_WEBHOOK_SECRET is required.')
if (!process.env.PAYMENT_TOKEN_SECRET || process.env.PAYMENT_TOKEN_SECRET.length < 32) {
  throw new Error('PAYMENT_TOKEN_SECRET must be at least 32 characters.')
}
if (process.env.RENDER === 'true' && !process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL is required on Render.')
}

function safeEqualHex(actual, expected) {
  if (!/^[a-f\d]{128}$/i.test(actual ?? '') || !/^[a-f\d]{128}$/i.test(expected)) return false
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))
}

function tokenHash(token) {
  return crypto.createHmac('sha256', process.env.PAYMENT_TOKEN_SECRET).update(token).digest()
}

function normalizePhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (/^0[17]\d{8}$/.test(digits)) return `+254${digits.slice(1)}`
  if (/^254[17]\d{8}$/.test(digits)) return `+${digits}`
  if (/^[17]\d{8}$/.test(digits)) return `+254${digits}`
  throw Object.assign(new Error('Enter a valid Kenyan mobile number.'), { status: 400 })
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[a-z\d-]{2,}$/i.test(value)
}

async function paystack(pathname, init = {}) {
  const response = await fetch(`https://api.paystack.co${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json', ...init.headers },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.status) {
    const error = Object.assign(new Error(result.message || 'Paystack request failed.'), { status: 502 })
    error.response = { data: result, status: response.status }
    throw error
  }
  return result.data
}

async function recordVoteForPayment(client, paymentId, verified) {
  if (!verified || verified.status !== 'success' || verified.currency !== 'KES' || Number(verified.amount) !== feeMinor) {
    await client.query("UPDATE payments SET status = 'failed', provider_status = $2, updated_at = now() WHERE id = $1 AND status = 'pending'", [paymentId, verified?.status ?? 'invalid'])
    return 'payment_not_eligible'
  }

  const { rows } = await client.query(`
    SELECT p.id, p.poll_id, p.participant_id, p.provider_reference, p.amount_minor, p.currency,
           p.status, p.expires_at, o.id AS option_id
    FROM payments p
    JOIN participants person ON person.id = p.participant_id AND person.poll_id = p.poll_id
    JOIN poll_options o ON o.poll_id = p.poll_id AND o.code = $2
    WHERE p.id = $1 FOR UPDATE OF p
  `, [paymentId, verified.metadata?.option_code])
  const payment = rows[0]
  if (!payment) return 'payment_not_found'
  if (payment.status === 'success') return 'already_processed'
  if (payment.status !== 'pending' || new Date(payment.expires_at) < new Date()) return 'payment_expired'
  if (verified.reference !== payment.provider_reference || verified.metadata?.poll_id !== payment.poll_id || verified.currency !== payment.currency || Number(verified.amount) !== payment.amount_minor) return 'verification_mismatch'

  const eligible = await client.query('UPDATE participants SET voted_at = now(), updated_at = now() WHERE id = $1 AND voted_at IS NULL RETURNING id', [payment.participant_id])
  if (!eligible.rowCount) return 'already_voted'
  await client.query('INSERT INTO votes (poll_id, option_id) VALUES ($1, $2)', [payment.poll_id, payment.option_id])
  await client.query("UPDATE payments SET status = 'success', provider_status = 'success', verified_at = now(), updated_at = now() WHERE id = $1", [payment.id])
  return 'vote_recorded'
}

app.get('/api/polls/active', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.slug, p.title, p.question, p.currency, p.participation_fee_minor,
             p.starts_at, p.ends_at,
             COALESCE(json_agg(json_build_object('id', o.id, 'code', o.code, 'label', o.label, 'position', o.position)
               ORDER BY o.position) FILTER (WHERE o.id IS NOT NULL), '[]') AS options
      FROM polls p LEFT JOIN poll_options o ON o.poll_id = p.id
      WHERE p.is_active AND p.starts_at <= now() AND (p.ends_at IS NULL OR p.ends_at > now())
      GROUP BY p.id ORDER BY p.created_at DESC LIMIT 1
    `)
    if (!rows[0]) return res.status(404).json({ error: 'No active poll.' })
    res.json({ poll: rows[0] })
  } catch (error) { console.error(error); res.status(500).json({ error: 'Unable to load the active poll.' }) }
})

app.post('/api/payments/initiate', express.json({ limit: '16kb' }), async (req, res) => {
  const { phone: phoneInput, optionLabel } = req.body ?? {}
  if (!phoneInput || !['WANTAM', 'TUTAM'].includes(optionLabel)) {
    return res.status(400).json({ error: 'phone and optionLabel (WANTAM or TUTAM) are required.' })
  }
  let phone
  try { phone = normalizePhone(phoneInput) } catch (error) { return res.status(error.status ?? 400).json({ error: error.message }) }
  const suppliedEmail = typeof req.body?.email === 'string' ? req.body.email.trim() : ''
  if (suppliedEmail && !isValidEmail(suppliedEmail)) return res.status(400).json({ error: 'email must be a valid email address.' })
  const email = suppliedEmail || `${phone.replace(/\D/g, '')}@example.com`

  const client = await pool.connect()
  let reference
  try {
    const poll = await client.query(`
      SELECT id, participation_fee_minor FROM polls
      WHERE is_active AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now())
      ORDER BY created_at DESC LIMIT 1
    `)
    if (!poll.rowCount) return res.status(404).json({ error: 'No active poll.' })
    const pollId = poll.rows[0].id
    const option = await client.query('SELECT id, code FROM poll_options WHERE poll_id = $1 AND upper(label) = $2', [pollId, optionLabel])
    if (!option.rowCount) return res.status(400).json({ error: 'Selected option is not available for the active poll.' })

    await client.query('BEGIN')
    const participant = await client.query(`
      INSERT INTO participants (poll_id, email, phone_e164) VALUES ($1, $2, $3)
      ON CONFLICT (poll_id, phone_e164) DO UPDATE SET updated_at = now()
      RETURNING id, voted_at
    `, [pollId, `${phone.slice(1)}@phone.sautiyaground.invalid`, phone])
    if (participant.rows[0].voted_at) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'This number has already voted in this poll.' })
    }
    await client.query("UPDATE payments SET status = 'expired', updated_at = now() WHERE poll_id = $1 AND participant_id = $2 AND status = 'pending' AND expires_at <= now()", [pollId, participant.rows[0].id])
    const pending = await client.query("SELECT id FROM payments WHERE poll_id = $1 AND participant_id = $2 AND status = 'pending' AND expires_at > now()", [pollId, participant.rows[0].id])
    if (pending.rowCount) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'A payment is already pending for this number.' })
    }
    const paymentId = crypto.randomUUID()
    reference = `sg-${paymentId}`
    const token = crypto.randomBytes(32).toString('base64url')
    await client.query(`
      INSERT INTO payments (id, poll_id, participant_id, idempotency_key, provider_reference, amount_minor, currency, access_token_hash)
      VALUES ($1, $2, $3, $4, $5, $6, 'KES', $7)
    `, [paymentId, pollId, participant.rows[0].id, crypto.randomUUID(), reference, feeMinor, tokenHash(token)])
    await client.query('COMMIT')

    const checkout = await paystack('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email,
        amount: String(feeMinor), currency: 'KES', reference,
        channels: ['mobile_money'],
        metadata: { payment_id: paymentId, poll_id: pollId, option_code: option.rows[0].code },
        ...(process.env.RENDER_EXTERNAL_URL ? { callback_url: `${process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '')}/api/payments/return` } : {}),
      }),
    })
    res.status(201).json({ paymentId, statusToken: token, status: 'pending', authorizationUrl: checkout.authorization_url, reference })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    if (reference) await pool.query("UPDATE payments SET status = 'failed', updated_at = now() WHERE provider_reference = $1 AND status = 'pending'", [reference]).catch(() => {})
    console.error('Payment initiation failed:', error.message, error.response?.data)
    res.status(error.status ?? 502).json({
      error: error.status === 502 ? 'Unable to initialize payment with Paystack.' : 'Unable to initiate payment.',
      ...(error.response?.data !== undefined ? { details: error.response.data } : {}),
    })
  } finally { client.release() }
})

// Keep the exact raw bytes for Paystack's signature check.
app.post('/api/payments/callback', express.raw({ type: 'application/json', limit: '256kb' }), async (req, res) => {
  const body = req.body ?? Buffer.alloc(0)
  const legacySignature = req.header('x-paystack-signature') ?? ''
  const legacyExpected = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(body).digest('hex')
  const currentHeader = req.header('paystack-signature') ?? ''
  const headerParts = currentHeader.split(',').map((part) => part.trim().split('=', 2))
  const timestamps = headerParts.filter(([key]) => key === 't').map(([, value]) => value)
  const timestamp = timestamps.length === 1 && /^\d+$/.test(timestamps[0]) ? Number(timestamps[0]) : NaN
  const withinWindow = Number.isFinite(timestamp) && Math.abs(Math.floor(Date.now() / 1000) - timestamp) <= 300
  const currentSignatures = headerParts.filter(([key]) => key === 'v1').map(([, value]) => value.split(':', 2))
  const currentExpected = withinWindow
    ? crypto.createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET).update(`${timestamp}.`).update(body).digest('hex')
    : ''
  const currentValid = currentSignatures.some(([, candidate]) => safeEqualHex(candidate, currentExpected))
  if (!safeEqualHex(legacySignature, legacyExpected) && !currentValid) return res.status(401).json({ error: 'Invalid Paystack signature.' })
  let event
  try { event = JSON.parse(body.toString('utf8')) } catch { return res.status(400).json({ error: 'Invalid JSON.' }) }
  if (event.event !== 'charge.success' || !event.data?.reference) return res.sendStatus(200)

  const eventKey = crypto.createHash('sha256').update(`${event.event}:${event.data.reference}`).digest('hex')
  const client = await pool.connect()
  try {
    const reference = event.data.reference
    const paystackTransaction = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`)
    await client.query('BEGIN')
    const payment = await client.query('SELECT id FROM payments WHERE provider_reference = $1', [reference])
    if (!payment.rowCount) { await client.query('ROLLBACK'); return res.sendStatus(200) }
    const callback = await client.query(`
      INSERT INTO payment_callbacks (event_key, payment_id, event_type, provider_reference, payload_sha256, processing_result)
      VALUES ($1, $2, $3, $4, $5, 'processing') ON CONFLICT (event_key) DO NOTHING RETURNING event_key
    `, [eventKey, payment.rows[0].id, event.event, reference, crypto.createHash('sha256').update(body).digest('hex')])
    if (!callback.rowCount) { await client.query('ROLLBACK'); return res.sendStatus(200) }
    const result = await recordVoteForPayment(client, payment.rows[0].id, paystackTransaction)
    await client.query('UPDATE payment_callbacks SET processing_result = $2, processed_at = now() WHERE event_key = $1', [eventKey, result])
    await client.query('COMMIT')
    res.sendStatus(200)
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Paystack callback processing failed:', error.message)
    res.sendStatus(500)
  } finally { client.release() }
})

// Paystack webhooks are server-to-server and must receive a 2xx response.
// The customer's browser returns here separately, where we verify before redirecting.
app.get('/api/payments/return', async (req, res) => {
  const reference = typeof req.query.reference === 'string' ? req.query.reference : ''
  if (!/^sg-[a-f\d-]{36}$/i.test(reference)) return res.status(400).json({ error: 'A valid payment reference is required.' })
  if (!process.env.FRONTEND_URL) return res.status(503).json({ error: 'FRONTEND_URL is not configured.' })

  const client = await pool.connect()
  try {
    const verified = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`)
    if (verified.status !== 'success') return res.status(409).json({ error: 'Payment has not succeeded.', status: verified.status })
    await client.query('BEGIN')
    const payment = await client.query('SELECT id FROM payments WHERE provider_reference = $1', [reference])
    if (!payment.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Payment not found.' })
    }
    const result = await recordVoteForPayment(client, payment.rows[0].id, verified)
    await client.query('COMMIT')
    if (!['vote_recorded', 'already_processed'].includes(result)) {
      return res.status(409).json({ error: 'Payment verification could not be completed.', result })
    }
    const frontendUrl = process.env.FRONTEND_URL.replace(/\/$/, '')
    return res.redirect(303, `${frontendUrl}/success?reference=${encodeURIComponent(reference)}`)
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Paystack browser return failed:', error.message)
    return res.status(error.status ?? 500).json({ error: 'Unable to verify payment return.' })
  } finally { client.release() }
})

app.get('/api/payments/:paymentId/status', async (req, res) => {
  const token = req.header('x-payment-token')
  if (!token) return res.status(401).json({ error: 'Payment status token required.' })
  try {
    const result = await pool.query('SELECT id, provider_reference, access_token_hash, status, expires_at FROM payments WHERE id = $1', [req.params.paymentId])
    const payment = result.rows[0]
    if (!payment || !crypto.timingSafeEqual(payment.access_token_hash, tokenHash(token))) return res.status(404).json({ error: 'Payment not found.' })
    if (payment.status === 'pending' && new Date(payment.expires_at) <= new Date()) {
      await pool.query("UPDATE payments SET status = 'expired', updated_at = now() WHERE id = $1 AND status = 'pending'", [payment.id])
      return res.json({ paymentId: payment.id, status: 'expired' })
    }
    res.json({ paymentId: payment.id, status: payment.status })
  } catch (error) { console.error(error); res.status(500).json({ error: 'Unable to load payment status.' }) }
})

app.get('/api/polls/:pollId/results', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.id AS poll_id, p.title, p.question, o.id AS option_id, o.code, o.label, o.position,
             count(v.id)::integer AS votes
      FROM polls p JOIN poll_options o ON o.poll_id = p.id
      LEFT JOIN votes v ON v.poll_id = p.id AND v.option_id = o.id
      WHERE p.id = $1 GROUP BY p.id, o.id ORDER BY o.position
    `, [req.params.pollId])
    if (!rows.length) return res.status(404).json({ error: 'Poll not found.' })
    res.json({ poll: { id: rows[0].poll_id, title: rows[0].title, question: rows[0].question }, results: rows.map(({ option_id, code, label, votes }) => ({ id: option_id, code, label, votes })) })
  } catch (error) { console.error(error); res.status(500).json({ error: 'Unable to load poll results.' }) }
})

app.use(express.json({ limit: '16kb' }))
app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true }) }
  catch { res.status(503).json({ ok: false }) }
})
app.use(express.static(path.join(root, 'dist')))
app.get(/.*/, (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')))

const server = app.listen(port, '0.0.0.0', () => console.log(`SautiyaGround listening on port ${port}`))
async function shutdown() { server.close(); await pool.end() }
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
