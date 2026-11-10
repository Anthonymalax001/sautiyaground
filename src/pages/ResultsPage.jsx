import { useCallback, useEffect, useRef, useState } from 'react'
import { InfoIcon } from '../components/Icons.jsx'
import { Footer } from '../components/SiteChrome.jsx'
import { APP_CONFIG } from '../config/appConfig.js'
import { fetchPollResults, fetchPublicPollInfo } from '../services/pollService.js'

const RESULT_REFRESH_INTERVAL = 10000
const CHART_COLORS = Object.freeze({
  WANTAM: '#55adff',
  TUTAM: '#f2c451',
})

function validateResults(data) {
  if (!data?.poll || typeof data.poll.id !== 'string' || !Array.isArray(data.results)) {
    throw new Error('The results service returned an incomplete response.')
  }

  const options = APP_CONFIG.pollOptions.map((code) => {
    const matches = data.results.filter((item) => item.code === code)
    const item = matches[0]
    if (matches.length !== 1 || !item || typeof item.id !== 'string'
      || typeof item.label !== 'string' || !Number.isSafeInteger(item.votes) || item.votes < 0) {
      throw new Error('The results service returned incomplete poll counts.')
    }
    return { id: item.id, code, label: item.label, votes: item.votes }
  })

  if (data.results.length !== options.length) throw new Error('The results service returned unexpected poll options.')
  return { poll: data.poll, options }
}

function VoteDistributionChart({ options, total }) {
  const byCode = Object.fromEntries(options.map((option) => [option.code, option]))
  const wantamVotes = byCode.WANTAM.votes
  const tutamVotes = byCode.TUTAM.votes
  const wantamPercent = total > 0 ? (wantamVotes / total) * 100 : 0
  const tutamPercent = total > 0 ? (tutamVotes / total) * 100 : 0
  const radius = 105
  const circumference = 2 * Math.PI * radius
  const bothPresent = wantamPercent > 0 && tutamPercent > 0
  const gap = bothPresent ? Math.min(13, circumference * Math.min(wantamPercent, tutamPercent) / 400) : 0
  const wantamLength = Math.max(0, circumference * wantamPercent / 100 - (bothPresent ? 2 * gap : 0))
  const tutamLength = Math.max(0, circumference * tutamPercent / 100 - (bothPresent ? 2 * gap : 0))
  const wantamStart = bothPresent ? gap : 0
  const tutamStart = circumference * wantamPercent / 100 + (bothPresent ? gap : 0)
  const wantamLabel = `${wantamPercent.toFixed(1)}%`
  const tutamLabel = `${tutamPercent.toFixed(1)}%`

  return (
    <div className="results-chart-wrap">
      <div className="results-donut">
        <svg className="results-donut__svg" viewBox="0 0 240 240" role="img" aria-labelledby="results-chart-title results-chart-description">
          <title id="results-chart-title">Confirmed vote distribution</title>
          <desc id="results-chart-description">WANTAM has {wantamLabel} with {wantamVotes.toLocaleString()} confirmed votes. TUTAM has {tutamLabel} with {tutamVotes.toLocaleString()} confirmed votes.</desc>
          <circle className="results-donut__track" cx="120" cy="120" r={radius} />
          {wantamLength > 0 && (
            <circle
              className="results-donut__segment results-donut__segment--wantam"
              cx="120" cy="120" r={radius}
              transform="rotate(-90 120 120)"
              strokeDasharray={`${wantamLength} ${circumference}`}
              strokeDashoffset={-wantamStart}
              style={{ stroke: CHART_COLORS.WANTAM }}
              strokeLinecap={wantamLength < 22 ? 'butt' : 'round'}
            />
          )}
          {tutamLength > 0 && (
            <circle
              className="results-donut__segment results-donut__segment--tutam"
              cx="120" cy="120" r={radius}
              transform="rotate(-90 120 120)"
              strokeDasharray={`${tutamLength} ${circumference}`}
              strokeDashoffset={-tutamStart}
              style={{ stroke: CHART_COLORS.TUTAM }}
              strokeLinecap={tutamLength < 22 ? 'butt' : 'round'}
            />
          )}
        </svg>
        <div className="results-donut__center" aria-hidden="true">
          <div className="results-donut__value results-donut__value--wantam">
            <span><i />WANTAM</span><strong>{wantamLabel}</strong>
          </div>
          <div className="results-donut__value results-donut__value--tutam">
            <span><i />TUTAM</span><strong>{tutamLabel}</strong>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResultsPage() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  const resultsRef = useRef(null)

  const loadResults = useCallback(async (backgroundRefresh = false) => {
    if (inFlight.current) return
    inFlight.current = true
    if (backgroundRefresh) setRefreshing(true)
    else if (!resultsRef.current) setLoading(true)
    try {
      const poll = await fetchPublicPollInfo()
      if (!poll?.id) throw new Error('No active poll is available.')
      const response = await fetchPollResults(poll.id)
      const confirmedResults = validateResults(response)
      resultsRef.current = confirmedResults
      setResults(confirmedResults)
      setError('')
    } catch {
      setError('We could not load the confirmed results. Please try again in a moment.')
    } finally {
      setLoading(false)
      setRefreshing(false)
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadResults(), 0)
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadResults(true)
    }, RESULT_REFRESH_INTERVAL)
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadResults(true)
    }
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [loadResults])

  const total = results?.options.reduce((sum, option) => sum + option.votes, 0) ?? 0

  return (
    <>
      <main className="subpage-main policy-page results-page">
        <a className="back-link" href="#/"><span aria-hidden="true">←</span> Back to introduction</a>
        <section className="policy-card results-card" aria-labelledby="results-heading">
          <div className="results-card__header">
            <div>
              <p className="hero-kicker"><span className="hero-kicker__line" /> {results?.poll.title || APP_CONFIG.pollTitle}</p>
              <h1 id="results-heading">Confirmed poll results</h1>
            </div>
            <span className="results-refresh" aria-live="polite">
              {refreshing && <span className="loading-spinner loading-spinner--small" aria-hidden="true" />}
              {refreshing ? 'Updating' : 'Refreshes every 10 seconds'}
            </span>
          </div>

          {results?.poll.question && <p className="policy-lead">{results.poll.question}</p>}

          {loading && !results && <div className="results-state" role="status"><span className="loading-spinner" aria-hidden="true" /><p>Loading confirmed results...</p></div>}

          {!loading && !results && error && (
            <div className="results-state results-state--error" role="alert">
              <p>{error}</p>
              <button className="secondary-button" type="button" onClick={() => void loadResults()} disabled={refreshing}>Try again</button>
            </div>
          )}

          {results && (
            <>
              {error && <div className="results-inline-error" role="status"><p>{error} Showing the last confirmed results received.</p><button className="secondary-button" type="button" onClick={() => void loadResults()} disabled={refreshing}>Try again</button></div>}

              <div className="results-total">
                <span>Total confirmed votes</span>
                <strong>{total.toLocaleString()}</strong>
              </div>

              <VoteDistributionChart options={results.options} total={total} />

              {total === 0 && <div className="results-empty" role="status"><p>No confirmed votes yet.</p><span>Percentages remain at 0.0% until the backend records confirmed votes.</span></div>}

              <section className="results-summary-grid" aria-label="Confirmed results by option">
                {results.options.map((option) => {
                  const percentage = total > 0 ? (option.votes / total) * 100 : 0
                  return (
                    <article className={`results-summary-card results-summary-card--${option.code.toLowerCase()}`} key={option.id} aria-labelledby={`result-${option.code}`}>
                      <div className="results-summary-card__heading">
                        <span className="results-summary-card__dot" aria-hidden="true" />
                        <h2 id={`result-${option.code}`}>{option.label}</h2>
                      </div>
                      <div className="results-summary-card__metrics">
                        <div><span>Confirmed votes</span><strong>{option.votes.toLocaleString()}</strong></div>
                        <div><span>Share</span><strong>{percentage.toFixed(1)}%</strong></div>
                      </div>
                    </article>
                  )
                })}
              </section>
            </>
          )}

          <div className="results-notice"><InfoIcon /><p>Only votes confirmed and recorded by the backend are included. SAUTI YAGROUND is an independent opinion poll and is not necessarily representative of Kenya's population.</p></div>
        </section>
      </main>
      <Footer />
    </>
  )
}
