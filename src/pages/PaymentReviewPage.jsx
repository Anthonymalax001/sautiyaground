import { useState } from 'react'
import { APP_CONFIG } from '../config/appConfig.js'
import { MissingStep, StepIndicator } from '../components/FlowUi.jsx'
import { ArrowIcon } from '../components/Icons.jsx'
import { Footer } from '../components/SiteChrome.jsx'
import { KENYAN_MOBILE_PATTERN } from '../utils/phoneNumber.js'

export default function PaymentReviewPage({ choice, phone, onStartPayment }) {
  const validDetails = APP_CONFIG.pollOptions.includes(choice) && KENYAN_MOBILE_PATTERN.test(phone)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  if (!validDetails) {
    return <MissingStep message="Your review details are missing. Return to the poll and choose a response to continue." />
  }

  const startPayment = async () => {
    if (!validDetails || starting) return
    setStarting(true)
    setError('')
    try {
      await onStartPayment()
    } catch (requestError) {
      setError(requestError?.message || 'We could not start the Paystack checkout. Please try again.')
      setStarting(false)
    }
  }

  return (
    <>
      <main className="subpage-main vote-page flow-page">
        <a className="back-link" href="#/phone"><span aria-hidden="true">←</span> Back to phone number</a>
        <StepIndicator step={3} />
        <div className="vote-intro">
          <p className="hero-kicker"><span className="hero-kicker__line" /> REVIEW DETAILS</p>
          <h1>Almost<br /><span>there.</span></h1>
          <p className="hero-description">Check your response and fee before continuing to Paystack.</p>
        </div>
        <section className="vote-card review-card" aria-labelledby="review-heading">
          <div className="vote-card__header"><span className="eyebrow eyebrow--muted">PAYMENT REVIEW</span><span className="vote-card__step">Step 03 of 03</span></div>
          <h2 id="review-heading">Your participation</h2>
          <dl className="review-details">
            <div><dt>Selected response</dt><dd>{choice}</dd></div>
            <div><dt>Phone number</dt><dd>{phone}</dd></div>
            <div className="review-details__fee"><dt>Participation fee</dt><dd>KES {APP_CONFIG.participationFee}</dd></div>
          </dl>
          <button className="primary-button vote-continue" type="button" disabled={starting} onClick={startPayment}>
            {starting && <span className="loading-spinner loading-spinner--small" aria-hidden="true" />}
            {starting ? 'Opening Paystack' : 'Proceed to Paystack'} {!starting && <ArrowIcon />}
          </button>
          {error && <p className="flow-error" role="alert">{error}</p>}
        </section>
      </main>
      <Footer />
    </>
  )
}
