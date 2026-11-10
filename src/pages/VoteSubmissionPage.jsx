import { useState } from 'react'
import { APP_CONFIG } from '../config/appConfig.js'
import { MissingStep } from '../components/FlowUi.jsx'
import { ArrowIcon, InfoIcon } from '../components/Icons.jsx'
import { Footer } from '../components/SiteChrome.jsx'
import { isValidPaymentReference } from '../utils/paymentRedirect.js'

export default function VoteSubmissionPage({ choice, votingCredential, onSubmitVote, onRecorded }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const valid = APP_CONFIG.pollOptions.includes(choice) && Boolean(votingCredential)

  if (!valid) {
    return <MissingStep message="A verified payment and one-time voting credential are required before submitting a response." />
  }

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      const result = await onSubmitVote()
      if (result?.recorded !== true || !isValidPaymentReference(result.confirmationReference)) {
        throw new Error('The backend did not confirm the vote with a confirmation reference.')
      }
      onRecorded(result.confirmationReference)
    } catch (requestError) {
      setError(requestError?.code === 'BACKEND_NOT_CONFIGURED'
        ? 'Vote submission is not connected yet. No success has been confirmed and this response is not counted.'
        : 'We could not confirm that your vote was recorded. You can retry; success is shown only after the backend confirms it.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <main className="subpage-main policy-page status-page">
        <a className="back-link" href="#/payment-status"><span aria-hidden="true">←</span> Back to payment status</a>
        <section className="policy-card status-card" aria-labelledby="vote-submit-heading">
          <p className="hero-kicker"><span className="hero-kicker__line" /> VOTE SUBMISSION</p>
          <h1 id="vote-submit-heading">Confirm your response</h1>
          <p className="policy-lead">Your KES {APP_CONFIG.participationFee} payment has been verified. Submit the selected response below. It will count only after the backend confirms it was recorded.</p>
          <dl className="review-details vote-confirmation-details">
            <div><dt>Selected response</dt><dd>{choice}</dd></div>
            <div><dt>Poll</dt><dd>{APP_CONFIG.pollTitle}</dd></div>
          </dl>
          <button className="primary-button vote-continue" type="button" disabled={submitting} onClick={submit}>
            {submitting && <span className="loading-spinner loading-spinner--small" aria-hidden="true" />}
            {submitting ? 'Submitting response' : 'Submit my vote'} {!submitting && <ArrowIcon />}
          </button>
          {error && <p className="flow-error" role="alert">{error}</p>}
          <div className="vote-disclaimer"><InfoIcon /><p>Your phone number and payment reference are not included in this vote submission. The one-time voting credential is sent to the backend with your selected response.</p></div>
        </section>
      </main>
      <Footer />
    </>
  )
}
