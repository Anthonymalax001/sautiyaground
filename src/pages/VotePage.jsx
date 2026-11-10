import { APP_CONFIG } from '../config/appConfig.js'
import { StepIndicator } from '../components/FlowUi.jsx'
import { ArrowIcon, CheckIcon, InfoIcon } from '../components/Icons.jsx'
import { Footer } from '../components/SiteChrome.jsx'

export default function VotePage({ selection, setSelection, poll }) {
  const options = poll?.options?.length ? poll.options.map((option) => option.code) : APP_CONFIG.pollOptions
  const continueToPhone = () => {
    if (selection) window.location.hash = '#/phone'
  }

  return (
    <>
      <main className="subpage-main vote-page">
        <a className="back-link" href="#/"><span aria-hidden="true">←</span> Back to introduction</a>
        <StepIndicator step={1} />
        <div className="vote-intro">
          <p className="hero-kicker"><span className="hero-kicker__line" /> THE CURRENT POLL</p>
          <h1>Make your voice<br /><span>heard.</span></h1>
          <p className="hero-description">Choose the response that best reflects your view on this public issue.</p>
        </div>
        <section className="vote-card" aria-labelledby="vote-question">
          <div className="vote-card__header"><span className="eyebrow eyebrow--muted">{options.join(' vs ')}</span><span className="vote-card__step">Your response</span></div>
          <h2 id="vote-question">{poll?.question || 'Which perspective do you support?'}</h2>
          <div className="choice-list">
            {options.map((option, index) => (
              <button key={option} type="button" className={`choice-card${selection === option ? ' choice-card--selected' : ''}`} aria-pressed={selection === option} onClick={() => setSelection(option)}>
                <span className={`choice-card__letter choice-card__letter--${index === 0 ? 'green' : 'blue'}`}>{String.fromCharCode(65 + index)}</span>
                <span className="choice-card__name">{option}</span>
                <span className="choice-card__radio" aria-hidden="true"><CheckIcon /></span>
              </button>
            ))}
          </div>
          {selection ? <p className="selection-message" role="status">{selection} selected. Your response has not been submitted or counted.</p> : <p className="vote-hint">Select one option to continue.</p>}
          <p className="vote-fee">Participation fee: <strong>KES {APP_CONFIG.participationFee}</strong></p>
          <button className="primary-button vote-continue" type="button" disabled={!selection} onClick={continueToPhone}>
            Continue <ArrowIcon />
          </button>
          <div className="vote-disclaimer"><InfoIcon /><p>No response is submitted or counted at this step.</p></div>
        </section>
      </main>
      <Footer />
    </>
  )
}
