import { InfoIcon } from '../components/Icons.jsx'
import { Footer } from '../components/SiteChrome.jsx'
import { APP_CONFIG } from '../config/appConfig.js'

export default function ResultsPage() {
  return (
    <>
      <main className="subpage-main policy-page results-page">
        <a className="back-link" href="#/"><span aria-hidden="true">←</span> Back to introduction</a>
        <section className="policy-card results-card">
          <p className="hero-kicker"><span className="hero-kicker__line" /> {APP_CONFIG.pollOptions.join(' vs ')}</p>
          <h1>Poll results</h1>
          <p className="policy-lead">Results are not live yet.</p>
          <div className="results-notice"><InfoIcon /><p>Results will be available when a payment is verified and a vote is successfully recorded. No live results are shown until the backend is connected.</p></div>
        </section>
      </main>
      <Footer />
    </>
  )
}
