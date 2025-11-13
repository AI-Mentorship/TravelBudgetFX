import './LandingPage.css'

interface LandingPageProps {
  onGetStarted: () => void
}

function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="landing-page">
      <div className="landing-content">
        <p className="landing-subtitle">An AI Powered Trip Planner</p>
        <h1 className="landing-title">TravelBudget<span className="title-thin">FX</span></h1>
        <button className="get-started-button" onClick={onGetStarted}>
          Get Started
        </button>
      </div>
    </div>
  )
}

export default LandingPage

