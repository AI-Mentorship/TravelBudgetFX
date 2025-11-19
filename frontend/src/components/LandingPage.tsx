import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import './LandingPage.css'
import Aurora from './Aurora'

interface LandingPageProps {
  onGetStarted: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Aurora Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <div className="aurora-fallback" />
    }
    return this.props.children
  }
}

function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="landing-page">
      <ErrorBoundary>
        <Aurora
          colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
          blend={0.5}
          amplitude={1.0}
          speed={0.5}
        />
      </ErrorBoundary>
      <div className="landing-content">
        <p className="landing-subtitle">Vacation + Being Lazy.</p>
        <h1 className="landing-title">Vacazy<span className="title-thin">FX</span></h1>
        <button className="get-started-button" onClick={onGetStarted}>
          Get Started
        </button>
      </div>
    </div>
  )
}

export default LandingPage

