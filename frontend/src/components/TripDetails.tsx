import { useState } from 'react'
import './TripDetails.css'

interface TripDetailsProps {
  onContinue: () => void
  onBack: () => void
}

function TripDetails({ onContinue, onBack }: TripDetailsProps) {
  const [homeCurrency, setHomeCurrency] = useState('')
  const [budget, setBudget] = useState('')
  const [country, setCountry] = useState('')
  const [duration, setDuration] = useState('')
  const [travelDate, setTravelDate] = useState('')

  const handleContinue = () => {
    // Validate that all fields are filled
    if (homeCurrency && budget && country && duration && travelDate) {
      // You can pass the data to the parent component or store it
      onContinue()
    } else {
      alert('Please fill in all fields before continuing.')
    }
  }

  const handleCalculateBudget = () => {
    // Handle budget calculation
    console.log('Calculate budget:', { homeCurrency, budget, country, duration, travelDate })
  }

  return (
    <div className="trip-details-page">
      <header className="trip-details-header">
        <h1 className="trip-details-logo" onClick={onBack}>TravelBudgetFX</h1>
        <button className="back-button" onClick={onBack} aria-label="Back to landing page">
          ← Back
        </button>
      </header>
      
      <div className="trip-details-content">
        <h2 className="trip-details-title">Plan Your Trip Here</h2>
        
        <div className="trip-details-panel">
          <h3 className="panel-title">Trip Details</h3>
          
          <div className="form-group">
            <label className="form-label">Home Currency</label>
            <div className="select-wrapper">
              <select 
                className="form-input"
                value={homeCurrency}
                onChange={(e) => setHomeCurrency(e.target.value)}
              >
                <option value="">Select currency</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
                <option value="INR">INR</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
                <option value="CHF">CHF</option>
                <option value="CNY">CNY</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Budget</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter your budget"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Country Visiting</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Japan, France, Thailand"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Travel Date</label>
            <input
              type="date"
              className="form-input"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Duration (days)</label>
            <input
              type="text"
              className="form-input"
              placeholder="How many days?"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          
          <button className="calculate-button" onClick={handleCalculateBudget}>
            Calculate Budget
          </button>
          
          <button className="continue-button" onClick={handleContinue}>
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

export default TripDetails








