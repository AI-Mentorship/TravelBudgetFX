import './LandingPage.css'

interface LandingPageProps {
  onGetStarted: () => void
}

function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="landing-page">
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

