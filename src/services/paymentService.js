import { apiRequest } from './apiClient.js'

export function startMpesaPayment({ phone, optionLabel }) {
  return apiRequest('/api/payments/initiate', {
    method: 'POST',
    body: JSON.stringify({ phone, optionLabel }),
  })
}

export function checkPaymentStatus(paymentId, statusToken) {
  return apiRequest(`/api/payments/${encodeURIComponent(paymentId)}/status`, {
    headers: { 'X-Payment-Token': statusToken },
  })
}
