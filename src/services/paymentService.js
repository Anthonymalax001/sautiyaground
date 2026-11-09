import { invokeCloudFunction } from './apiClient.js'

/**
 * Request a future backend M-Pesa payment initiation.
 * Initiation is only a payment request; it must never be treated as a confirmed vote.
 */
export function startMpesaPayment({ pollId, choice, phoneNumber }) {
  return invokeCloudFunction('startMpesaPayment', { pollId, choice, phoneNumber })
}

/** Ask the backend for payment verification status; only backend verification may confirm payment. */
export function checkPaymentStatus(paymentId) {
  return invokeCloudFunction('checkPaymentStatus', { paymentId })
}
