import { APP_CONFIG } from '../config/appConfig.js'
import { ArrowIcon } from '../components/Icons.jsx'
import { Footer } from '../components/SiteChrome.jsx'

export default function PolicyPage({ type }) {
  const isPrivacy = type === 'privacy'

  return (
    <>
      <main className="subpage-main policy-page">
        <a className="back-link" href="#/"><span aria-hidden="true">←</span> Back to introduction</a>
        <div className="policy-card">
          <p className="hero-kicker"><span className="hero-kicker__line" /> {APP_CONFIG.websiteName}</p>
          <h1>{isPrivacy ? 'Privacy Policy' : 'Terms & Conditions'}</h1>
          {isPrivacy ? (
            <div className="policy-copy">
              <p className="policy-lead">Please read this notice before participating in a poll.</p>
              <h2>On this page</h2>
              <p>This landing page does not ask for personal information, submit a response, or process a payment. Agreement checkbox choices are not saved or sent.</p>
              <h2>Before a poll response is submitted</h2>
              <p>{APP_CONFIG.websiteName} should publish the information about data collected, how it is used, who it is shared with, and how long it is kept before collecting participant information or payment. Read that notice before proceeding with any live poll.</p>
              <p className="policy-callout">Poll results display confirmed responses. This poll is independent and is not an official election or a scientifically representative national survey.</p>
            </div>
          ) : (
            <div className="policy-copy">
              <p className="policy-lead">Participation in {APP_CONFIG.websiteName} public opinion polls is voluntary.</p>
              <h2>Poll participation</h2>
              <p>A participation fee of KES {APP_CONFIG.participationFee} helps cover operational costs and server maintenance. Each participant can vote only once per poll. A response is counted only after payment verification. Results display confirmed votes.</p>
              <h2>About the poll</h2>
              <p>{APP_CONFIG.websiteName} polls are independent public opinion polls. They are not official elections and are not scientifically representative national surveys.</p>
              <h2>Before you participate</h2>
              <p>Please read the privacy notice and the published eligibility rules before taking part. No response is submitted from the introduction page.</p>
            </div>
          )}
          <a className="primary-button policy-button" href="#/">Return to introduction <ArrowIcon /></a>
        </div>
      </main>
      <Footer />
    </>
  )
}
