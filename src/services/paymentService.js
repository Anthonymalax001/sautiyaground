import { apiRequest } from './apiClient.js'

/** Start the Paystack checkout using the backend's published request contract. */
export function startPaystackPayment({ phone, optionLabel }) {
  return apiRequest('/api/payments/initiate', {
    method: 'POST',
    body: JSON.stringify({ phone, optionLabel }),
  })
}

/** Read backend-verified payment and vote-recording status with its private token. */
export function checkPaymentStatus(paymentId, statusToken) {
  return apiRequest(`/api/payments/${encodeURIComponent(paymentId)}/status`, {
    headers: { 'X-Payment-Token': statusToken },
  })
}
