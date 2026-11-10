import { useCallback, useEffect, useRef, useState } from 'react'
import { InfoIcon } from '../components/Icons.jsx'
import { Footer } from '../components/SiteChrome.jsx'
import { APP_CONFIG } from '../config/appConfig.js'
import { fetchPollResults } from '../services/pollService.js'

const RESULT_POLL_INTERVAL = 10000

function isValidResults(data) {
  if (!data || !data.counts || !Number.isInteger(data.totalConfirmedVotes) || data.totalConfirmedVotes < 0) return false
  const counts = APP_CONFIG.pollOptions.map((option) => data.counts[option])
  if (!counts.every((count) => Number.isInteger(count) && count >= 0)) return false
  if (counts.reduce((sum, count) => sum + count, 0) !== data.totalConfirmedVotes) return false
  return typeof data.lastUpdatedAt === 'string' && Number.isFinite(Date.parse(data.lastUpdatedAt))
}

function formatUpdatedAt(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
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
      const data = await fetchPollResults(APP_CONFIG.pollId)
      if (!isValidResults(data)) throw new Error('The results service returned incomplete or invalid aggregate data.')
      resultsRef.current = data
      setResults(data)
      setError('')
    } catch (requestError) {
      setError(requestError?.code === 'BACKEND_NOT_CONFIGURED'
        ? 'Live results are unavailable because the results service has not been connected yet.'
        : 'We could not refresh the results. Try again in a moment.')
    } finally {
      setLoading(false)
      setRefreshing(false)
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadResults(), 0)
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadResults(true)
    }, RESULT_POLL_INTERVAL)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void loadResults(true)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [loadResults])

  const hasResults = results !== null
  const total = results?.totalConfirmedVotes ?? 0

  return (
    <>
      <main className="subpage-main policy-page results-page">
        <a className="back-link" href="#/"><span aria-hidden="true">←</span> Back to introduction</a>
        <section className="policy-card results-card" aria-labelledby="results-heading">
          <div className="results-card__header">
            <div>
              <p className="hero-kicker"><span className="hero-kicker__line" /> {APP_CONFIG.pollTitle}</p>
              <h1 id="results-heading">Confirmed poll results</h1>
            </div>
            <span className="results-refresh" aria-live="polite">
              {refreshing && <span className="loading-spinner loading-spinner--small" aria-hidden="true" />}
              {refreshing ? 'Updating' : 'Refreshes every 10 seconds'}
            </span>
          </div>

          {loading && !hasResults && (
            <div className="results-state" role="status">
              <span className="loading-spinner" aria-hidden="true" />
              <p>Loading confirmed results...</p>
            </div>
          )}

          {!loading && !hasResults && error && (
            <div className="results-state results-state--error" role="alert">
              <p>{error}</p>
              <button className="secondary-button" type="button" onClick={() => void loadResults()} disabled={refreshing}>Try again</button>
            </div>
          )}

          {hasResults && (
            <>
              {error && (
                <div className="results-inline-error" role="status">
                  <p>{error} Showing the last confirmed results received.</p>
                  <button className="secondary-button" type="button" onClick={() => void loadResults()} disabled={refreshing}>Try again</button>
                </div>
              )}
              <div className="results-total">
                <span>Total confirmed votes</span>
                <strong>{total.toLocaleString()}</strong>
              </div>

              {total === 0 ? (
                <div className="results-empty" role="status">
                  <p>No confirmed votes yet.</p>
                  <span>Results will appear here after the backend verifies payments and records responses.</span>
                </div>
              ) : (
                <div className="results-options">
                  {APP_CONFIG.pollOptions.map((option, index) => {
                    const count = results.counts[option]
                    const percentage = (count / total) * 100
                    return (
                      <section className="result-option" key={option} aria-labelledby={`result-${option}`}>
                        <div className="result-option__labels">
                          <h2 id={`result-${option}`}>{option}</h2>
                          <div><strong>{count.toLocaleString()}</strong><span>{percentage.toFixed(1)}%</span></div>
                        </div>
                        <div className="result-bar" role="progressbar" aria-label={`${option}: ${percentage.toFixed(1)} percent`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Number(percentage.toFixed(1))}>
                          <span className={`result-bar__fill result-bar__fill--${index === 0 ? 'green' : 'blue'}`} style={{ width: `${percentage}%` }} />
                        </div>
                      </section>
                    )
                  })}
                </div>
              )}

              <p className="results-updated">Last updated: <time dateTime={results.lastUpdatedAt}>{formatUpdatedAt(results.lastUpdatedAt)}</time></p>
            </>
          )}

          <div className="results-notice"><InfoIcon /><p>SAUTI YAGROUND is an independent voluntary opinion poll. Its results are not necessarily representative of Kenya's population.</p></div>
        </section>
      </main>
      <Footer />
    </>
  )
}
