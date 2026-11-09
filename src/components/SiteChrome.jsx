import { useEffect, useRef } from 'react'
import { APP_CONFIG } from '../config/appConfig.js'
import { ArrowIcon, InfoIcon } from './Icons.jsx'

export function Brand() {
  const [firstWord, ...otherWords] = APP_CONFIG.websiteName.split(' ')

  return (
    <a className="brand" href="#/" aria-label={`${APP_CONFIG.websiteName} home`}>
      <span className="brand__mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none">
          <path d="M5 20h4l3.1-8.1L18 29l4.2-17 3.6 11H35" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="brand__word">{firstWord} <span>{otherWords.join(' ')}</span></span>
    </a>
  )
}

export function Header() {
  return (
    <header className="site-header">
      <Brand />
      <div className="header-tools">
        <a className="header-results" href="#/results">Results</a>
        <div className="header-note"><span className="header-note__dot" /> Independent public opinion</div>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} {APP_CONFIG.websiteName}</span>
      <span className="footer-links">
        <a href="#/results">Results</a>
        <a href="#/terms">Terms &amp; Conditions</a>
        <a href="#/privacy">Privacy Policy</a>
      </span>
    </footer>
  )
}

export function InfoDialog({ onClose }) {
  const dialogRef = useRef(null)
  const closeButtonRef = useRef(null)

  useEffect(() => {
    closeButtonRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusableElements = dialogRef.current.querySelectorAll('button:not([disabled]), a[href]')
      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <section ref={dialogRef} className="info-dialog" role="dialog" aria-modal="true" aria-labelledby="info-title" onClick={(event) => event.stopPropagation()}>
        <button ref={closeButtonRef} className="dialog-close" type="button" aria-label="Close information" onClick={onClose}>×</button>
        <span className="dialog-icon"><InfoIcon /></span>
        <p className="eyebrow eyebrow--muted">A NOTE ABOUT THIS POLL</p>
        <h2 id="info-title">Independent by design.</h2>
        <p>{APP_CONFIG.websiteName} is an independent public opinion platform. This poll is not an official election and its results are not a scientifically representative national survey.</p>
        <p>Participation is voluntary. Only responses confirmed after payment verification appear in results. Review the eligibility rules and privacy notice before participating.</p>
        <a href="#/privacy" onClick={onClose}>Read the Privacy Policy <ArrowIcon /></a>
      </section>
    </div>
  )
}
