import { requestBackend } from './apiClient.js'

/**
 * Request a future backend M-Pesa payment initiation.
 * Expected response: { paymentReference: string, checkoutUrl?: string }.
 * When supplied, checkoutUrl must use HTTPS and return to the app using
 * #/payment-return?reference=<provider-reference>. Never send the poll choice
 * with phone details; the backend must determine/enforce the actual fee.
 * A browser redirect is not proof of payment.
 */
export function startMpesaPayment({ pollId, phoneNumber, amount }) {
  return requestBackend('startMpesaPayment', { pollId, phoneNumber, amount })
}

/**
 * Ask the backend to independently verify the provider reference and return payment status.
 * Expected response: { status: 'pending'|'successful'|'failed'|'expired', votingCredential?: string }.
 * Only backend verification may confirm payment or issue the one-time voting credential.
 */
export function checkPaymentStatus(paymentReference) {
  return requestBackend('checkPaymentStatus', { paymentReference })
}

/**
 * Submit a choice using the backend-issued one-time voting credential.
 * Expected response: { recorded: true, confirmationReference: string } only after recording.
 * Repeating the request with the same one-time credential must be idempotent for safe retry.
 * The phone number/payment identifier is deliberately excluded from this request.
 */
export function submitVote({ pollId, choice, votingCredential }) {
  return requestBackend('submitVote', { pollId, choice, votingCredential })
}

/** Reconfirm final vote-recording status after navigation or a page refresh; returns { recorded: boolean }. */
export function checkVoteStatus(confirmationReference) {
  return requestBackend('checkVoteStatus', { confirmationReference })
}
