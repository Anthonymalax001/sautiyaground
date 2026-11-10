import { useCallback, useEffect, useRef, useState } from 'react'
import { APP_CONFIG } from '../config/appConfig.js'
import { ArrowIcon, InfoIcon } from '../components/Icons.jsx'
import { Footer } from '../components/SiteChrome.jsx'
import { isValidPaymentReference } from '../utils/paymentRedirect.js'

const PAYMENT_STATES = ['pending', 'successful', 'failed', 'expired']

export default function PaymentStatusPage({ paymentReference, initialError = '', initialNotice = '', checkPaymentStatus, onVerified, onRetryPayment }) {
  const referenceValid = isValidPaymentReference(paymentReference)
  const [status, setStatus] = useState(referenceValid ? 'loading' : 'verification-error')
  const [votingCredential, setVotingCredential] = useState('')
  const [checking, setChecking] = useState(false)
  const [errorMessage, setErrorMessage] = useState(referenceValid ? '' : (initialError || 'The payment reference is missing or invalid. We cannot verify this payment.'))
  const inFlight = useRef(false)

  const checkStatus = useCallback(async () => {
    if (!isValidPaymentReference(paymentReference) || inFlight.current) return
    inFlight.current = true
    setChecking(true)
    setErrorMessage('')
    try {
      const result = await checkPaymentStatus(paymentReference)
      if (!result || !PAYMENT_STATES.includes(result.status)) {
        throw new Error('The payment service returned an unrecognized status.')
      }
      setStatus(result.status)
      setVotingCredential(typeof result.votingCredential === 'string' ? result.votingCredential : '')
    } catch (error) {
      setStatus('verification-error')
      setErrorMessage(error?.code === 'BACKEND_NOT_CONFIGURED'
        ? 'Payment verification is not connected yet. Your payment status is unknown; this does not mean the payment failed.'
        : 'We could not check your payment status. It may still be pending. Try checking again.')
    } finally {
      inFlight.current = false
      setChecking(false)
    }
  }, [checkPaymentStatus, paymentReference])

  useEffect(() => {
    if (!referenceValid) return undefined
    const initialCheck = window.setTimeout(() => void checkStatus(), 0)
    return () => window.clearTimeout(initialCheck)
  }, [checkStatus, referenceValid])

  useEffect(() => {
    if (status !== 'pending') return undefined
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !inFlight.current) void checkStatus()
    }, 5000)
    return () => window.clearInterval(timer)
  }, [checkStatus, referenceValid, status])

  const continueToVote = () => {
    if (status === 'successful' && votingCredential) onVerified(votingCredential)
  }

  let heading = 'Checking your payment'
  let eyebrow = 'M-PESA PAYMENT STATUS'
  let body = 'Checking with the payment service. This does not confirm that your payment succeeded.'
  let mark = <span className="loading-spinner" aria-label="Checking payment status" />

  if (status === 'pending' || status === 'loading') {
    heading = status === 'pending' ? 'Waiting for M-Pesa confirmation' : 'Checking your payment'
    body = status === 'pending'
      ? 'Check your phone and enter your M-Pesa PIN to complete the payment request. We are waiting for verified confirmation.'
      : 'We are checking for a verified payment status.'
  } else if (status === 'successful') {
    heading = 'Payment successful'
    body = `KES ${APP_CONFIG.participationFee} has been verified. Payment confirmation is separate from vote recording; your vote is not recorded until you continue and the backend confirms it.`
    mark = <span className="status-mark status-mark--success" aria-hidden="true">✓</span>
  } else if (status === 'failed' || status === 'expired') {
    heading = status === 'expired' ? 'Payment reference expired' : 'Payment not completed'
    body = status === 'expired'
      ? 'The backend confirmed this payment reference has expired. No vote was recorded.'
      : 'The payment service confirmed that this request failed or was cancelled. No vote was recorded.'
    mark = <span className="status-mark status-mark--error" aria-hidden="true">!</span>
  } else if (status === 'verification-error') {
    heading = 'Payment status unavailable'
    body = errorMessage
    mark = <span className="status-mark status-mark--warning" aria-hidden="true">?</span>
  }

  return (
    <>
      <main className="subpage-main policy-page status-page">
        <a className="back-link" href="#/"> <span aria-hidden="true">←</span> Back to introduction</a>
        <section className="policy-card status-card" aria-labelledby="payment-status-heading" aria-live="polite">
          <p className="hero-kicker"><span className="hero-kicker__line" /> {eyebrow}</p>
          <div className="status-card__mark">{mark}</div>
          <h1 id="payment-status-heading">{heading}</h1>
          <p className="policy-lead">{body}</p>

          {status === 'pending' && <p className="status-card__hint">Keep this page open while you complete the prompt on your phone.</p>}
          {initialNotice && <p className="status-card__hint" role="status">{initialNotice}</p>}
          {status === 'successful' && !votingCredential && (
            <p className="flow-error" role="status">Your payment is verified, but the backend has not provided the one-time voting credential yet. Check again before continuing.</p>
          )}
          {status === 'verification-error' && <p className="status-card__hint">The result is unknown until the payment service can verify it. Do not start another payment based on this message.</p>}

          <div className="status-card__actions">
            {status === 'successful' && (
              <button className="primary-button" type="button" disabled={!votingCredential} onClick={continueToVote}>
                Continue to voting <ArrowIcon />
              </button>
            )}
          {(status === 'pending' || (status === 'verification-error' && referenceValid) || (status === 'successful' && !votingCredential) || status === 'loading') && (
              <button className="secondary-button" type="button" disabled={checking} onClick={() => void checkStatus()}>
                {checking && <span className="loading-spinner loading-spinner--small" aria-hidden="true" />}
                {checking ? 'Checking status' : 'Check payment status'}
              </button>
            )}
            {(status === 'failed' || status === 'expired') && <button className="primary-button" type="button" onClick={onRetryPayment}>Try payment again <ArrowIcon /></button>}
          </div>
          <div className="vote-disclaimer"><InfoIcon /><p>Only a backend-confirmed payment can continue to voting. Payment success alone never counts as a vote.</p></div>
        </section>
      </main>
      <Footer />
    </>
  )
}
