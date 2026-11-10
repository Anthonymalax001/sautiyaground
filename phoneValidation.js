const validLocalMobile = /^0[17]\d{8}$/
const validLocalSubscriber = /^[17]\d{8}$/
const validCanonicalMobile = /^254[17]\d{8}$/

/** Validate a supplied Kenyan mobile number and return it in Paystack's E.164 form. */
export function normalizePhone(value) {
  if (typeof value !== 'string') throw invalidPhoneError()

  const compact = value.trim().replace(/[\s()-]/g, '')
  const digits = compact.startsWith('+') ? compact.slice(1) : compact
  if (!/^\d+$/.test(digits)) throw invalidPhoneError()

  if (validLocalMobile.test(digits)) return `+254${digits.slice(1)}`
  if (validCanonicalMobile.test(digits)) return `+${digits}`
  if (validLocalSubscriber.test(digits)) return `+254${digits}`
  throw invalidPhoneError()
}

function invalidPhoneError() {
  return Object.assign(new Error('Enter a valid Kenyan mobile number.'), { status: 400 })
}
