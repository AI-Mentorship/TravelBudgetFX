import { useState } from 'react'
import './MainApp.css'

interface MainAppProps {
  onBackToLanding: () => void
}

function MainApp({ onBackToLanding }: MainAppProps) {
  const [homeCurrency, setHomeCurrency] = useState('')
  const [budget, setBudget] = useState('')
  const [country, setCountry] = useState('')
  const [duration, setDuration] = useState('')
  const [chatMessage, setChatMessage] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! I'm your AI travel assistant. Tell me about your travel preferences - what kind of activities do you enjoy? What's your travel style? Any specific interests or requirements?",
      sender: 'ai'
    }
  ])

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      setMessages([
        ...messages,
        { id: messages.length + 1, text: chatMessage, sender: 'user' }
      ])
      setChatMessage('')
    }
  }

  const handleCalculateBudget = () => {
    // Handle budget calculation
    console.log('Calculate budget:', { homeCurrency, budget, country, duration })
  }

  return (
    <div className="main-app">
      <header className="app-header">
        <h1 className="app-logo" onClick={onBackToLanding}>TravelBudgetFX</h1>
        <button className="back-button" onClick={onBackToLanding} aria-label="Back to landing page">
          ← Back
        </button>
      </header>
      
      <div className="app-content">
        <h2 className="app-title">Plan Your Trip Here</h2>
        
        <div className="panels-container">
          {/* Trip Details Panel */}
          <div className="panel trip-details-panel">
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
          </div>
          
          {/* AI Assistant Panel */}
          <div className="panel ai-assistant-panel">
            <h3 className="panel-title">AI Travel Assistant</h3>
            
            <div className="chat-area">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`chat-message ${message.sender === 'ai' ? 'ai-message' : 'user-message'}`}
                >
                  {message.text}
                </div>
              ))}
            </div>
            
            <div className="chat-input-container">
              <input
                type="text"
                className="chat-input"
                placeholder="Describe your travel preferences..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button className="send-button" onClick={handleSendMessage}>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MainApp

