import { apiRequest } from './apiClient.js'

export function startMpesaPayment({ pollId, optionId, phoneNumber }) {
  return apiRequest('/api/payments/initiate', {
    method: 'POST',
    body: JSON.stringify({ pollId, optionId, phoneNumber }),
  })
}

export function checkPaymentStatus(paymentId, statusToken) {
  return apiRequest(`/api/payments/${encodeURIComponent(paymentId)}/status`, {
    headers: { 'X-Payment-Token': statusToken },
  })
}
