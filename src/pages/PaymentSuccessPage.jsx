import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowIcon } from '../components/Icons.jsx'
import { Footer } from '../components/SiteChrome.jsx'
import { checkPaymentStatus } from '../services/paymentService.js'

const PAYMENT_SESSION_KEY = 'sauti:payment'
const PAYMENT_REFERENCE_PATTERN = /^sg-[a-f\d-]{36}$/i
const VALID_STATUSES = ['pending', 'success', 'failed', 'expired']

function readPaymentDetails() {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(PAYMENT_SESSION_KEY) || 'null')
    if (typeof value?.paymentId !== 'string'
      || typeof value?.statusToken !== 'string'
      || typeof value?.reference !== 'string') return null
    return value
  } catch {
    return null
  }
}

function readReturnReference() {
  const search = new URLSearchParams(window.location.search)
  const hashQuery = window.location.hash.slice(1).split('?').slice(1).join('?')
  const hash = new URLSearchParams(hashQuery)
  const values = [...search.getAll('reference'), ...hash.getAll('reference')]
  if (values.length !== 1 || !PAYMENT_REFERENCE_PATTERN.test(values[0])) return ''
  return values[0]
}

export default function PaymentSuccessPage() {
  const [payment] = useState(readPaymentDetails)
  const [reference] = useState(readReturnReference)
  const matchedPayment = Boolean(payment && reference && payment.reference === reference)
  const [status, setStatus] = useState(matchedPayment ? 'checking' : 'unavailable')
  const [error, setError] = useState(matchedPayment
    ? ''
    : 'This return could not be matched to a payment in this browser. We cannot confirm that a response was recorded.')
  const [checking, setChecking] = useState(false)
  const inFlight = useRef(false)

  const verifyStatus = useCallback(async () => {
    if (!matchedPayment || inFlight.current) return
    inFlight.current = true
    setChecking(true)
    setError('')
    try {
      const result = await checkPaymentStatus(payment.paymentId, payment.statusToken)
      if (!result || result.paymentId !== payment.paymentId || !VALID_STATUSES.includes(result.status)) {
        throw new Error('The backend returned an unrecognized payment status.')
      }
      setStatus(result.status)
    } catch {
      setStatus('unavailable')
      setError('We could not confirm that your response was recorded. Check again in a moment.')
    } finally {
      inFlight.current = false
      setChecking(false)
    }
  }, [matchedPayment, payment])

  useEffect(() => {
    if (!matchedPayment) return undefined
    const initialCheck = window.setTimeout(() => void verifyStatus(), 0)
    return () => window.clearTimeout(initialCheck)
  }, [matchedPayment, verifyStatus])

  useEffect(() => {
    if (!matchedPayment || status !== 'pending') return undefined
    const timer = window.setTimeout(() => void verifyStatus(), 3000)
    return () => window.clearTimeout(timer)
  }, [matchedPayment, status, verifyStatus])

  const confirmed = status === 'success'
  let heading = 'Confirming your response'
  let message = 'Checking with the backend. Success is shown only after it confirms that your response was recorded.'
  if (status === 'pending') {
    heading = 'Confirmation pending'
    message = 'The backend has not confirmed a recorded response yet. We will check again shortly.'
  } else if (confirmed) {
    heading = 'Your response has been recorded.'
    message = 'The backend confirmed the payment and recorded your response. Thank you for taking part.'
  } else if (status === 'failed' || status === 'expired') {
    heading = 'Response not confirmed'
    message = 'The backend did not confirm a recorded response. No vote confirmation is shown.'
  } else if (status === 'unavailable') {
    heading = 'Confirmation unavailable'
    message = error
  }

  return (
    <>
      <main className="subpage-main policy-page status-page">
        <section className="policy-card status-card" aria-labelledby="payment-success-heading" aria-live="polite">
          <p className="hero-kicker"><span className="hero-kicker__line" /> VOTE CONFIRMATION</p>
          {confirmed && <div className="status-card__mark"><span className="status-mark status-mark--success" aria-hidden="true">✓</span></div>}
          {(status === 'failed' || status === 'expired') && <div className="status-card__mark"><span className="status-mark status-mark--error" aria-hidden="true">!</span></div>}
          <h1 id="payment-success-heading">{heading}</h1>
          <p className="policy-lead">{message}</p>
          {confirmed ? (
            <a className="primary-button policy-button" href="/#/results">View poll results <ArrowIcon /></a>
          ) : (
            <div className="status-card__actions">
              {matchedPayment && <button className="secondary-button" type="button" disabled={checking} onClick={() => void verifyStatus()}>
                {checking && <span className="loading-spinner loading-spinner--small" aria-hidden="true" />}
                {checking ? 'Checking status' : 'Check again'}
              </button>}
              <a className="secondary-button" href="/">Return to introduction</a>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
