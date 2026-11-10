const REFERENCE_PARAMETER = 'reference'
const MAX_REFERENCE_LENGTH = 512

export function isValidPaymentReference(reference) {
  return typeof reference === 'string'
    && reference.length > 0
    && reference.length <= MAX_REFERENCE_LENGTH
    && reference === reference.trim()
    && !Array.from(reference).some((character) => {
      const code = character.charCodeAt(0)
      return code <= 31 || code === 127
    })
}

/** Read the provider reference from the normal query string or hash-route query. */
export function readPaymentRedirect(location = window.location) {
  const searchParams = new URLSearchParams(location.search)
  const hashQuery = location.hash.slice(1).split('?').slice(1).join('?')
  const hashParams = new URLSearchParams(hashQuery)
  const values = [...searchParams.getAll(REFERENCE_PARAMETER), ...hashParams.getAll(REFERENCE_PARAMETER)]

  if (values.length === 0) return { hasReference: false, reference: '', valid: false }
  if (values.length !== 1) return { hasReference: true, reference: '', valid: false }

  const reference = values[0].trim()
  return {
    hasReference: true,
    reference: isValidPaymentReference(reference) ? reference : '',
    valid: isValidPaymentReference(reference),
  }
}
