import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { InfoIcon } from './components/Icons.jsx'
import { Header, InfoDialog } from './components/SiteChrome.jsx'
import { APP_CONFIG } from './config/appConfig.js'
import LandingPage from './pages/LandingPage.jsx'
import PaymentReviewPage from './pages/PaymentReviewPage.jsx'
import PaymentStatusPage from './pages/PaymentStatusPage.jsx'
import PhonePage from './pages/PhonePage.jsx'
import PolicyPage from './pages/PolicyPage.jsx'
import ResultsPage from './pages/ResultsPage.jsx'
import VotePage from './pages/VotePage.jsx'
import VoteSubmissionPage from './pages/VoteSubmissionPage.jsx'
import VoteSuccessPage from './pages/VoteSuccessPage.jsx'
import { startMpesaPayment, checkPaymentStatus, checkVoteStatus, submitVote } from './services/paymentService.js'
import { isValidPaymentReference, readPaymentRedirect } from './utils/paymentRedirect.js'

const PENDING_CHOICE_KEY = 'sautiyaground.pending-choice'
const VOTE_CONFIRMATION_KEY = 'sautiyaground.vote-confirmation'

function readSessionValue(key) {
  try {
    return window.sessionStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

function readPendingChoice() {
  const choice = readSessionValue(PENDING_CHOICE_KEY)
  return APP_CONFIG.pollOptions.includes(choice) ? choice : ''
}

function useHashRoute() {
  const getRoute = () => {
    const hashRoute = window.location.hash.slice(1).split('?')[0]
    if (hashRoute) return hashRoute
    return /(^|\/)payment-return\/?$/.test(window.location.pathname) ? '/payment-return' : '/'
  }
  const [route, setRoute] = useState(getRoute)

  useEffect(() => {
    const syncRoute = () => setRoute(getRoute())
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  return [route, setRoute]
}

function App() {
  const [route, setRoute] = useHashRoute()
  const [infoOpen, setInfoOpen] = useState(false)
  const [choice, setChoice] = useState(readPendingChoice)
  const [phone, setPhone] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [votingCredential, setVotingCredential] = useState('')
  const [checkoutNotice, setCheckoutNotice] = useState('')
  const [redirectReference, setRedirectReference] = useState('')
  const [redirectError, setRedirectError] = useState('')
  const [voteConfirmationReference, setVoteConfirmationReference] = useState(() => {
    const receipt = readSessionValue(VOTE_CONFIRMATION_KEY)
    return isValidPaymentReference(receipt) ? receipt : ''
  })
  const infoButtonRef = useRef(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = `${APP_CONFIG.websiteName} — Your Voice. Your Opinion.`
  }, [route])

  useEffect(() => {
    const redirect = readPaymentRedirect()
    if (!redirect.hasReference) return
    const capture = window.setTimeout(() => {
      setRedirectReference(redirect.reference)
      setRedirectError(redirect.valid ? '' : 'The payment reference is missing or invalid. This redirect does not confirm payment.')
      window.history.replaceState(window.history.state, '', `${window.location.pathname}#/payment-return`)
      setRoute('/payment-return')
    }, 0)
    return () => window.clearTimeout(capture)
  }, [setRoute])

  const startVoting = () => {
    try {
      window.sessionStorage.removeItem(PENDING_CHOICE_KEY)
      window.sessionStorage.removeItem(VOTE_CONFIRMATION_KEY)
    } catch {
      // Session storage is optional; the current flow remains in memory.
    }
    setChoice('')
    setPhone('')
    setPaymentReference('')
    setVotingCredential('')
    setCheckoutNotice('')
    setVoteConfirmationReference('')
    window.location.hash = '#/vote'
  }

  const continueWithPhone = (phone) => {
    setPhone(phone)
    window.location.hash = '#/review'
  }

  const beginPayment = async () => {
    if (!APP_CONFIG.pollOptions.includes(choice)) {
      throw new Error('Choose a valid poll option before starting payment.')
    }
    try {
      window.sessionStorage.setItem(PENDING_CHOICE_KEY, choice)
    } catch {
      const error = new Error('This browser cannot safely retain the anonymous poll selection during payment.')
      error.code = 'SESSION_UNAVAILABLE'
      throw error
    }

    let result
    try {
      result = await startMpesaPayment({
        pollId: APP_CONFIG.pollId,
        phoneNumber: phone,
        amount: APP_CONFIG.participationFee,
      })
      if (!result || !isValidPaymentReference(result.paymentReference)) {
        throw new Error('The payment service did not return a valid payment reference.')
      }
    } catch (error) {
      try { window.sessionStorage.removeItem(PENDING_CHOICE_KEY) } catch { /* Ignore unavailable storage. */ }
      throw error
    }

    let checkoutUrl = ''
    let checkoutNotice = ''
    if (result.checkoutUrl) {
      try {
        const checkout = new URL(result.checkoutUrl)
        if (checkout.protocol === 'https:') checkoutUrl = checkout.toString()
        else checkoutNotice = 'The payment was started, but the checkout link was not secure. Check payment status before trying again.'
      } catch {
        checkoutNotice = 'The payment was started, but the checkout link could not be opened. Check payment status before trying again.'
      }
    }

    setPhone('')
    setPaymentReference(result.paymentReference)
    setVotingCredential('')
    setCheckoutNotice(checkoutNotice)

    if (checkoutUrl) {
      window.location.assign(checkoutUrl)
      return
    }
    window.location.hash = '#/payment-status'
  }

  const continueToVoting = (votingCredential) => {
    setPaymentReference('')
    setPhone('')
    setVotingCredential(votingCredential)
    setCheckoutNotice('')
    window.location.hash = '#/cast-vote'
  }

  const retryPayment = () => {
    setPaymentReference('')
    setPhone('')
    setVotingCredential('')
    setCheckoutNotice('')
    window.location.hash = '#/phone'
  }

  const castVote = () => submitVote({
    pollId: APP_CONFIG.pollId,
    choice,
    votingCredential,
  })

  const finishVote = (confirmationReference) => {
    try {
      window.sessionStorage.setItem(VOTE_CONFIRMATION_KEY, confirmationReference)
      window.sessionStorage.removeItem(PENDING_CHOICE_KEY)
    } catch {
      // The current page can still verify this receipt in memory.
    }
    setVoteConfirmationReference(confirmationReference)
    setChoice('')
    setPhone('')
    setPaymentReference('')
    setVotingCredential('')
    setCheckoutNotice('')
    window.location.hash = '#/vote-success'
  }

  const closeInfo = useCallback(() => {
    setInfoOpen(false)
    infoButtonRef.current?.focus()
  }, [])

  let page
  switch (route) {
    case '/vote':
      page = <VotePage selection={choice} setSelection={setChoice} />
      break
    case '/phone':
      page = <PhonePage choice={choice} phone={phone} onContinue={continueWithPhone} />
      break
    case '/review':
      page = <PaymentReviewPage choice={choice} phone={phone} onStartPayment={beginPayment} />
      break
    case '/payment-status':
    case '/payment-return':
      page = <PaymentStatusPage
        key={route === '/payment-return' ? `return:${redirectReference}` : `status:${paymentReference || redirectReference}`}
        paymentReference={route === '/payment-return' ? redirectReference : (paymentReference || redirectReference)}
        initialError={route === '/payment-return' ? redirectError : ''}
        initialNotice={checkoutNotice}
        checkPaymentStatus={checkPaymentStatus}
        onVerified={continueToVoting}
        onRetryPayment={retryPayment}
      />
      break
    case '/cast-vote':
      page = <VoteSubmissionPage choice={choice} votingCredential={votingCredential} onSubmitVote={castVote} onRecorded={finishVote} />
      break
    case '/vote-success':
      page = <VoteSuccessPage confirmationReference={voteConfirmationReference} checkVoteStatus={checkVoteStatus} />
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
