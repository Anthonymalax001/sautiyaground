export const KENYAN_MOBILE_PATTERN = /^254[17]\d{8}$/

export function normalizeKenyanPhone(value) {
  const trimmed = value.trim()
  const compact = trimmed.replace(/[\s()-]/g, '')
  const digits = compact.startsWith('+') ? compact.slice(1) : compact

  if (!digits) return { error: 'Enter your Kenyan mobile number, for example 0712 345 678.' }
  if (!/^\d+$/.test(digits)) return { error: 'Use digits only, with an optional +, spaces, brackets, or hyphens.' }

  let normalized = digits
  if (/^0[17]\d{8}$/.test(digits)) normalized = `254${digits.slice(1)}`
  else if (/^[17]\d{8}$/.test(digits)) normalized = `254${digits}`

  if (!KENYAN_MOBILE_PATTERN.test(normalized)) {
    return { error: 'Enter a Kenyan mobile number starting with 07, 01, 7, 1, +2547, or +2541.' }
  }

  return { value: normalized }
}
