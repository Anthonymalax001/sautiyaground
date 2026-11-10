import { useEffect, useState } from 'react'
import { APP_CONFIG } from '../config/appConfig.js'
import { MissingStep, StepIndicator } from '../components/FlowUi.jsx'
import { ArrowIcon, InfoIcon } from '../components/Icons.jsx'
import { Footer } from '../components/SiteChrome.jsx'
import { KENYAN_MOBILE_PATTERN } from '../utils/phoneNumber.js'
import { checkPaymentStatus, startMpesaPayment } from '../services/paymentService.js'

export default function PaymentReviewPage({ choice, phone, poll }) {
  const validDetails = APP_CONFIG.pollOptions.includes(choice) && KENYAN_MOBILE_PATTERN.test(phone)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [payment, setPayment] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sauti:payment') || 'null') }
    catch { return null }
  })
  const [paymentMessage, setPaymentMessage] = useState('')

  useEffect(() => {
    if (!payment?.paymentId || !payment?.statusToken) return undefined
    let stopped = false
    let timer
    const refreshStatus = async () => {
      try {
        const result = await checkPaymentStatus(payment.paymentId, payment.statusToken)
        if (stopped) return
        if (result.status === 'success') setPaymentMessage('Payment verified and your response has been recorded.')
        else if (result.status === 'failed' || result.status === 'expired') setPaymentMessage(`Payment ${result.status}. You can start again.`)
        else timer = setTimeout(refreshStatus, 3000)
      } catch (requestError) {
        if (!stopped) setError(requestError.message)
      }
    }
    refreshStatus()
    return () => { stopped = true; clearTimeout(timer) }
  }, [payment])

  if (!validDetails) {
    return <MissingStep message="Your review details are missing. Return to the poll and choose a response to continue." />
  }

  const beginPayment = async () => {
    setBusy(true)
    setError('')
    try {
      const optionId = poll?.options?.find((option) => option.code === choice)?.id ?? APP_CONFIG.pollOptionIds[choice]
      const result = await startMpesaPayment({ pollId: poll?.id ?? APP_CONFIG.pollId, optionId, phoneNumber: phone })
      const paymentDetails = { paymentId: result.paymentId, statusToken: result.statusToken }
      sessionStorage.setItem('sauti:flow', JSON.stringify({ choice, phone }))
      sessionStorage.setItem('sauti:payment', JSON.stringify(paymentDetails))
      setPayment(paymentDetails)
      window.location.assign(result.authorizationUrl)
    } catch (requestError) {
      setError(requestError.message || 'Unable to start payment. Please try again.')
      setBusy(false)
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
          <p className="hero-description">Check your response and fee before moving to payment.</p>
        </div>
        <section className="vote-card review-card" aria-labelledby="review-heading">
          <div className="vote-card__header"><span className="eyebrow eyebrow--muted">PAYMENT REVIEW</span><span className="vote-card__step">Step 03 of 03</span></div>
          <h2 id="review-heading">Your participation</h2>
          <dl className="review-details">
            <div><dt>Selected response</dt><dd>{choice}</dd></div>
            <div><dt>Phone number</dt><dd>{phone}</dd></div>
            <div className="review-details__fee"><dt>Participation fee</dt><dd>KES {APP_CONFIG.participationFee}</dd></div>
          </dl>
          <button className="primary-button vote-continue" type="button" disabled={busy} onClick={beginPayment}>{busy ? 'Connecting to Paystack…' : 'Proceed to M-Pesa'} <ArrowIcon /></button>
          {error && <p className="payment-status" role="alert">{error}</p>}
          {paymentMessage && <p className="payment-status" role="status">{paymentMessage}</p>}
          <div className="vote-disclaimer"><InfoIcon /><p>Your response will only count after payment is verified and a vote is successfully recorded.</p></div>
        </section>
      </main>
      <Footer />
    </>
  )
}
