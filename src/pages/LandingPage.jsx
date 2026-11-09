import { useState } from 'react'
import { APP_CONFIG } from '../config/appConfig.js'
import { ParticipationCard, PollCard } from '../components/LandingCards.jsx'
import { Footer } from '../components/SiteChrome.jsx'

export default function LandingPage({ onContinue }) {
  const [agreed, setAgreed] = useState(false)

  const continueToVote = () => {
    if (agreed) onContinue()
  }

  return (
    <>
      <main className="landing-main">
        <section className="hero-copy">
          <div className="hero-kicker"><span className="hero-kicker__line" /> KENYA'S PUBLIC VOICE</div>
          <h1>Your Voice<br /><span>Matters!</span></h1>
          <p className="tagline">Your Voice. Your Opinion.</p>
          <p className="hero-subtitle">Kenya's Independent Public Opinion Platform.</p>
          <p className="hero-description">Welcome to {APP_CONFIG.websiteName}, an independent public opinion platform where participants can share their views on important public issues.</p>
          <div className="hero-footnote"><span className="footnote-mark" aria-hidden="true">✳</span> A space for every perspective.</div>
        </section>
        <div className="landing-panels">
          <PollCard />
          <ParticipationCard agreed={agreed} setAgreed={setAgreed} onContinue={continueToVote} />
        </div>
      </main>
      <Footer />
    </>
  )
}
