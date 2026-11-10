import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowIcon } from '../components/Icons.jsx'
import { Footer } from '../components/SiteChrome.jsx'
import { isValidPaymentReference } from '../utils/paymentRedirect.js'

export default function VoteSuccessPage({ confirmationReference, checkVoteStatus }) {
  const receiptValid = isValidPaymentReference(confirmationReference)
  const [status, setStatus] = useState(receiptValid ? 'checking' : 'unavailable')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(receiptValid ? '' : 'A vote confirmation reference is not available in this browser session.')
  const inFlight = useRef(false)

  const verifyRecordedVote = useCallback(async () => {
    if (!isValidPaymentReference(confirmationReference) || inFlight.current) return
    inFlight.current = true
    setChecking(true)
    setError('')
    try {
      const result = await checkVoteStatus(confirmationReference)
      if (!result || typeof result.recorded !== 'boolean') {
        throw new Error('The backend returned an invalid vote status.')
      }
      setStatus(result.recorded ? 'recorded' : 'pending')
      if (!result.recorded) setError('The backend has not confirmed that this response was recorded. Check again before assuming your vote was counted.')
    } catch (requestError) {
      setStatus('unavailable')
      setError(requestError?.code === 'BACKEND_NOT_CONFIGURED'
        ? 'Vote confirmation is not connected yet. The response has not been confirmed on this page.'
        : 'We could not confirm that the response was recorded. Try checking again.')
    } finally {
      inFlight.current = false
      setChecking(false)
    }
  }, [checkVoteStatus, confirmationReference])

  useEffect(() => {
    if (!receiptValid) return undefined
    const initialCheck = window.setTimeout(() => void verifyRecordedVote(), 0)
    return () => window.clearTimeout(initialCheck)
  }, [receiptValid, verifyRecordedVote])

  const confirmed = status === 'recorded'
  const heading = confirmed
    ? 'Payment verified and your response has been recorded.'
    : status === 'pending'
      ? 'Vote confirmation pending'
      : status === 'checking'
        ? 'Confirming your response'
        : 'Vote confirmation unavailable'

  return (
    <>
      <main className="subpage-main policy-page status-page">
        <section className="policy-card status-card" aria-labelledby="vote-success-heading" aria-live="polite">
          <p className="hero-kicker"><span className="hero-kicker__line" /> VOTE CONFIRMATION</p>
          {confirmed && <div className="status-card__mark"><span className="status-mark status-mark--success" aria-hidden="true">✓</span></div>}
          <h1 id="vote-success-heading">{heading}</h1>

          {confirmed ? (
            <>
              <p className="policy-lead">The backend has authoritatively confirmed that your vote was recorded. Thank you for taking part.</p>
              <a className="primary-button policy-button" href="#/results">View poll results <ArrowIcon /></a>
            </>
          ) : (
            <>
              <p className="policy-lead">{status === 'checking' ? 'Checking the backend for an authoritative vote confirmation.' : error}</p>
              {receiptValid && <button className="secondary-button vote-continue" type="button" disabled={checking} onClick={() => void verifyRecordedVote()}>
                {checking && <span className="loading-spinner loading-spinner--small" aria-hidden="true" />}
                {checking ? 'Checking confirmation' : 'Check vote confirmation'}
              </button>}
              {!receiptValid && <p className="status-card__hint">This page does not infer success from its URL or earlier browser state.</p>}
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
