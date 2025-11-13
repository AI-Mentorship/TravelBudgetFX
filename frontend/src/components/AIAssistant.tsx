import { useState } from 'react'
import './AIAssistant.css'
import { sendChatMessage, type ChatMessage as ChatMessageType } from '../services/api'

interface AIAssistantProps {
  onBack: () => void
}

interface Message {
  id: number
  text: string
  sender: 'user' | 'ai'
}

function AIAssistant({ onBack }: AIAssistantProps) {
  const [chatMessage, setChatMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hi! I'm your AI travel assistant. Tell me about your travel preferences - what kind of activities do you enjoy? What's your travel style? Any specific interests or requirements?",
      sender: 'ai'
    }
  ])
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async () => {
    if (chatMessage.trim() && !isLoading) {
      const userMessage = chatMessage.trim()
      
      // Add user message to UI immediately
      const userMessageObj: Message = {
        id: messages.length + 1,
        text: userMessage,
        sender: 'user'
      }
      setMessages(prev => [...prev, userMessageObj])
      setChatMessage('')
      setIsLoading(true)

      try {
        // Convert messages to API format (excluding the last user message we just added)
        const chatHistory: ChatMessageType[] = messages.map(msg => ({
          content: msg.text,
          role: msg.sender === 'user' ? 'user' : 'assistant'
        }))

        // Send to backend
        const response = await sendChatMessage({
          message: userMessage,
          chat_history: chatHistory
        })

        // Add AI response to UI
        const aiMessageObj: Message = {
          id: messages.length + 2,
          text: response.response,
          sender: 'ai'
        }
        setMessages(prev => [...prev, aiMessageObj])
      } catch (error) {
        console.error('Error sending message:', error)
        // Add error message
        const errorMessageObj: Message = {
          id: messages.length + 2,
          text: 'Sorry, I encountered an error. Please try again.',
          sender: 'ai'
        }
        setMessages(prev => [...prev, errorMessageObj])
      } finally {
        setIsLoading(false)
      }
    }
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
        <h2 className="ai-assistant-title">AI Travel Assistant</h2>
        
        <div className="ai-assistant-panel">
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
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
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
    </div>
  )
}

export default AIAssistant

