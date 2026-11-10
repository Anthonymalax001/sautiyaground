/**
 * Temporary frontend transport placeholder for the backend API.
 * Connect the agreed HTTPS transport and endpoint contracts here when available.
 * This stub deliberately sends no network request and returns no sample data.
 */
export async function requestBackend(operation, payload) {
  void operation
  void payload
  const error = new Error('The backend API is not configured; no request was sent.')
  error.code = 'BACKEND_NOT_CONFIGURED'
  throw error
}
