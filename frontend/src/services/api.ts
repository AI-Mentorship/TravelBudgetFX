const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export interface ChatMessage {
  content: string
  role: 'user' | 'assistant'
}

export interface ChatRequest {
  message: string
  chat_history?: ChatMessage[]
}

export interface ChatResponse {
  response: string
  role: 'assistant'
}

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error sending chat message:', error)
    throw error
  }
}

export interface ForecastRequest {
  base_currency: string
  target_currency: string
  days?: number
}

export interface ForecastData {
  date: string
  rate: number
}

export async function getCurrencyForecast(request: ForecastRequest): Promise<ForecastData[]> {
  try {
    const params = new URLSearchParams({
      base_currency: request.base_currency,
      target_currency: request.target_currency,
      days: (request.days || 30).toString()
    })
    
    const response = await fetch(`${API_BASE_URL}/forecasts/currency?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching currency forecast:', error)
    throw error
  }
}

