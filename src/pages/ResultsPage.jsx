import { useCallback, useEffect, useRef, useState } from 'react'
import { InfoIcon } from '../components/Icons.jsx'
import { Footer } from '../components/SiteChrome.jsx'
import { APP_CONFIG } from '../config/appConfig.js'
import { fetchPollResults, fetchPublicPollInfo } from '../services/pollService.js'

const RESULT_REFRESH_INTERVAL = 10000

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
              <div className="results-total"><span>Total confirmed votes</span><strong>{total.toLocaleString()}</strong></div>
              {total === 0 ? (
                <div className="results-empty" role="status">
                  <p>No confirmed votes yet.</p>
                  <span>Results appear after the backend verifies payment and records responses.</span>
                </div>
              ) : (
                <div className="results-options">
                  {results.options.map((option, index) => {
                    const percentage = (option.votes / total) * 100
                    return (
                      <section className="result-option" key={option.id} aria-labelledby={`result-${option.code}`}>
                        <div className="result-option__labels">
                          <h2 id={`result-${option.code}`}>{option.label}</h2>
                          <div><strong>{option.votes.toLocaleString()}</strong><span>{percentage.toFixed(1)}%</span></div>
                        </div>
                        <div className="result-bar" role="progressbar" aria-label={`${option.label}: ${percentage.toFixed(1)} percent`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Number(percentage.toFixed(1))}>
                          <span className={`result-bar__fill result-bar__fill--${index === 0 ? 'green' : 'blue'}`} style={{ width: `${percentage}%` }} />
                        </div>
                      </section>
                    )
                  })}
                </div>
              )}
            </>
          )}

          <div className="results-notice"><InfoIcon /><p>Only votes confirmed and recorded by the backend are included. SAUTI YAGROUND is an independent opinion poll and is not necessarily representative of Kenya's population.</p></div>
        </section>
      </main>
      <Footer />
    </>
  )
}
