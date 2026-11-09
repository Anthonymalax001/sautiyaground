/**
 * Placeholder transport for Firebase Cloud Functions.
 * Replace this rejection with the configured Firebase Functions client/HTTPS
 * transport once the backend endpoints and app configuration are ready.
 * This stub intentionally sends no network request and returns no sample data.
 */
export async function invokeCloudFunction(functionName, payload) {
  void payload
  throw new Error(`Firebase Cloud Functions are not configured; no request was sent (${functionName}).`)
}
