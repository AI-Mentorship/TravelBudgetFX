import { useState } from 'react'
import LandingPage from './components/LandingPage'
import TripDetails from './components/TripDetails'
import AIAssistant from './components/AIAssistant'

type Page = 'landing' | 'tripDetails' | 'aiAssistant'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing')

  const handleGetStarted = () => {
    setCurrentPage('tripDetails')
  }

  const handleBackToLanding = () => {
    setCurrentPage('landing')
  }

  const handleBackToTripDetails = () => {
    setCurrentPage('tripDetails')
  }

  const handleContinueToAI = () => {
    setCurrentPage('aiAssistant')
  }

  switch (currentPage) {
    case 'tripDetails':
      return (
        <TripDetails
          onContinue={handleContinueToAI}
          onBack={handleBackToLanding}
        />
      )
    case 'aiAssistant':
      return (
        <AIAssistant
          onBack={handleBackToTripDetails}
        />
      )
    default:
      return <LandingPage onGetStarted={handleGetStarted} />
  }
}

export default App
