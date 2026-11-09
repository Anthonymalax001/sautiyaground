import { APP_CONFIG } from '../config/appConfig.js'
import { ArrowIcon, CheckIcon, InfoIcon } from './Icons.jsx'

const participationPoints = [
  `A participation fee of KES ${APP_CONFIG.participationFee} will be charged to help cover operational costs and server maintenance.`,
  'Each participant can vote only once per poll.',
  'Results are updated immediately as confirmed votes are recorded.',
  'Participation is voluntary.',
]

export function PollCard() {
  const [firstOption, secondOption] = APP_CONFIG.pollOptions

  return (
    <section className="poll-card" aria-labelledby="poll-title">
      <div className="poll-card__topline">
        <span className="eyebrow"><span className="eyebrow__spark" /> Featured poll</span>
        <span className="poll-card__index">01 <span>/ 01</span></span>
      </div>
      <div className="poll-card__visual" aria-hidden="true">
        <span className="orbit orbit--one" />
        <span className="orbit orbit--two" />
        <span className="poll-card__center"><span className="pulse-line" /></span>
        <span className="poll-card__label poll-card__label--left">A</span>
        <span className="poll-card__label poll-card__label--right">B</span>
      </div>
      <div className="poll-card__copy">
        <p className="eyebrow eyebrow--muted">The question</p>
        <h2 id="poll-title">{firstOption} <span>vs</span> {secondOption}</h2>
        <p className="poll-card__description">An independent public opinion poll. Share your view on the issue.</p>
      </div>
      <div className="poll-card__rule" />
      <div className="poll-card__note">
        <span className="note-icon"><InfoIcon /></span>
        <p>This is not an official election or a scientifically representative national survey.</p>
      </div>
      <div className="card-glow" aria-hidden="true" />
    </section>
  )
}

export function ParticipationCard({ agreed, setAgreed, onContinue }) {
  return (
    <section className="participation-card" aria-labelledby="participation-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow eyebrow--muted">Good to know</p>
          <h2 id="participation-title">Before you take part</h2>
        </div>
        <span className="section-heading__symbol" aria-hidden="true"><CheckIcon /></span>
      </div>
      <ul className="participation-list">
        {participationPoints.map((point) => (
          <li key={point}><span className="list-check"><CheckIcon /></span><span>{point}</span></li>
        ))}
      </ul>
      <div className="agreement">
        <div className="agreement__label">
          <label className="agreement__check">
            <input type="checkbox" aria-label="Agree to the Terms and Conditions and confirm reading the Privacy Policy" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
            <span className="custom-checkbox" aria-hidden="true"><CheckIcon /></span>
          </label>
          <span>I agree to the <a href="#/terms">Terms &amp; Conditions</a> and have read the <a href="#/privacy">Privacy Policy</a>.</span>
        </div>
      </div>
      <button className="primary-button" type="button" disabled={!agreed} onClick={onContinue}>
        <span>Continue</span><ArrowIcon />
      </button>
      <p className="secure-note"><span className="secure-note__dot" /> Your response is only counted after payment verification.</p>
    </section>
  )
}
