import { useState } from 'react'
import LandingPage from './components/LandingPage'
import TripDetails from './components/TripDetails'
import AIAssistant from './components/AIAssistant'
import type { TripData } from './types'

type Page = 'landing' | 'tripDetails' | 'aiAssistant'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing')
  const [tripData, setTripData] = useState<TripData | null>(null)

  const handleGetStarted = () => {
    setCurrentPage('tripDetails')
  }

  const handleBackToLanding = () => {
    setCurrentPage('landing')
  }

  const handleBackToTripDetails = () => {
    setCurrentPage('tripDetails')
  }

  const handleContinueToAI = (data: TripData) => {
    setTripData(data)
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
          tripData={tripData}
        />
      )
    default:
      return <LandingPage onGetStarted={handleGetStarted} />
  }
}

export default App
