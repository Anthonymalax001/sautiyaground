const PRODUCTION_ORIGIN = 'https://sautiyaground.vercel.app'
const DEVELOPMENT_ORIGIN = 'http://localhost:5173'
const ALLOWED_METHODS = new Set(['GET', 'POST', 'OPTIONS'])
const ALLOWED_HEADERS = new Set(['content-type', 'authorization', 'x-payment-token'])
const ALLOW_HEADERS_VALUE = 'Content-Type, Authorization, X-Payment-Token'

function normalizeOrigin(value) {
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : ''
  } catch {
    return ''
  }
}

export function createCorsMiddleware(frontendUrl) {
  const allowedOrigins = new Set([
    PRODUCTION_ORIGIN,
    DEVELOPMENT_ORIGIN,
    normalizeOrigin(frontendUrl),
  ].filter(Boolean))

  return (req, res, next) => {
    const origin = req.headers.origin
    const normalizedOrigin = normalizeOrigin(origin)
    const originAllowed = Boolean(normalizedOrigin && allowedOrigins.has(normalizedOrigin))

    if (originAllowed) {
      res.setHeader('Access-Control-Allow-Origin', normalizedOrigin)
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', ALLOW_HEADERS_VALUE)
      res.setHeader('Vary', req.method === 'OPTIONS'
        ? 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'
        : 'Origin')
    }

    if (origin && !originAllowed) return res.sendStatus(403)

    if (req.method === 'OPTIONS') {
      if (!originAllowed) return res.sendStatus(403)

      const requestedMethod = req.headers['access-control-request-method']?.toUpperCase()
      const requestedHeaders = (req.headers['access-control-request-headers'] ?? '')
        .split(',')
        .map((header) => header.trim().toLowerCase())
        .filter(Boolean)
      const methodAllowed = !requestedMethod || ALLOWED_METHODS.has(requestedMethod)
      const headersAllowed = requestedHeaders.every((header) => ALLOWED_HEADERS.has(header))
      return res.sendStatus(methodAllowed && headersAllowed ? 204 : 403)
    }

    return next()
  }
}
