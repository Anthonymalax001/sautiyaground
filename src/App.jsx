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
import { startPaystackPayment } from './services/paymentService.js'
import { fetchPublicPollInfo } from './services/pollService.js'
import { KENYAN_MOBILE_PATTERN } from './utils/phoneNumber.js'

const PAYMENT_SESSION_KEY = 'sauti:payment'

function routeFromLocation() {
  const pathname = window.location.pathname.replace(/\/$/, '') || '/'
  if (pathname === '/success') return '/success'
  if (pathname === '/payment-return') return '/payment-return'
  return window.location.hash.slice(1).split('?')[0] || '/'
}

function useHashRoute() {
  const [route, setRoute] = useState(routeFromLocation)

  useEffect(() => {
    const syncRoute = () => setRoute(routeFromLocation())
    window.addEventListener('hashchange', syncRoute)
    window.addEventListener('popstate', syncRoute)
    return () => {
      window.removeEventListener('hashchange', syncRoute)
      window.removeEventListener('popstate', syncRoute)
    }
  }, [])

  return route
}

function App() {
  const route = useHashRoute()
  const [infoOpen, setInfoOpen] = useState(false)
  const [choice, setChoice] = useState('')
  const [phone, setPhone] = useState('')
  const [activePoll, setActivePoll] = useState(null)
  const infoButtonRef = useRef(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = `${APP_CONFIG.websiteName} — Your Voice. Your Opinion.`
  }, [route])

  useEffect(() => {
    fetchPublicPollInfo().then(setActivePoll).catch(() => setActivePoll(null))
  }, [])

  const startVoting = () => {
    setChoice('')
    setPhone('')
    try { window.sessionStorage.removeItem(PAYMENT_SESSION_KEY) } catch { /* Session storage is optional. */ }
    window.location.hash = '#/vote'
  }

  const continueWithPhone = (normalizedPhone) => {
    setPhone(normalizedPhone)
    window.location.hash = '#/review'
  }

  const beginPayment = async () => {
    if (!APP_CONFIG.pollOptions.includes(choice)) throw new Error('Choose WANTAM or TUTAM before continuing.')
    if (!KENYAN_MOBILE_PATTERN.test(phone)) throw new Error('Enter a valid Kenyan mobile number before continuing.')

    const result = await startPaystackPayment({ phone, optionLabel: choice })
    if (!result
      || typeof result.paymentId !== 'string'
      || typeof result.statusToken !== 'string'
      || typeof result.reference !== 'string'
      || result.status !== 'pending'
      || typeof result.authorizationUrl !== 'string') {
      throw new Error('The payment service returned an incomplete checkout response.')
    }

    let checkoutUrl
    try {
      checkoutUrl = new URL(result.authorizationUrl)
    } catch {
      throw new Error('The payment service returned an invalid checkout address.')
    }
    if (checkoutUrl.protocol !== 'https:') throw new Error('The payment checkout address is not secure.')

    try {
      window.sessionStorage.setItem(PAYMENT_SESSION_KEY, JSON.stringify({
        paymentId: result.paymentId,
        statusToken: result.statusToken,
        reference: result.reference,
      }))
    } catch {
      const storageError = new Error('This browser could not retain the private payment status token. No checkout was opened.')
      storageError.code = 'SESSION_UNAVAILABLE'
      throw storageError
    }

    window.location.assign(checkoutUrl.toString())
  }

  const closeInfo = useCallback(() => {
    setInfoOpen(false)
    infoButtonRef.current?.focus()
  }, [])

  let page
  switch (route) {
    case '/vote':
      page = <VotePage poll={activePoll} selection={choice} setSelection={setChoice} />
      break
    case '/phone':
      page = <PhonePage choice={choice} phone={phone} onContinue={continueWithPhone} />
      break
    case '/review':
      page = <PaymentReviewPage choice={choice} phone={phone} onStartPayment={beginPayment} />
      break
    case '/success':
    case '/payment-return':
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
