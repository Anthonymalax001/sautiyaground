export const KENYAN_MOBILE_PATTERN = /^254[17]\d{8}$/

const LOCAL_PHONE_DIGIT_LIMIT = 10
const INTERNATIONAL_PHONE_DIGIT_LIMIT = 12

/**
 * Local Kenyan entries are limited to ten digits. Keep room for the existing
 * canonical 254... format, which contains the country code plus nine digits.
 */
export function isKenyanPhoneInputWithinLimit(value) {
  const compact = String(value ?? '').trim().replace(/[\s()-]/g, '')
  const digits = compact.replace(/\D/g, '')
  const isInternational = /^\+?254/.test(compact)
  return digits.length <= (isInternational ? INTERNATIONAL_PHONE_DIGIT_LIMIT : LOCAL_PHONE_DIGIT_LIMIT)
}

export function normalizeKenyanPhone(value) {
  const trimmed = String(value ?? '').trim()
  const compact = trimmed.replace(/[\s()-]/g, '')
  const digits = compact.startsWith('+') ? compact.slice(1) : compact

  if (!digits) return { error: 'Enter your Kenyan mobile number, for example 0712 345 678.' }
  if (!/^\d+$/.test(digits)) return { error: 'Use digits only, with an optional +, spaces, brackets, or hyphens.' }
  if (!isKenyanPhoneInputWithinLimit(compact)) {
    return { error: 'A local Kenyan number can have at most 10 digits. Use a valid +254 international format if needed.' }
  }
  if (/^0[17]/.test(digits) && digits.length < 10) return { error: 'Enter all 10 digits of your Kenyan mobile number.' }
  if (/^254[17]/.test(digits) && digits.length < 12) return { error: 'Enter all 12 digits of the international number, including 254.' }
  if (/^[17]/.test(digits) && digits.length < 9) return { error: 'Enter all 9 subscriber digits, or include the leading 0.' }

  let normalized = digits
  if (/^0[17]\d{8}$/.test(digits)) normalized = `254${digits.slice(1)}`
  else if (/^[17]\d{8}$/.test(digits)) normalized = `254${digits}`

  if (!KENYAN_MOBILE_PATTERN.test(normalized)) {
    return { error: 'Enter a Kenyan mobile number starting with 07, 01, 7, 1, +2547, or +2541.' }
  }

  return { value: normalized }
}
