import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { InfoIcon } from './components/Icons.jsx'
import { Header, InfoDialog } from './components/SiteChrome.jsx'
import { APP_CONFIG } from './config/appConfig.js'
import LandingPage from './pages/LandingPage.jsx'
import PaymentReviewPage from './pages/PaymentReviewPage.jsx'
import PaymentSuccessPage from './pages/PaymentSuccessPage.jsx'
import PhonePage from './pages/PhonePage.jsx'
import PolicyPage from './pages/PolicyPage.jsx'
import ResultsPage from './pages/ResultsPage.jsx'
import VotePage from './pages/VotePage.jsx'
import { fetchPublicPollInfo } from './services/pollService.js'

function useHashRoute() {
  const getRoute = () => {
    if (window.location.pathname.replace(/\/$/, '') === '/success') return '/success'
    return window.location.hash.slice(1).split('?')[0] || '/'
  }
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
  const [flow, setFlow] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sauti:flow') || '{"choice":"","phone":""}') }
    catch { return { choice: '', phone: '' } }
  })
  const [activePoll, setActivePoll] = useState(null)
  const infoButtonRef = useRef(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = `${APP_CONFIG.websiteName} — Your Voice. Your Opinion.`
  }, [route])

  useEffect(() => {
    fetchPublicPollInfo().then(setActivePoll).catch((error) => console.error('Unable to load active poll:', error.message))
  }, [])

  const startVoting = () => {
    setFlow({ choice: '', phone: '' })
    sessionStorage.removeItem('sauti:flow')
    window.location.hash = '#/vote'
  }

  const continueWithPhone = (phone) => {
    setFlow((currentFlow) => {
      const nextFlow = { ...currentFlow, phone }
      sessionStorage.setItem('sauti:flow', JSON.stringify(nextFlow))
      return nextFlow
    })
    window.location.hash = '#/review'
  }

  const closeInfo = useCallback(() => {
    setInfoOpen(false)
    infoButtonRef.current?.focus()
  }, [])

  let page
  switch (route) {
    case '/vote':
      page = <VotePage poll={activePoll} selection={flow.choice} setSelection={(choice) => setFlow((currentFlow) => ({ ...currentFlow, choice }))} />
      break
    case '/phone':
      page = <PhonePage choice={flow.choice} phone={flow.phone} onContinue={continueWithPhone} />
      break
    case '/review':
      page = <PaymentReviewPage choice={flow.choice} phone={flow.phone} />
      break
    case '/success':
      page = <PaymentSuccessPage />
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
