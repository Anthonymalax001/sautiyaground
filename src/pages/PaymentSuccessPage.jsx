import { Footer } from '../components/SiteChrome.jsx'

export default function PaymentSuccessPage() {
  const reference = new URLSearchParams(window.location.search).get('reference')

  return (
    <>
      <main className="subpage-main policy-page results-page">
        <section className="policy-card results-card">
          <p className="hero-kicker"><span className="hero-kicker__line" /> PAYMENT VERIFIED</p>
          <h1>Thank you.</h1>
          <p className="policy-lead">Your KES 17 payment was verified and your response was recorded.</p>
          {reference && <p className="phone-hint">Reference: {reference}</p>}
          <a className="primary-button vote-continue" href="/">Return to SAUTI YAGROUND</a>
        </section>
      </main>
      <Footer />
    </>
  )
}
