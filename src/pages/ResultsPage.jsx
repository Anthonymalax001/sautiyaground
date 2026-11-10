import { useEffect, useState } from 'react'
import { InfoIcon } from '../components/Icons.jsx'
import { Footer } from '../components/SiteChrome.jsx'
import { APP_CONFIG } from '../config/appConfig.js'
import { fetchPollResults, fetchPublicPollInfo } from '../services/pollService.js'

export default function ResultsPage() {
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    fetchPublicPollInfo()
      .then((poll) => fetchPollResults(poll.id))
      .then(setResults)
      .catch((requestError) => setError(requestError.message))
  }, [])

  return (
    <>
      <main className="subpage-main policy-page results-page">
        <a className="back-link" href="#/">← Back to introduction</a>
        <section className="policy-card results-card">
          <p className="hero-kicker"><span className="hero-kicker__line" /> {APP_CONFIG.pollOptions.join(' vs ')}</p>
          <h1>Poll results</h1>
          {!results && <p className="policy-lead">{error || 'Loading verified results…'}</p>}
          {results && <>
            <p className="policy-lead">{results.poll.question}</p>
            <ul className="results-list">{results.results.map((item) => <li key={item.id}><span>{item.label}</span><strong>{item.votes}</strong></li>)}</ul>
          </>}
          <div className="results-notice"><InfoIcon /><p>Only votes from successful, verified KES 17 payments are included.</p></div>
        </section>
      </main>
      <Footer />
    </>
  )
}
