from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Optional
import google.generativeai as genai
from app.core.config import settings
from pydantic import BaseModel
import os

class ChatMessage(BaseModel):
    content: str
    role: str = "user"  # "user" or "assistant"

class ChatRequest(BaseModel):
    message: str
    chat_history: Optional[List[ChatMessage]] = []

router = APIRouter()

# System instruction for the AI assistant
SYSTEM_INSTRUCTION = """You are a helpful AI travel assistant for TravelBudgetFX. 
You help users with:
- Travel budgeting advice
- Creating detailed day-by-day itineraries
- Currency exchange insights
- Cost-saving tips for different destinations
- Local price level information
- Best times to exchange money
- Travel planning and recommendations

When generating an itinerary:
1. Create a structured day-by-day plan
2. Include specific activities, timings, and locations
3. Provide estimated costs for each activity
4. Consider the user's budget constraints
5. Factor in meal times, rest periods, and travel time between locations
6. Include budget-friendly alternatives
7. Add local tips and money-saving advice

Be friendly, helpful, and conversational. When the user provides trip context (destination, budget, duration, dates), 
incorporate this information into your responses and recommendations."""

# Initialize model - will be configured on first request if API key is available
model = None

def get_model():
    """Get or initialize the Gemini model"""
    global model
    
    # Check if API key is set (try both variable names)
    api_key = (
        settings.GOOGLE_AI_API_KEY 
        or settings.GEMINI_API_KEY 
        or os.getenv("GOOGLE_AI_API_KEY") 
        or os.getenv("GEMINI_API_KEY")
    )
    
    if not api_key:
        raise ValueError(
            "Gemini API key is not set. Please set GOOGLE_AI_API_KEY or GEMINI_API_KEY "
            "in your .env file in the backend directory."
        )
    
    # Configure Gemini if not already configured
    try:
        genai.configure(api_key=api_key)
    except Exception as e:
        raise ValueError(f"Failed to configure Gemini API: {str(e)}")
    
    # Initialize model if not already initialized
    if model is None:
        # Try different model names in order of preference
        # Using the latest stable models available in the API
        model_names = [
            'gemini-2.0-flash',  # Fast and stable
            'gemini-2.5-flash',  # Latest flash model
            'gemini-2.0-pro-exp',  # Pro model
            'gemini-2.5-pro',  # Latest pro model
        ]
        
        last_error = None
        for model_name in model_names:
            try:
                model = genai.GenerativeModel(
                    model_name,
                    system_instruction=SYSTEM_INSTRUCTION
                )
                # Test if the model works by trying to access it
                break
            except Exception as e:
                last_error = e
                continue
        
        if model is None:
            raise ValueError(
                f"Failed to initialize any Gemini model. Last error: {str(last_error)}. "
                f"Tried models: {', '.join(model_names)}"
            )
    
    return model

@router.post("")
async def chat_with_ai(request: ChatRequest) -> Dict[str, str]:
    """Chat with the AI assistant using Gemini API"""
    
    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty"
        )
    
    try:
        # Get model (will initialize if needed)
        gemini_model = get_model()
        
        # Build conversation history from chat history
        chat_history = []
        if request.chat_history:
            for msg in request.chat_history:
                if msg.role == "user":
                    chat_history.append({
                        "role": "user",
                        "parts": [msg.content]
                    })
                elif msg.role == "assistant":
                    chat_history.append({
                        "role": "model",
                        "parts": [msg.content]
                    })
        
        # Start chat with history
        chat = gemini_model.start_chat(history=chat_history)
        
        # Send the user's message
        response = chat.send_message(request.message)

        return {
            "response": response.text,
            "role": "assistant"
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error communicating with Gemini API: {str(e)}"
        )