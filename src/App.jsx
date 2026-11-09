import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { InfoIcon } from './components/Icons.jsx'
import { Header, InfoDialog } from './components/SiteChrome.jsx'
import { APP_CONFIG } from './config/appConfig.js'
import LandingPage from './pages/LandingPage.jsx'
import PaymentReviewPage from './pages/PaymentReviewPage.jsx'
import PhonePage from './pages/PhonePage.jsx'
import PolicyPage from './pages/PolicyPage.jsx'
import ResultsPage from './pages/ResultsPage.jsx'
import VotePage from './pages/VotePage.jsx'

function useHashRoute() {
  const getRoute = () => window.location.hash.slice(1).split('?')[0] || '/'
  const [route, setRoute] = useState(getRoute)

  useEffect(() => {
    const syncRoute = () => setRoute(getRoute())
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  return route
}

function App() {
  const route = useHashRoute()
  const [infoOpen, setInfoOpen] = useState(false)
  const [flow, setFlow] = useState({ choice: '', phone: '' })
  const infoButtonRef = useRef(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = `${APP_CONFIG.websiteName} — Your Voice. Your Opinion.`
  }, [route])

  const startVoting = () => {
    setFlow({ choice: '', phone: '' })
    window.location.hash = '#/vote'
  }

  const continueWithPhone = (phone) => {
    setFlow((currentFlow) => ({ ...currentFlow, phone }))
    window.location.hash = '#/review'
  }

  const closeInfo = useCallback(() => {
    setInfoOpen(false)
    infoButtonRef.current?.focus()
  }, [])

  let page
  switch (route) {
    case '/vote':
      page = <VotePage selection={flow.choice} setSelection={(choice) => setFlow((currentFlow) => ({ ...currentFlow, choice }))} />
      break
    case '/phone':
      page = <PhonePage choice={flow.choice} phone={flow.phone} onContinue={continueWithPhone} />
      break
    case '/review':
      page = <PaymentReviewPage choice={flow.choice} phone={flow.phone} />
      break
    case '/results':
      page = <ResultsPage />
      break
    case '/terms':
      page = <PolicyPage type="terms" />
      break
    case '/privacy':
      page = <PolicyPage type="privacy" />
      break
    default:
      page = <LandingPage onContinue={startVoting} />
  }

  return (
    <div className="site-shell">
      <div className="ambient ambient--green" aria-hidden="true" />
      <div className="ambient ambient--blue" aria-hidden="true" />
      <Header />
      {page}
      <button ref={infoButtonRef} className="info-control" type="button" onClick={() => setInfoOpen(true)} aria-label="Information about this poll"><InfoIcon /><span>INFO</span></button>
      {infoOpen && <InfoDialog onClose={closeInfo} />}
    </div>
  )
}

export default App
