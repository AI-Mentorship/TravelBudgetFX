import { useState, useEffect, useRef } from 'react'
import './AIAssistant.css'
import { sendChatMessage, type ChatMessage as ChatMessageType } from '../services/api'
import type { TripData } from '../types'
import jsPDF from 'jspdf'
import FXForecast from './FXForecast'

interface AIAssistantProps {
  onBack: () => void
  tripData: TripData | null
}

interface Message {
  id: number
  text: string
  sender: 'user' | 'ai'
  isItinerary?: boolean
  isPdfQuestion?: boolean
}

interface TravelRating {
  overall: number
  affordability: number
  seasonality: number
  accessibility: number
}

function AIAssistant({ onBack, tripData }: AIAssistantProps) {
  const [chatMessage, setChatMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [questionsAsked, setQuestionsAsked] = useState(0)
  const [itineraryGenerated, setItineraryGenerated] = useState(false)
  const [showForecast, setShowForecast] = useState(false)
  const [travelRating, setTravelRating] = useState<TravelRating | null>(null)
  const chatAreaRef = useRef<HTMLDivElement>(null)
  const maxQuestions = 5

  // Initialize with trip details and first question
  useEffect(() => {
    if (tripData && messages.length === 0) {
      const initialMessage: Message = {
        id: 1,
        text: `Great! I see you're planning a trip to ${tripData.country} for ${tripData.duration} days with a budget of ${tripData.budget} ${tripData.homeCurrency}, departing on ${new Date(tripData.travelDate).toLocaleDateString()}.\n\nLet me ask you a few questions to create the perfect itinerary for you:\n\n1. What type of traveler are you? (Adventure seeker, Cultural explorer, Relaxation focused, Foodie, etc.)`,
        sender: 'ai'
      }
      setMessages([initialMessage])
      setQuestionsAsked(1)

      // Generate travel rating based on trip data
      generateTravelRating(tripData)
    }
  }, [tripData])

  const generateTravelRating = (data: TripData) => {
    // Simulate rating calculation (in real app, this would come from backend)
    const budgetPerDay = parseFloat(data.budget) / parseInt(data.duration)
    const affordability = Math.min(10, Math.max(1, budgetPerDay / 100))

    const rating: TravelRating = {
      overall: 8.5,
      affordability: affordability,
      seasonality: 8.0,
      accessibility: 9.0
    }
    setTravelRating(rating)
  }

  const getCurrencyForCountry = (country: string): string => {
    const normalized = country.trim().toLowerCase()
    
    // Map country names to currencies
    if (normalized.includes('usa') || normalized.includes('united states') || normalized.includes('america')) return 'USD'
    if (normalized.includes('uk') || normalized.includes('united kingdom') || normalized.includes('britain') || normalized.includes('england')) return 'GBP'
    if (normalized.includes('japan')) return 'JPY'
    if (normalized.includes('china')) return 'CNY'
    if (normalized.includes('india')) return 'INR'
    if (normalized.includes('australia')) return 'AUD'
    if (normalized.includes('canada')) return 'CAD'
    if (normalized.includes('switzerland')) return 'CHF'
    if (normalized.includes('mexico')) return 'MXN'
    if (normalized.includes('brazil')) return 'BRL'
    if (normalized.includes('south africa')) return 'ZAR'
    if (normalized.includes('new zealand')) return 'NZD'
    if (normalized.includes('singapore')) return 'SGD'
    if (normalized.includes('hong kong')) return 'HKD'
    if (normalized.includes('south korea') || normalized.includes('korea')) return 'KRW'
    if (normalized.includes('thailand')) return 'THB'
    if (normalized.includes('malaysia')) return 'MYR'
    if (normalized.includes('indonesia')) return 'IDR'
    if (normalized.includes('philippines')) return 'PHP'
    if (normalized.includes('vietnam')) return 'VND'
    if (normalized.includes('turkey')) return 'TRY'
    if (normalized.includes('russia')) return 'RUB'
    if (normalized.includes('uae') || normalized.includes('dubai') || normalized.includes('emirates')) return 'AED'
    if (normalized.includes('saudi')) return 'SAR'
    if (normalized.includes('egypt')) return 'EGP'
    if (normalized.includes('israel')) return 'ILS'
    if (normalized.includes('norway')) return 'NOK'
    if (normalized.includes('sweden')) return 'SEK'
    if (normalized.includes('denmark')) return 'DKK'
    if (normalized.includes('iceland')) return 'ISK'
    if (normalized.includes('poland')) return 'PLN'
    if (normalized.includes('czech')) return 'CZK'
    if (normalized.includes('hungary')) return 'HUF'
    if (normalized.includes('romania')) return 'RON'
    
    // European countries (default to EUR for most of Europe)
    if (normalized.includes('france') || normalized.includes('germany') || normalized.includes('italy') || 
        normalized.includes('spain') || normalized.includes('portugal') || normalized.includes('netherlands') || 
        normalized.includes('belgium') || normalized.includes('austria') || normalized.includes('greece') || 
        normalized.includes('ireland') || normalized.includes('finland') || normalized.includes('europe')) return 'EUR'
    
    // Default to USD for unknown countries
    return 'USD'
  }

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (chatMessage.trim() && !isLoading) {
      const userMessage = chatMessage.trim()

      // Check if user is asking for itinerary (exclude PDF/export requests)
      const isPdfRequest = /pdf|export|download/i.test(userMessage)
      const isItineraryRequest = !isPdfRequest && /generate|create|make|build|itinerary|plan|schedule/i.test(userMessage)

      // Check if answering PDF question (from previous turn)
      const lastMessage = messages[messages.length - 1]
      const isPdfAnswer = lastMessage?.isPdfQuestion && /yes|sure|okay|ok|please|yea|yeah|yep|definitely|absolutely/i.test(userMessage)

      if (isPdfAnswer || (isPdfRequest && itineraryGenerated)) {
        // Add user message
        const updatedMessages = [...messages, { id: messages.length + 1, text: userMessage, sender: 'user' as const }]
        setMessages(updatedMessages)
        setChatMessage('')

        // Generate PDF
        handleExportPDF()

        // Add AI confirmation and show forecast
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: prev.length + 1,
            text: "Perfect! I've generated your PDF itinerary. Check your downloads folder. 📄\n\nNow, let me show you the currency forecast below so you know the best time to exchange your money! 💱",
            sender: 'ai'
          }])
          setShowForecast(true)
          // Scroll to show forecast after a moment
          setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
          }, 1000)
        }, 1000)
        return
      }

      // Add user message to UI immediately
      const userMessageObj: Message = {
        id: messages.length + 1,
        text: userMessage,
        sender: 'user'
      }
      const updatedMessages = [...messages, userMessageObj]
      setMessages(updatedMessages)
      setChatMessage('')
      setIsLoading(true)

      try {
        // Build context with trip details
        const contextMessage = tripData
          ? `TRIP CONTEXT: Destination: ${tripData.country}, Duration: ${tripData.duration} days, Budget: ${tripData.budget} ${tripData.homeCurrency}, Travel Date: ${tripData.travelDate}. Questions asked so far: ${questionsAsked}/${maxQuestions}.`
          : ''

        // Convert previous messages to API format
        const chatHistory: ChatMessageType[] = messages.map(msg => ({
          content: msg.text,
          role: msg.sender === 'user' ? 'user' : 'assistant'
        }))

        // Determine system message based on state
        let systemContext = contextMessage
        // Trigger generation if user explicitly asks OR if we've asked all questions
        const shouldGenerateItinerary = isItineraryRequest || questionsAsked >= maxQuestions

        if (shouldGenerateItinerary) {
          systemContext += ' IMPORTANT: The user has answered all questions. You MUST now generate a complete, detailed day-by-day itinerary. Format it as:\n\nDay 1:\n- Morning: [activity]\n- Afternoon: [activity]\n- Evening: [activity]\n- Estimated cost: [amount]\n\nDay 2: ... etc. Include all days based on the trip duration. Add travel tips and recommendations.'
        } else if (questionsAsked < maxQuestions) {
          systemContext += ` Ask question ${questionsAsked + 1} of ${maxQuestions} about their preferences (dietary restrictions, must-see attractions, activity level, accommodation preferences, etc.). Keep the question brief and conversational.`
        }

        // Send to backend with context
        const response = await sendChatMessage({
          message: systemContext + '\n\nUSER MESSAGE: ' + userMessage,
          chat_history: chatHistory
        })

        // Determine if this is an itinerary response
        const isItineraryResponse = shouldGenerateItinerary

        // Add AI response to UI
        const aiMessageObj: Message = {
          id: updatedMessages.length + 1,
          text: response.response,
          sender: 'ai',
          isItinerary: isItineraryResponse
        }
        setMessages(prev => [...prev, aiMessageObj])

        if (isItineraryResponse) {
          setItineraryGenerated(true)
          // Ask about PDF after a short delay
          setTimeout(() => {
            setMessages(prev => [...prev, {
              id: prev.length + 1,
              text: "Would you like me to export this itinerary as a PDF document?",
              sender: 'ai',
              isPdfQuestion: true
            }])
          }, 2000)
        } else if (questionsAsked < maxQuestions && !isItineraryRequest) {
          setQuestionsAsked(prev => prev + 1)
        }
      } catch (error) {
        console.error('Error sending message:', error)
        const errorMessageObj: Message = {
          id: updatedMessages.length + 1,
          text: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Please try again.'}`,
          sender: 'ai'
        }
        setMessages(prev => [...prev, errorMessageObj])
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleExportPDF = () => {
    // Find the itinerary message - prioritize the longest one to avoid picking up short error/refusal messages
    const itineraryMessages = messages.filter(msg => msg.isItinerary)
    if (itineraryMessages.length === 0 || !tripData) return

    const itineraryMessage = itineraryMessages.reduce((prev, current) =>
      (prev.text.length > current.text.length) ? prev : current
    )

    // Create PDF
    const doc = new jsPDF()

    // Title
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Travel Itinerary', 105, 20, { align: 'center' })

    // Trip Details
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    let yPos = 40

    doc.text('Trip Details:', 20, yPos)
    yPos += 8
    doc.setFontSize(10)
    doc.text(`Destination: ${tripData.country}`, 25, yPos)
    yPos += 6
    doc.text(`Duration: ${tripData.duration} days`, 25, yPos)
    yPos += 6
    doc.text(`Budget: ${tripData.budget} ${tripData.homeCurrency}`, 25, yPos)
    yPos += 6
    doc.text(`Travel Date: ${new Date(tripData.travelDate).toLocaleDateString()}`, 25, yPos)
    yPos += 12

    // Itinerary content
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Your Itinerary:', 20, yPos)
    yPos += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    // Split text into lines that fit the page
    const maxWidth = 170
    const lines = doc.splitTextToSize(itineraryMessage.text, maxWidth)

    lines.forEach((line: string) => {
      if (yPos > 280) { // Add new page if needed
        doc.addPage()
        yPos = 20
      }
      doc.text(line, 20, yPos)
      yPos += 6
    })

    // Footer
    if (yPos > 270) {
      doc.addPage()
      yPos = 20
    }
    yPos = 285
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text('Generated by TravelBudgetFX', 105, yPos, { align: 'center' })

    // Save the PDF
    doc.save(`${tripData.country}-itinerary.pdf`)
  }

  return (
    <div className="ai-assistant-page">
      <header className="ai-assistant-header">
        <h1 className="ai-assistant-logo" onClick={onBack}>TravelBudgetFX</h1>
        <button className="back-button" onClick={onBack} aria-label="Back to trip details">
          ← Back
        </button>
      </header>

      <div className="ai-assistant-content">
        <div className="main-chat-area">
          <h2 className="ai-assistant-title">AI Travel Assistant</h2>

          {tripData && (
            <div className="trip-summary">
              <h3>Your Trip Details</h3>
              <div className="trip-summary-grid">
                <div><strong>Destination:</strong> {tripData.country}</div>
                <div><strong>Duration:</strong> {tripData.duration} days</div>
                <div><strong>Budget:</strong> {tripData.budget} {tripData.homeCurrency}</div>
                <div><strong>Departure:</strong> {new Date(tripData.travelDate).toLocaleDateString()}</div>
              </div>
            </div>
          )}

          <div className="ai-assistant-panel">
            <div className="chat-area" ref={chatAreaRef}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`chat-message ${message.sender === 'ai' ? 'ai-message' : 'user-message'} ${message.isItinerary ? 'itinerary-message' : ''}`}
                >
                  {message.text}
                  {message.isItinerary && (
                    <button className="export-pdf-button" onClick={handleExportPDF}>
                      📄 Export as PDF
                    </button>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="chat-message ai-message">
                  <span className="typing-indicator">...</span>
                </div>
              )}
            </div>

            <div className="chat-progress">
              {!itineraryGenerated && (
                <div className="progress-text">
                  Questions: {questionsAsked}/{maxQuestions}
                  {questionsAsked >= maxQuestions && <span className="ready-indicator"> ✓ Ready for itinerary!</span>}
                </div>
              )}
            </div>

            <div className="chat-input-container">
              <input
                type="text"
                className="chat-input"
                placeholder={itineraryGenerated ? "Ask follow-up questions..." : questionsAsked >= maxQuestions ? "Ask me to generate your itinerary..." : "Answer the question..."}
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                disabled={isLoading}
              />
              <button
                className="send-button"
                onClick={handleSendMessage}
                disabled={isLoading}
              >
                {isLoading ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </div>

        {travelRating && (
          <div className="rating-sidebar">
            <h3>Travel Rating</h3>
            <div className="rating-card">
              <div className="rating-item overall">
                <span className="rating-label">Overall Score</span>
                <span className="rating-value">{travelRating.overall}/10</span>
                <div className="rating-bar">
                  <div className="rating-fill" style={{ width: `${travelRating.overall * 10}%` }}></div>
                </div>
              </div>

              <div className="rating-item">
                <span className="rating-label">Affordability</span>
                <span className="rating-value">{travelRating.affordability.toFixed(1)}/10</span>
                <div className="rating-bar">
                  <div className="rating-fill" style={{ width: `${travelRating.affordability * 10}%` }}></div>
                </div>
              </div>

              <div className="rating-item">
                <span className="rating-label">Best Season</span>
                <span className="rating-value">{travelRating.seasonality}/10</span>
                <div className="rating-bar">
                  <div className="rating-fill" style={{ width: `${travelRating.seasonality * 10}%` }}></div>
                </div>
              </div>

              <div className="rating-item">
                <span className="rating-label">Accessibility</span>
                <span className="rating-value">{travelRating.accessibility}/10</span>
                <div className="rating-bar">
                  <div className="rating-fill" style={{ width: `${travelRating.accessibility * 10}%` }}></div>
                </div>
              </div>
            </div>

            <div className="rating-info">
              <p className="rating-note">
                This rating is based on your budget, destination, and travel dates.
              </p>
            </div>
          </div>
        )}
      </div>

      {tripData && showForecast && (
        <FXForecast
          baseCurrency={getCurrencyForCountry(tripData.country)}
          targetCurrency={tripData.homeCurrency}
          visible={true}
        />
      )}
    </div>
  )
}

export default AIAssistant

