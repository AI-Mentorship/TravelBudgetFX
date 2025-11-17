import './LandingPage.css'
import Aurora from './Aurora'

interface LandingPageProps {
  onGetStarted: () => void
}

function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="landing-page">
      <Aurora
        colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
        blend={0.5}
        amplitude={1.0}
        speed={0.5}
      />
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

