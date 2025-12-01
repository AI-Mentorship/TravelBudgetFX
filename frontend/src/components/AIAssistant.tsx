import { useState, useEffect, useRef } from 'react'
import './AIAssistant.css'
import { sendChatMessage, type ChatMessage as ChatMessageType } from '../services/api'
import type { TripData } from '../types'
import jsPDF from 'jspdf'
import FXForecast from './FXForecast'
import Silk from './Silk'

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
        text: `Great! I see you're planning a trip to ${tripData.country} for ${tripData.duration} days with a budget of ${tripData.budget} ${tripData.homeCurrency}, departing on ${tripData.travelDate}.\n\nLet me ask you a few questions to create the perfect itinerary for you:\n\n1. What type of traveler are you? (Adventure seeker, Cultural explorer, Relaxation focused, Foodie, etc.)`,
        sender: 'ai'
      }
      setMessages([initialMessage])
      setQuestionsAsked(1)

      // Generate travel rating based on trip data
      generateTravelRating(tripData)
    }
  }, [tripData])

  const generateTravelRating = (data: TripData) => {
    const budgetPerDay = parseFloat(data.budget) / parseInt(data.duration)
    const duration = parseInt(data.duration)
    
    // Calculate affordability (1-10 scale based on budget per day)
    // Lower budget/day = higher affordability score
    const affordability = budgetPerDay < 50 ? 9.0 :
                         budgetPerDay < 100 ? 7.5 :
                         budgetPerDay < 200 ? 6.0 :
                         budgetPerDay < 400 ? 4.5 : 3.0
    
    // Calculate seasonality based on current month
    const currentMonth = new Date().getMonth() + 1 // 1-12
    const country = data.country.toLowerCase()
    
    // Peak travel months vary by destination
    let seasonality = 7.0 // Default
    if (country.includes('europe') || country.includes('france') || country.includes('italy') || country.includes('spain')) {
      // Europe peak: May-Sept
      seasonality = (currentMonth >= 5 && currentMonth <= 9) ? 9.0 : 6.0
    } else if (country.includes('japan') || country.includes('korea')) {
      // Asia peak: March-May, Sept-Nov
      seasonality = ((currentMonth >= 3 && currentMonth <= 5) || (currentMonth >= 9 && currentMonth <= 11)) ? 9.0 : 6.5
    } else if (country.includes('australia') || country.includes('new zealand')) {
      // Southern hemisphere: Dec-Feb
      seasonality = (currentMonth >= 12 || currentMonth <= 2) ? 9.0 : 6.5
    } else if (country.includes('thailand') || country.includes('vietnam') || country.includes('bali')) {
      // Southeast Asia: Nov-Feb
      seasonality = (currentMonth >= 11 || currentMonth <= 2) ? 9.0 : 5.5
    }
    
    // Calculate accessibility based on duration and popular destinations
    let accessibility = 7.0
    if (duration <= 5) {
      accessibility = 9.0 // Easy short trip
    } else if (duration <= 14) {
      accessibility = 8.0 // Moderate
    } else {
      accessibility = 6.5 // Requires more planning
    }
    
    // Boost for popular tourist destinations
    if (country.includes('paris') || country.includes('london') || country.includes('tokyo') || 
        country.includes('new york') || country.includes('dubai')) {
      accessibility += 1.0
    }
    
    accessibility = Math.min(10, accessibility)
    
    // Calculate overall rating (weighted average)
    const overall = ((affordability * 0.3) + (seasonality * 0.3) + (accessibility * 0.4))
    
    const rating: TravelRating = {
      overall: Math.round(overall * 10) / 10, // Round to 1 decimal
      affordability: Math.round(affordability * 10) / 10,
      seasonality: Math.round(seasonality * 10) / 10,
      accessibility: Math.round(accessibility * 10) / 10
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
          systemContext += ` IMPORTANT: The user has answered all questions. You MUST now generate a complete, detailed day-by-day itinerary. 

Format it EXACTLY like this (use **bold** for headers):

**Day 1: Arrival & Exploration**
- Morning: [activity with specific location]
- Afternoon: [activity with specific location]  
- Evening: [activity with specific location]
- Estimated cost: [amount in local currency]

**Day 2: [Theme for the day]**
- Morning: [activity with specific location]
- Afternoon: [activity with specific location]
- Evening: [activity with specific location]
- Estimated cost: [amount in local currency]

Continue for all ${tripData?.duration || 'scheduled'} days. At the end, add:

**Travel Tips:**
- [Tip 1]
- [Tip 2]
- [Tip 3]

**Budget Summary:**
- Total estimated cost: [amount]
- Recommended exchange: [advice]`
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

        // Clean up response and convert markdown to HTML for display
        const cleanedResponse = response.response
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') // Convert **text** to <strong>
          .replace(/\*([^*]+)\*/g, '<em>$1</em>') // Convert *text* to <em>
          .replace(/^- /gm, '• ') // Convert markdown bullets to bullet points
          .replace(/^(\d+)\. /gm, '<strong>$1.</strong> ') // Bold numbered items
          .trim()

        // Add AI response to UI with typewriter effect
        const aiMessageObj: Message = {
          id: updatedMessages.length + 1,
          text: '',
          sender: 'ai',
          isItinerary: isItineraryResponse
        }
        setMessages(prev => [...prev, aiMessageObj])

        // Typewriter effect
        let charIndex = 0
        const typewriterSpeed = 15 // ms per character
        const typewriterInterval = setInterval(() => {
          if (charIndex < cleanedResponse.length) {
            setMessages(prev => {
              const updated = [...prev]
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                text: cleanedResponse.substring(0, charIndex + 1)
              }
              return updated
            })
            charIndex++
          } else {
            clearInterval(typewriterInterval)
            
            // Ask about PDF AFTER typewriter finishes for itinerary
            if (isItineraryResponse) {
              setTimeout(() => {
                setMessages(prev => [...prev, {
                  id: prev.length + 1,
                  text: "Would you like me to export this itinerary as a PDF document? 📄",
                  sender: 'ai',
                  isPdfQuestion: true
                }])
              }, 500) // Small delay after typewriter finishes
            }
          }
        }, typewriterSpeed)

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
    // Find the itinerary message - prioritize the longest one to avoid picking up short error/refusal messages
    const itineraryMessages = messages.filter(msg => msg.isItinerary)
    if (itineraryMessages.length === 0 || !tripData) return

    const itineraryMessage = itineraryMessages.reduce((prev, current) =>
      (prev.text.length > current.text.length) ? prev : current
    )

    // Create PDF
    const doc = new jsPDF()

    // Title
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(82, 39, 255) // #5227FF brand color
    doc.text('Travel Itinerary', 105, 25, { align: 'center' })

    // Subtitle line
    doc.setDrawColor(82, 39, 255)
    doc.setLineWidth(0.5)
    doc.line(30, 32, 180, 32)

    // Trip Details Section
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    let yPos = 45

    doc.text('Trip Details', 20, yPos)
    yPos += 10
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Destination: ${tripData.country}`, 25, yPos)
    yPos += 7
    doc.text(`Duration: ${tripData.duration} days`, 25, yPos)
    yPos += 7
    doc.text(`Budget: ${tripData.budget} ${tripData.homeCurrency}`, 25, yPos)
    yPos += 7
    doc.text(`Travel Date: ${tripData.travelDate}`, 25, yPos)
    yPos += 15

    // Itinerary content section
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(82, 39, 255)
    doc.text('Your Personalized Itinerary', 20, yPos)
    yPos += 12

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)

    // Clean the itinerary text for PDF (remove HTML tags, keep structure)
    const pdfText = itineraryMessage.text
      .replace(/<strong>/g, '')
      .replace(/<\/strong>/g, '')
      .replace(/<em>/g, '')
      .replace(/<\/em>/g, '')
      .replace(/<br\s*\/?>/g, '\n')

    // Split into lines and format properly
    const lines = pdfText.split('\n')
    const maxWidth = 165

    lines.forEach((line: string) => {
      if (yPos > 275) { // Add new page if needed
        doc.addPage()
        yPos = 25
      }

      const trimmedLine = line.trim()
      
      // Check if this is a day header (e.g., "Day 1:", "Day 2 - Adventure:")
      if (/^Day\s+\d+/i.test(trimmedLine)) {
        yPos += 5 // Extra spacing before day headers
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.setTextColor(82, 39, 255)
        doc.text(trimmedLine, 20, yPos)
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        yPos += 8
      } else if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
        // Bullet point
        const bulletText = trimmedLine.replace(/^[•-]\s*/, '')
        const wrappedLines = doc.splitTextToSize(bulletText, maxWidth - 10)
        wrappedLines.forEach((wrappedLine: string, idx: number) => {
          if (yPos > 275) {
            doc.addPage()
            yPos = 25
          }
          if (idx === 0) {
            doc.text('•', 25, yPos)
            doc.text(wrappedLine, 32, yPos)
          } else {
            doc.text(wrappedLine, 32, yPos)
          }
          yPos += 6
        })
      } else if (trimmedLine.length > 0) {
        // Regular text
        const wrappedLines = doc.splitTextToSize(trimmedLine, maxWidth)
        wrappedLines.forEach((wrappedLine: string) => {
          if (yPos > 275) {
            doc.addPage()
            yPos = 25
          }
          doc.text(wrappedLine, 20, yPos)
          yPos += 6
        })
      } else {
        // Empty line - add small spacing
        yPos += 3
      }
    })

    // Footer on last page
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(128, 128, 128)
      doc.text('Generated by TravelBudgetFX', 105, 290, { align: 'center' })
      doc.text(`Page ${i} of ${pageCount}`, 190, 290, { align: 'right' })
    }

    // Save the PDF
    doc.save(`${tripData.country}-itinerary.pdf`)
  }

  return (
    <div className="ai-assistant-page">
      <div className="silk-background-chat">
        <Silk
          speed={3}
          scale={1.2}
          color="#5227FF"
          noiseIntensity={1.8}
          rotation={0}
        />
      </div>
      <div className="floating-particles">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${15 + Math.random() * 10}s`
          }} />
        ))}
      </div>
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
                <div><strong>Departure:</strong> {tripData.travelDate}</div>
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
                  {message.sender === 'ai' ? (
                    <span dangerouslySetInnerHTML={{ __html: message.text.replace(/\n/g, '<br />') }} />
                  ) : (
                    message.text
                  )}
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

