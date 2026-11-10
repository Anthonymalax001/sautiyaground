import assert from 'node:assert/strict'
import test from 'node:test'
import { createCorsMiddleware } from '../corsPolicy.js'

function runMiddleware(middleware, { method = 'GET', headers = {} } = {}) {
  const responseHeaders = {}
  const response = {
    statusCode: null,
    setHeader(name, value) { responseHeaders[name] = value },
    sendStatus(statusCode) { this.statusCode = statusCode; return this },
  }
  let nextCalled = false
  middleware({ method, headers }, response, () => { nextCalled = true })
  return { headers: responseHeaders, response, nextCalled }
}

test('allows the production Vercel origin without enabling credentials', () => {
  const middleware = createCorsMiddleware('https://another-frontend.example')
  const result = runMiddleware(middleware, {
    headers: { origin: 'https://sautiyaground.vercel.app' },
  })

  assert.equal(result.nextCalled, true)
  assert.equal(result.headers['Access-Control-Allow-Origin'], 'https://sautiyaground.vercel.app')
  assert.equal(result.headers['Access-Control-Allow-Credentials'], undefined)
})

test('keeps localhost and the configured frontend origin allowed', () => {
  const middleware = createCorsMiddleware('https://preview.sautiyaground.example/path')
  const local = runMiddleware(middleware, { headers: { origin: 'http://localhost:5173' } })
  const configured = runMiddleware(middleware, { headers: { origin: 'https://preview.sautiyaground.example' } })

  assert.equal(local.headers['Access-Control-Allow-Origin'], 'http://localhost:5173')
  assert.equal(configured.headers['Access-Control-Allow-Origin'], 'https://preview.sautiyaground.example')
})

test('rejects an unapproved origin preflight without granting CORS access', () => {
  const middleware = createCorsMiddleware('https://sautiyaground.vercel.app')
  const result = runMiddleware(middleware, {
    method: 'OPTIONS',
    headers: {
      origin: 'https://unapproved.example',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type',
    },
  })

  assert.equal(result.response.statusCode, 403)
  assert.equal(result.headers['Access-Control-Allow-Origin'], undefined)
  assert.equal(result.nextCalled, false)
})

test('does not grant CORS access to an unapproved origin on a simple request', () => {
  const middleware = createCorsMiddleware('https://sautiyaground.vercel.app')
  const result = runMiddleware(middleware, {
    headers: { origin: 'https://unapproved.example' },
  })

  assert.equal(result.headers['Access-Control-Allow-Origin'], undefined)
  assert.equal(result.response.statusCode, 403)
  assert.equal(result.nextCalled, false)
})

test('answers JSON POST preflight with the allowed methods and request headers', () => {
  const middleware = createCorsMiddleware('')
  const result = runMiddleware(middleware, {
    method: 'OPTIONS',
    headers: {
      origin: 'https://sautiyaground.vercel.app',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type, x-payment-token',
    },
  })

  assert.equal(result.response.statusCode, 204)
  assert.equal(result.headers['Access-Control-Allow-Origin'], 'https://sautiyaground.vercel.app')
  assert.equal(result.headers['Access-Control-Allow-Methods'], 'GET, POST, OPTIONS')
  assert.equal(result.headers['Access-Control-Allow-Headers'], 'Content-Type, Authorization, X-Payment-Token')
  assert.equal(result.headers['Access-Control-Allow-Credentials'], undefined)
  assert.equal(result.nextCalled, false)
})

test('rejects preflight methods and headers outside the allowlist', () => {
  const middleware = createCorsMiddleware('')
  const methodResult = runMiddleware(middleware, {
    method: 'OPTIONS',
    headers: {
      origin: 'https://sautiyaground.vercel.app',
      'access-control-request-method': 'DELETE',
    },
  })
  const headerResult = runMiddleware(middleware, {
    method: 'OPTIONS',
    headers: {
      origin: 'https://sautiyaground.vercel.app',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type, x-unapproved-header',
    },
  })

  assert.equal(methodResult.response.statusCode, 403)
  assert.equal(headerResult.response.statusCode, 403)
})
