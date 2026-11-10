import { useState } from 'react'
import { APP_CONFIG } from '../config/appConfig.js'
import { MissingStep, StepIndicator } from '../components/FlowUi.jsx'
import { ArrowIcon, InfoIcon } from '../components/Icons.jsx'
import { Footer } from '../components/SiteChrome.jsx'
import { normalizeKenyanPhone } from '../utils/phoneNumber.js'

export default function PhonePage({ choice, phone: initialPhone, onContinue }) {
  const [phone, setPhone] = useState(initialPhone)
  const [error, setError] = useState('')

  const submitPhone = (event) => {
    event.preventDefault()
    const result = normalizeKenyanPhone(phone)
    if (result.error) {
      setError(result.error)
      return
    }
    onContinue(result.value)
  }

  if (!APP_CONFIG.pollOptions.includes(choice)) {
    return <MissingStep message={`Choose ${APP_CONFIG.pollOptions.join(' or ')} before entering your phone number.`} />
  }

  return (
    <>
      <main className="subpage-main vote-page flow-page">
        <a className="back-link" href="#/vote"><span aria-hidden="true">←</span> Back to response</a>
        <StepIndicator step={2} />
        <div className="vote-intro">
          <p className="hero-kicker"><span className="hero-kicker__line" /> YOUR CONTACT NUMBER</p>
          <h1>One more<br /><span>step.</span></h1>
          <p className="hero-description">Enter a Kenyan mobile number to review your participation details.</p>
        </div>
        <form className="vote-card phone-card" onSubmit={submitPhone} noValidate>
          <div className="vote-card__header"><span className="eyebrow eyebrow--muted">PARTICIPATION FEE</span><span className="vote-card__step">KES {APP_CONFIG.participationFee}</span></div>
          <h2 id="phone-heading">Your Kenyan mobile number</h2>
          <label className="phone-label" htmlFor="phone-number">Mobile number</label>
          <div className={`phone-input-wrap${error ? ' phone-input-wrap--error' : ''}`}>
            <span className="phone-prefix" aria-hidden="true">KE</span>
            <input
              id="phone-number"
              name="phone"
              type="tel"
              required
              inputMode="tel"
              autoComplete="tel"
              aria-describedby={error ? 'phone-error phone-hint' : 'phone-hint'}
              aria-invalid={Boolean(error)}
              placeholder="0712 345 678"
              value={phone}
              onChange={(event) => { setPhone(event.target.value); if (error) setError('') }}
            />
          </div>
          {error && <p className="phone-error" id="phone-error" role="alert">{error}</p>}
          <p className="phone-hint" id="phone-hint">Accepted formats include 07…, 01…, or +2547… / +2541…</p>
          <div className="fee-row"><span>Participation fee</span><strong>KES {APP_CONFIG.participationFee}</strong></div>
          <button className="primary-button vote-continue" type="submit">Continue <ArrowIcon /></button>
          <div className="vote-disclaimer"><InfoIcon /><p>Your number is sent securely to prepare the Paystack payment. It is stored separately from your selected response.</p></div>
        </form>
      </main>
      <Footer />
    </>
  )
}
