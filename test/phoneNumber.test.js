import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizePhone } from '../phoneValidation.js'
import { isKenyanPhoneInputWithinLimit, normalizeKenyanPhone } from '../src/utils/phoneNumber.js'

test('accepts exactly 10 valid local digits and normalizes both supported prefixes', () => {
  assert.equal(isKenyanPhoneInputWithinLimit('0712345678'), true)
  assert.deepEqual(normalizeKenyanPhone('0712345678'), { value: '254712345678' })
  assert.deepEqual(normalizeKenyanPhone('0112345678'), { value: '254112345678' })
})

test('rejects incomplete local numbers with a clear validation message', () => {
  const result = normalizeKenyanPhone('071234567')
  assert.match(result.error, /all 10 digits/i)
})

test('rejects a local number with more than 10 digits instead of truncating it', () => {
  const overlong = '07123456789'
  assert.equal(isKenyanPhoneInputWithinLimit(overlong), false)
  assert.match(normalizeKenyanPhone(overlong).error, /at most 10 digits/i)
})

test('rejects overlong pasted input using the same digit limit as typing', () => {
  const pasted = '0712 345 678 9'
  assert.equal(isKenyanPhoneInputWithinLimit(pasted), false)
  assert.match(normalizeKenyanPhone(pasted).error, /at most 10 digits/i)
})

test('continues to normalize supported canonical international formats', () => {
  assert.deepEqual(normalizeKenyanPhone('+254 712 345 678'), { value: '254712345678' })
  assert.deepEqual(normalizeKenyanPhone('254112345678'), { value: '254112345678' })
})

test('rejects unsupported prefixes', () => {
  assert.match(normalizeKenyanPhone('0612345678').error, /starting with/i)
  assert.match(normalizeKenyanPhone('254612345678').error, /starting with/i)
})

test('backend parser preserves local and international numbers for Paystack', () => {
  assert.equal(normalizePhone('0712 345 678'), '+254712345678')
  assert.equal(normalizePhone('0112345678'), '+254112345678')
  assert.equal(normalizePhone('+254 712 345 678'), '+254712345678')
  assert.equal(normalizePhone('254112345678'), '+254112345678')
  assert.equal(normalizePhone('712345678'), '+254712345678')
})

test('backend rejects invalid and overlong numbers without stripping or truncating', () => {
  for (const value of ['07123456789', '2547123456789', '+2547123456789', '0712abc345678', '0612345678']) {
    assert.throws(() => normalizePhone(value), { status: 400 })
  }
})
