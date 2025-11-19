import { useState, useEffect, useRef } from 'react'
import './AIAssistant.css'
import { sendChatMessage, type ChatMessage as ChatMessageType } from '../services/api'
import type { TripData } from '../types'
import jsPDF from 'jspdf'

interface AIAssistantProps {
  onBack: () => void
  tripData: TripData | null
}

interface Message {
  id: number
  text: string
  sender: 'user' | 'ai'
  isItinerary?: boolean
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

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (chatMessage.trim() && !isLoading) {
      const userMessage = chatMessage.trim()
      
      // Check if user is asking for itinerary
      const isItineraryRequest = /generate|create|make|build|itinerary|plan|schedule/i.test(userMessage)
      
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
        if (isItineraryRequest && questionsAsked >= maxQuestions) {
          systemContext += ' USER REQUESTED ITINERARY. Generate a detailed day-by-day itinerary with activities, estimated costs, and recommendations.'
        } else if (isItineraryRequest && questionsAsked < maxQuestions) {
          systemContext += ' USER REQUESTED ITINERARY TOO EARLY. Politely suggest answering a few more questions first.'
        } else if (questionsAsked < maxQuestions) {
          systemContext += ` Ask question ${questionsAsked + 1} of ${maxQuestions} about their preferences (dietary restrictions, must-see attractions, activity level, accommodation preferences, etc.).`
        }

        // Send to backend with context
        const response = await sendChatMessage({
          message: systemContext + '\n\nUSER MESSAGE: ' + userMessage,
          chat_history: chatHistory
        })

        // Determine if this is an itinerary response
        const isItineraryResponse = isItineraryRequest && questionsAsked >= maxQuestions

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
    // Find the itinerary message
    const itineraryMessage = messages.find(msg => msg.isItinerary)
    if (!itineraryMessage || !tripData) return

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
                  <div className="rating-fill" style={{width: `${travelRating.overall * 10}%`}}></div>
                </div>
              </div>
              
              <div className="rating-item">
                <span className="rating-label">Affordability</span>
                <span className="rating-value">{travelRating.affordability.toFixed(1)}/10</span>
                <div className="rating-bar">
                  <div className="rating-fill" style={{width: `${travelRating.affordability * 10}%`}}></div>
                </div>
              </div>
              
              <div className="rating-item">
                <span className="rating-label">Best Season</span>
                <span className="rating-value">{travelRating.seasonality}/10</span>
                <div className="rating-bar">
                  <div className="rating-fill" style={{width: `${travelRating.seasonality * 10}%`}}></div>
                </div>
              </div>
              
              <div className="rating-item">
                <span className="rating-label">Accessibility</span>
                <span className="rating-value">{travelRating.accessibility}/10</span>
                <div className="rating-bar">
                  <div className="rating-fill" style={{width: `${travelRating.accessibility * 10}%`}}></div>
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
    </div>
  )
}

export default AIAssistant

