import { APP_CONFIG } from '../config/appConfig.js'
import { ArrowIcon } from './Icons.jsx'
import { Footer } from './SiteChrome.jsx'

export function StepIndicator({ step }) {
  return (
    <div className="step-indicator" aria-label={`Step ${step} of 3`}>
      {[1, 2, 3].map((number) => <span key={number} className={number <= step ? 'step-indicator__active' : ''} />)}
      STEP 0{step} <b>—</b> 03
    </div>
  )
}

export function MissingStep({ message }) {
  return (
    <>
      <main className="subpage-main policy-page">
        <section className="policy-card missing-step">
          <p className="hero-kicker"><span className="hero-kicker__line" /> {APP_CONFIG.websiteName}</p>
          <h1>Let’s start with the poll.</h1>
          <p className="hero-description">{message}</p>
          <a className="primary-button policy-button" href="#/vote">Choose your response <ArrowIcon /></a>
        </section>
      </main>
      <Footer />
    </>
  )
}
